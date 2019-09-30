// Non-local imports
import { openDB, deleteDB } from 'idb';
import { defaults } from 'lodash';

// Local imports
import { customFetch, isIterable } from '../utils';
import { ObjectModel } from './ObjectModel';

/*eslint no-unused-vars: ["error", { "args": "none" }]*/

/**
 *
 *
 * @export
 * @class Store
 * @extends {EventTarget}
 */
export class Store extends EventTarget {

    /**
     *Creates an instance of Store.
     * @param {*} [storeName=window.location.hostname]
     * @memberof Store
     */
    constructor(storeName = window.location.hostname) {
        super();

        // Maintain a list of active/running REST API queries
        this.activeQueries = {};
        // Will contain entries like url:time - to keep track of when a query was last refreshed
        this.lastRefresh = {};

        this.connected = false;
        this.storeName = storeName;
        this.host = undefined;
        this.port = undefined;
        this.db = undefined;
        this.timeout = 5000;

        // During development remove existing database regardless of version
        if (process.env.mode === 'development') {
            console.debug(`[Store] Removing existing datastore '${storeName}'`);
            deleteDB(storeName);
        }
    }

    /**
     *
     *
     * @param {string} [host='localhost']
     * @param {number} [port=8080]
     * @returns
     * @memberof Store
     */
    async connect(host = 'localhost', port = 8080) {
        this.host = host;
        this.port = port;
        this.db = await openDB(this.storeName, ObjectModel.currentVersion(), {
            async upgrade(db, oldVersion, newVersion, transaction) {
                console.debug(`[Store] Upgrading IndexedDB datastore '${db.name}:${newVersion}'`);

                // Remove old objectStores
                for (let objectStore of db.objectStoreNames) {
                    console.debug(`[Store] Removing old objectStore '${objectStore}'`);
                    db.deleteObjectStore(objectStore);
                }

                // Create objectStores
                for (let objectStructure of ObjectModel.getAsArray()) {
                    if (objectStructure.key) {
                        console.debug(`[Store] Creating object store '${objectStructure.id}' with key '${objectStructure.id}:${objectStructure.key}'`);
                        db.createObjectStore(objectStructure.id, {
                            keyPath: objectStructure.key
                        });
                    } else {
                        console.debug(`[Store] Creating object store '${objectStructure.id}'`);
                        db.createObjectStore(objectStructure.id, { autoIncrement: true });
                    }
                }
            },
            blocked() {
                console.warn('[Store] This connection is blocked by previous versions of the database.');
            },
            blocking() {
                console.warn('[Store] This connection is blocking a future version of the database from opening.');
            }
        }).catch(error => {
            console.error(`[Store] Error: ${error}`);
        });

        // 
        const urlRESTApi = `http://${host}:${port}`
        const requests = ObjectModel.getAsArray().filter(item => item.onStart).map(item => customFetch(`${urlRESTApi}/${item.uri}`, { timeout: this.timeout })
            .then(response => response.json()).then(json => {
                this.initializeObjectStore(item.id, json);
            }).catch(error => {
                console.warn(error);
            }));

        // Wait for all requests (promises) to complete and register SSE
        return Promise.all(requests).then(() => {
            this.dispatchEvent(new CustomEvent('connecting', { detail: this.host }));
            this.eventSource = new EventSource(`${urlRESTApi}/rest/events`);
            this.eventSource.onopen = this.sseOpen.bind(this);
            this.eventSource.onmessage = this.sseMessageReceived.bind(this);
            this.eventSource.onerror = this.sseError.bind(this);            
        });
    }

    /**
     *
     *
     * @memberof Store
     */
    dispose() {
        if (this.db) {
            this.db.close();
            delete this.db;
        }
        if (this.eventSource) {
            ['onerror', 'onmessage', 'onopen'].forEach(eventHandler => {
                this.eventSource[eventHandler] = null;
            });
            this.eventSource.close();
            this.dispatchEvent(new CustomEvent('disconnected', { detail: this.host }));
        }
        this.activeQueries = {};
        this.lastRefresh = {};
    }

    /**
     *
     * Server side event handlers
     * 
     */

    /**
     *
     *
     * @param {*} message
     * @returns
     * @memberof Store
     */
    sseMessageReceived(message) {
        const data = JSON.parse(message.data);
        const [_, storeName, itemName, fieldName] = data.topic.split('/');

        // Validate received event message
        if (!data || !data.payload || !data.type || !data.topic) {
            console.warn(`[SSE] Unknown format: type: ${data.type}, topic: ${data.topic}, payload: ${data.payload}`);
            return;
        }

        switch (data.type) {
            // Additions
            case 'ItemAddedEvent': {
                const newItem = JSON.parse(data.payload);
                this.insert(storeName, newItem);
                return;
            }
            // Updates
            case 'ItemUpdatedEvent': {
                const [updatedItem, previousItem] = JSON.parse(data.payload);
                this.insert(storeName, updatedItem);
                return;
            }
            // State changed
            case 'ItemStateEvent': {
                const newState = JSON.parse(data.payload);
                this.update(storeName, itemName, fieldName, newState.value);
                return;
            }
            // Removals
            case 'ItemRemovedEvent': {
                const item = JSON.parse(data.payload);
                this.remove(storeName, item);
                return;
            }
            // Ignored events
            case 'InboxAddedEvent':
            case 'InboxUpdatedEvent':
            case 'InboxRemovedEvent':
            case 'ThingUpdatedEvent':
            case 'GroupItemStateChangedEvent':
            case 'ItemChannelLinkAddedEvent':
            case 'ItemChannelLinkRemovedEvent':
            case 'ItemStateChangedEvent':
            case 'ItemStatePredictedEvent':
            case 'ItemCommandEvent':
            case 'ChannelTriggeredEvent':
            case 'ThingStatusInfoEvent':
            case 'ThingStatusInfoChangedEvent': {
                return;
            }
        }
        console.debug(`[SSE] Unhandled SSE`, data.type);
    }

    /**
     *
     *
     * @param {*} event
     * @memberof Store
     */
    sseOpen(event) {
        this.connected = true;
        this.dispatchEvent(new CustomEvent('connected', { detail: { host: this.host, message: event } }));
        console.info(`[SSE] Connection to REST API @ 'http://${this.host}:${this.port}' established`);
    }

    /**
     *
     *
     * @param {*} event
     * @memberof Store
     */
    sseError(event) {
        console.warn(`[SSE]`, event);
    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} jsonData
     * @memberof Store
     */
    async initializeObjectStore(storeName, jsonData) {
        if (isIterable(jsonData)) {
            let transaction = this.db.transaction(storeName, 'readwrite');
            let store = transaction.store;

            await store.clear().catch(error => {
                console.warn(`[Store] Failed to clear store '${storeName}'`);
                throw error;
            });

            for (let entry of jsonData) {
                store.add(entry).catch(error => {
                    console.warn(`[Store] Failed to add to '${storeName}': ${entry}`);
                    throw error;
                });
            }

            // API DOC : https://www.npmjs.com/package/idb#txdone
            await transaction.done.catch(error => {
                console.warn(`[Store] Failed to initDatastore into '${storeName}'`);
                throw error;
            });

            console.debug(`[Store] Added ${Object.keys(jsonData).length} entries to ${storeName} store`);
        }
        else {
            console.warn(`[Store] Unknown or invalid data structure: '${jsonData}'`);
        }
    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} objectID
     * @param {*} options
     * @returns
     * @memberof Store
     */
    async get(storeName, objectID, options) {
        let dataStoreEntry;
        let newEntry;

        options = defaults(options, {
            forceRefresh: false
        });

        const metaData = ObjectModel.getAsObject()[storeName];
        const uriParts = metaData.uri.split('?');
        const uri = metaData.allowSingleItem === true ? `${uriParts[0]}/${objectID}?${uriParts[1]}` : `${uriParts[0]}?${uriParts[1]};`;
        const url = `http://${this.host}:${this.port}/${uri}`;

        try {
            if (!this.db) {
                newEntry = Promise.resolve({ result: undefined });
                throw new Error(`No database connection`);
            }
            
            if (metaData.allowSingleItem) {
                const transaction = this.db.transaction(storeName, 'readonly');

                // Get current value from datastore
                if (!options.forceRefresh) {
                    dataStoreEntry = transaction.store.get(objectID);
                }

                // Query REST API for actual/current state
                newEntry = this.queryApi(url)
                    .then(jsonData => this.insert(storeName, jsonData))
                    .catch(error => {
                        newEntry = Promise.reject({ result: undefined });
                        throw new Error(`REST API query failed for ${uri}: `);
                    });
            } else {
                newEntry = Promise.resolve({ result: undefined });
                throw new Error(`No single item queries allowed`);
            }
        } catch (error) {
            console.warn(`[Store] Failed to read from store '${storeName}' - ${objectID} (${error.message})`);
            dataStoreEntry = null;
        } finally {
            return dataStoreEntry || newEntry;
        }
    }

    /********************************
     *
     * Insert/Update/Remove methods
     * 
     ********************************/

    async insert(storeName, item) {
        try {
            // Ensure a valid object is passed as a parameter
            if (!item || typeof item !== 'object' || item.constructor !== Object) {
                throw new Error(`Item '${item}' not a valid Object`);
            }

            const transaction = this.db.transaction(storeName, 'readwrite');
            const metaData = ObjectModel.getAsObject()[storeName];
            const keyName = metaData.key;
            const oldEntry = await transaction.store.get(item[keyName]);

            transaction.store.put(item);

            // API DOC : https://www.npmjs.com/package/idb#txdone
            await transaction.done.catch(() => {
                throw new Error(`Tranaction failed`);
            });

            // Notify listeners
            if (oldEntry) {
                this.dispatchEvent(new CustomEvent('storeItemChanged', { detail: { value: item, storeName: storeName } }));
            } else {
                this.dispatchEvent(new CustomEvent('storeItemAdded', { detail: { value: item, storeName: storeName } }));

                // Get all item metadata for new item
                this.get(storeName, item[keyName], { forceRefresh: true });
            }

            return item;
        } catch (error) {
            console.warn(`[Store] Failed to insert into store '${storeName}' - ${item.name} (${error.message})`);
        }
    }

    async remove(storeName, item) {
        try {
            // Ensure a valid object is passed as a parameter
            if (!item || typeof item !== 'object' || item.constructor !== Object) {
                throw new Error(`Item '${item}' not a valid Object`);
            }

            const transaction = this.db.transaction(storeName, 'readwrite');
            const metaData = objectStructuresObject[storeName];
            const keyName = metaData.key;
            const key = item[keyName];

            transaction.store.delete(key);

            // API DOC : https://www.npmjs.com/package/idb#txdone
            await transaction.done.catch(() => {
                throw new Error(`Tranaction failed`);
            });

            // Notify listeners
            this.dispatchEvent(new CustomEvent('storeItemRemoved', { detail: { value: item, storeName: storeName } }));

            return null;
        } catch (error) {
            console.warn(`[Store] Failed to remove from store '${storeName}' - ${item.name} (${error.message})`);
        }
    }

    async update(storeName, itemName, fieldName, value) {
        try {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const item = await transaction.store.get(itemName);

            if (!item) {
                throw new Error(`${itemName} not found`);
            } else {
                item[fieldName] = value;
                transaction.store.put(item);

                // API DOC : https://www.npmjs.com/package/idb#txdone
                await transaction.done.catch(() => {
                    throw new Error(`Tranaction failed`);
                });

                // Notify listeners
                this.dispatchEvent(new CustomEvent('storeItemChanged', { detail: { value: item, storeName: storeName } }));
            }
        } catch (error) {
            console.warn(`[Store] Failed to update store '${storeName}' - ${itemName} (${error.message})`);
        }
    }

    /********************************
    *
    * Helper methods
    * 
    ********************************/

    /**
     * Executes a REST API query. Times out after a while when no valid response has been received. If query is already running,
     * it returns the promise of the original query instead of submitting a new query. To aid in the caching of the data,
     * a timestamp is recorded for when the query was last run.
     *
     * @param {*} uri
     * @returns Promise
     * @memberof StaleWhileRevalidateStore
     */
    queryApi(url) {
        const isQueryRunning = this.activeQueries.hasOwnProperty(url);
        if (isQueryRunning) {
            return this.activeQueries[url];
        }

        this.activeQueries[url] = customFetch(url, { timeout: this.timeout })
            .then(response => response.json()).catch(error => {
                throw error;
            })
            .finally(() => {
                delete this.activeQueries[url];
                this.lastRefresh[url] = Date.now();
            });

        return this.activeQueries[url];
    }
}