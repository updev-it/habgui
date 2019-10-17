// Non-local imports
import { openDB, deleteDB } from 'idb';
import { defaults, isEqual } from 'lodash';

// Local imports
import { customFetch, isIterable, arrayToObject, CustomLogger, LogLevel } from '../utils';
import { ObjectModel } from './ObjectModel';
import { EventEmitter } from 'events';

/*eslint no-unused-vars: ["error", { "args": "none" }]*/

/**
 *
 *
 * @export
 * @class Store
 * @extends {EventTarget}
 */
export class Store extends EventEmitter {

    /**
     *Creates an instance of Store.
     * @param {*} storeName
     * @memberof Store
     */
    constructor(storeName) {
        super();

        // Initialize custom logger
        this.logger = CustomLogger.newConsole(console, LogLevel.DEBUG, "[Store]");

        // Maintain a list of active/running REST API queries
        this.activeQueries = {};

        // Will contain entries like url:time - to keep track of when a query was last refreshed
        this.lastRefresh = {};
        this.expireDurationMS = 1000 * 60 * 60; // 1 hour cache for `getAll`

        this.connected = false;
        this.storeName = storeName;
        this.host = undefined;
        this.port = undefined;
        this.db = undefined;
        this.timeout = 5000;

        // During development remove existing database regardless of version
        if (false && process.env.mode === 'development') {
            this.logger.debug(`Removing existing datastore '${storeName}'`);
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
        // Cleanup old connection if applicable
        this.dispose();

        this.host = host;
        this.port = port;
        this.db = await openDB(this.storeName, ObjectModel.currentVersion(), {
            upgrade: (db, oldVersion, newVersion, transaction) => {
                this.logger.debug(`Upgrading IndexedDB datastore '${db.name}:${newVersion}'`);

                // Remove old objectStores
                for (let objectStore of db.objectStoreNames) {
                    this.logger.debug(`Removing old objectStore '${objectStore}'`);
                    db.deleteObjectStore(objectStore);
                }

                // Create objectStores
                for (let objectStructure of ObjectModel.getAsArray()) {
                    if (objectStructure.key) {
                        this.logger.debug(`Creating object store '${objectStructure.id}' with key '${objectStructure.key}'`);
                        db.createObjectStore(objectStructure.id, {
                            keyPath: objectStructure.key
                        });
                    } else {
                        this.logger.debug(`Creating object store '${objectStructure.id}'`);
                        db.createObjectStore(objectStructure.id, { autoIncrement: true });
                    }
                }

                this.logger.info(`Database was successfully initialized`);
            },
            blocked: () => {
                this.logger.warn('This connection is blocked by previous versions of the database.');
            },
            blocking: () => {
                this.logger.warn('This connection is blocking a future version of the database from opening.');
            }
        }).catch(error => {
            this.logger.error(`Unable to initialize database: ${error.message}`);
            this.emit("error", { message: `Unable to initialize indexedDB: ${error.message}`, isError: true });
        });


        if (this.db) {
            let restApiUrl = `http://${host}:${port}`
            let requests = ObjectModel.getAsArray()
                .filter(item => item.onStart)
                .map(item => {
                    const url = `${restApiUrl}/${item.uri}`;
                    this.lastRefresh[url] = Date.now();
                    customFetch(url, { timeout: this.timeout })
                        .then(response => response.json())
                        .then(json => {
                            this.initializeObjectStore(item.id, json);
                        });
                });

            // Wait for all requests (promises) to complete and register SSE
            return Promise.all([...requests]).then(() => {
                this.emit("connecting", { detail: this.host });
                this.eventSource = new EventSource(`${restApiUrl}/rest/events`);
                this.eventSource.onopen = this.sseOpen.bind(this);
                this.eventSource.onmessage = this.sseMessageReceived.bind(this);
                this.eventSource.onerror = this.sseError.bind(this);
            }).catch(error => {
                this.emit("error", { message: error.message, isError: true });
            });
        };

        return this.db;
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
            this.emit("disconnected", { detail: this.host });
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
            const warningMessage = `SSE: Unknown format: type: ${data.type}, topic: ${data.topic}, payload: ${data.payload}`;
            this.logger.warn(warningMessage);
            this.emit("warn", { message: warningMessage, isError: false });
            return;
        }

        switch (data.type) {
            // Additions
            case 'ItemAddedEvent': {
                const newItem = JSON.parse(data.payload);
                this.insert(storeName, newItem).catch(error => {
                    this.emit("error", { message: error.message, isError: true });
                });
                return;
            }
            // Updates
            case 'ItemUpdatedEvent': {
                const [updatedItem, previousItem] = JSON.parse(data.payload);
                this.insert(storeName, updatedItem).catch(error => {
                    this.emit("error", { message: error.message, isError: true });
                });
                return;
            }
            // State changed
            case 'ItemStateEvent': {
                const newState = JSON.parse(data.payload);
                this.update(storeName, itemName, fieldName, newState.value).catch(error => {
                    this.emit("error", { message: error.message, isError: true });
                });
                return;
            }
            // Removals
            case 'ItemRemovedEvent': {
                const item = JSON.parse(data.payload);
                this.remove(storeName, item).catch(error => {
                    this.emit("error", { message: error.message, isError: true });
                });
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
            default: {
                const warningMessage = `SSE: Unhandled SSE: ${data.type}`;
                this.logger.warn(warningMessage);
                this.emit("warn", { message: warningMessage, isError: false });
                break;
            }
        }
    }

    /**
     *
     *
     * @param {*} event
     * @memberof Store
     */
    sseOpen(event) {
        const message = `Connection to REST API @ 'http://${this.host}:${this.port}' established`;

        this.connected = true;
        this.logger.info(message);
        this.emit("connected", { message: message, detail: { host: this.host, message: event } });
    }

    /**
     *
     *
     * @param {*} event
     * @memberof Store
     */
    sseError(event) {
        const errorMessage = `SSE: ${event}`;
        this.logger.error(errorMessage);
        this.emit("error", { message: errorMessage, isError: true });
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

            await transaction.store.clear().catch(error => {
                throw new Error(`Failed to clear store '${storeName}'`);
            });

            for (let entry of jsonData) {
                transaction.store.add(entry).catch(error => {
                    throw new Error(`Failed to add to '${storeName}': ${entry}`);
                });
            }

            // API DOC : https://www.npmjs.com/package/idb#txdone
            transaction.done.then(() => {
                this.logger.debug(`Transaction successful: Added ${Object.keys(jsonData).length} entries to ${storeName} store`);
                this.emit("initialized", { message: "IndexedDB initialized", detail: this.host });
            }).catch(error => {
                throw new Error(`Transaction failed: 'initializeObjectStore' for '${storeName}'`);
            });
        }
        else {
            throw new Error(`Unknown or invalid data structure: '${jsonData}'`);
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
    get(storeName, objectID, options) {
        let dataStoreEntry;
        let newEntry;

        options = defaults(options, {
            forceRefresh: false
        });

        const metaData = ObjectModel.getAsObject()[storeName];
        const uriParts = metaData.uri.split('?');
        const uri = metaData.allowSingleItem === true ? `${uriParts[0]}/${objectID}?${uriParts[1]}` : `${uriParts[0]}?${uriParts[1]}`;
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
                        newEntry = Promise.resolve({ result: undefined });
                        this.logger.warn(`Failed to read from store '${storeName}' - ${objectID} (REST API query failed for ${uri}: ${error.message})`);
                    });
            } else {
                newEntry = Promise.resolve({ result: undefined });
                throw new Error(`No single item queries allowed`);
            }
        } catch (error) {
            this.logger.warn(`Failed to read from store '${storeName}' - ${objectID} (${error.message})`);
            dataStoreEntry = null;
        } finally {
            return dataStoreEntry || newEntry;
        }
    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} options
     * @returns
     * @memberof Store
     */
    getAll(storeName, options) {
        let dataStoreEntries;
        let newEntries;

        options = defaults(options, {
            forceRefresh: false
        });

        const metaData = ObjectModel.getAsObject()[storeName];
        const uriParts = metaData.uri.split('?');
        const uri = `${uriParts[0]}?${uriParts[1]}`;
        const url = `http://${this.host}:${this.port}/${uri}`;

        try {
            if (!this.db) {
                newEntry = Promise.resolve({ result: undefined });
                throw new Error(`No database connection`);
            }

            const transaction = this.db.transaction(storeName, 'readonly');

            // Get current values from datastore
            dataStoreEntries = transaction.store.getAll();

            if (this.isCacheStillValid(url) && !options.forceRefresh) {
                return dataStoreEntries;
            }

            // Query REST API for actual/current state
            newEntries = this.queryApi(url)
                .then(jsonData => this.insertAll(storeName, jsonData))
                .catch(error => {
                    this.logger.warn(`Failed to read from store '${storeName}' (REST API query failed for ${uri}: ${error.message})`);
                    newEntries = Promise.resolve({ result: undefined });
                });
        } catch (error) {
            this.logger.warn(`Failed to read from store '${storeName}' - ${objectID} (${error.message})`);
            dataStoreEntries = null;
        } finally {
            return dataStoreEntries || newEntries;
        }
    }

    /********************************
     *
     * Insert/Update/Remove methods
     * 
     ********************************/

    /**
     *
     *
     * @param {*} storeName
     * @param {*} item
     * @returns
     * @memberof Store
     */
    async insert(storeName, item) {
        // Ensure a valid object is passed as a parameter
        if (!item || typeof item !== 'object' || item.constructor !== Object) {
            throw new Error(`Item '${item}' not a valid Object`);
        }

        const transaction = this.db.transaction(storeName, 'readwrite');
        const metaData = ObjectModel.getAsObject()[storeName];
        const keyName = metaData.key;
        const oldEntry = await transaction.store.get(item[keyName]).catch(_ => {});

        transaction.store.put(item);

        // API DOC : https://www.npmjs.com/package/idb#txdone
        await transaction.done.then(() => {
            if (oldEntry) {
                this.logger.debug(`Transaction successful: Updated '${item.name}' in ${storeName} store`);
            } else {
                this.logger.debug(`Transaction successful: Added '${item.name}' to ${storeName} store`);
            }            
        }).catch(error => {
            throw new Error(`Transaction failed: 'insert' for '${storeName}'`);
        });

        // Notify listeners
        if (oldEntry) {
            this.emit("storeItemChanged", { detail: { item: item, storeName: storeName } });
        } else {
            this.emit("storeItemAdded", { detail: { item: item, storeName: storeName } });

            // Get all item metadata for new item
            this.get(storeName, item[keyName], { forceRefresh: true });
        }

        return item;
    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} items
     * @returns
     * @memberof Store
     */
    async insertAll(storeName, items) {
        if (!isIterable(items)) {
            throw new Error(`Invalid object passed to 'insertAll' method`);
        }

        const transaction = this.db.transaction(storeName, 'readwrite');
        const keyName = transaction.store.keyPath;
        const oldStore = arrayToObject(await transaction.store.getAll(), keyName);

        for (let newEntry of items) {
            const key = newEntry[keyName];
            const oldEntry = oldStore[key];

            // Notify listeners
            if (oldEntry) {
                if (!isEqual(oldEntry, newEntry)) {
                    this.emit("storeItemChanged", { detail: { value: newEntry, storeName: storeName } });
                } else {
                    // Don't notify for existing, un-changed items
                }
            } else {
                this.emit("storeItemAdded", { detail: { value: newEntry, storeName: storeName } });

                // Get all item metadata for new item
                this.get(storeName, item[keyName], { forceRefresh: true });
            }
            transaction.store.put(newEntry);
        }

        // API DOC : https://www.npmjs.com/package/idb#txdone
        transaction.done.then(() => {
            this.logger.debug(`Transaction successful: Added ${Object.keys(items).length} entries to ${storeName} store`);
        }).catch(error => {
            throw new Error(`Transaction failed: 'insertAll' for '${storeName}'`);
        });

        return items;
    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} item
     * @returns
     * @memberof Store
     */
    async remove(storeName, item) {
        // Ensure a valid object is passed as a parameter
        if (!item || typeof item !== 'object' || item.constructor !== Object) {
            throw new Error(`Item '${item}' not a valid Object`);
        }


        const transaction = this.db.transaction(storeName, 'readwrite');
        const metaData = ObjectModel.getAsObject()[storeName];
        const keyName = metaData.key;
        const key = item[keyName];

        // try {
        transaction.store.delete(key);
        // } catch (error) {
        //     return Promise.reject(`Transaction failed: 'remove' for '${item.name}'`);
        //     // throw new Error(`Transaction failed: 'remove' for '${item.name}'`);
        // }

        // API DOC : https://www.npmjs.com/package/idb#txdone
        await transaction.done.then(() => {
            this.logger.debug(`Transaction successful: Removed '${item.name}' from ${storeName} store`);
        }).catch(error => {
            throw new Error(`Transaction failed: 'remove' for '${item.name}'`);
        });

        // Notify listeners
        this.emit("storeItemRemoved", { detail: { item: item, storeName: storeName } });

        return null;

    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} itemName
     * @param {*} fieldName
     * @param {*} value
     * @memberof Store
     */
    async update(storeName, itemName, fieldName, value) {
        const transaction = this.db.transaction(storeName, 'readwrite');
        const item = await transaction.store.get(itemName);

        if (!item) {
            throw new Error(`${itemName} not found`);
        } else {
            item[fieldName] = value;
            transaction.store.put(item);

            // API DOC : https://www.npmjs.com/package/idb#txdone
            await transaction.done.catch(() => {
                throw new Error(`Transaction failed`);
            });

            // Notify listeners
            this.emit("storeItemChanged", { detail: { item: item, storeName: storeName } });
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

    /**
     * Returns true/false depending on the age of the query
     *
     * @param {*} uri
     * @returns
     * @memberof Store
     */
    isCacheStillValid(url) {
        return this.lastRefresh[url] !== undefined && this.lastRefresh[url] + this.expireDurationMS > Date.now();
    }
}