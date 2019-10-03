import { StorageMessageQueue } from "./StorageMessageQueue";
import { CustomLogger, LogLevel } from "../utils";

export class StorageWorkerConnector extends EventTarget {

    constructor() {
        super();

        // Initialize custom logger
        this.logger = CustomLogger.newConsole(window.console, LogLevel.DEBUG);

        // Keep track of connection state
        this.connected = false;

        this.worker = new SharedWorker('StorageWorker.js');
        this.port = this.worker.port;

        // Initialize queue
        this.queue = new StorageMessageQueue(this);

        // Setup event handlers
        this.worker.onerror = this.error.bind(this);
        this.port.onmessage = this.incomingMessage.bind(this);
    }

    incomingMessage(messageEvent) {
        const messageContent = messageEvent.data;
        this.logger.trace(`[StorageWorkerConnector] << `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);

        // Received response to datastore method
        if (messageContent.msgID !== undefined) {
            const queueItem = this.queue.get(messageContent.msgID);

            if (queueItem) {
                if (messageContent.isError) {
                    queueItem.accept(new Error(`[StorageWorkerConnector] Error occured in SharedWorker`, messageContent.result));
                } else {
                    queueItem.accept(messageContent.result);
                }
            } else {
                this.logger.warn(`[StorageWorkerConnector] Message ID not found in queue`, messageContent);
            }
            return;
        }

        switch (messageContent.type) {
            case "storeItemChanged":
            case "storeItemAdded":
            case "storeItemRemoved":
            case "connecting": {
                this.dispatchEvent(new CustomEvent(messageContent.type, { detail: messageContent }));
                break;
            }
            case "connected": {
                this.connected = true;
                this.dispatchEvent(new CustomEvent("connected", { detail: messageContent }));
                break;
            }
            case "disconnected": {
                this.connected = false;
                this.dispatchEvent(new CustomEvent('disconnected', { detail: messageContent }));
                break;
            }
            default: {
                // Unknown event or regular message
                if (!messageContent.type) {
                    this.logger.warn(`[StorageWorkerConnector] Message received without 'type' property`, messageContent);
                } else {
                    this.logger.warn(`[StorageWorkerConnector] Unknown message type ('${messageContent.type}') received`, messageContent);
                }
                break;
            }
        }
    }

    error(messageError) {
        this.logger.error(messageError);
    }

    /**
     *
     *
     * @param {*} message
     * @memberof StorageWorkerConnector
     */
    postMessage(messageContent) {
        // If postMessage gets called before the SharedWorker has a connection it cannot be called
        if (this.port && typeof this.port.postMessage === 'function') {
            this.logger.trace(`[StorageWorkerConnector] >> `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);
            this.port.postMessage(messageContent);
        }
    }

    /**
     *
     *
     * @param {string} [host='localhost']
     * @param {number} [port=8080]
     * @memberof StorageWorkerConnector
     */
    connect(host = 'localhost', port = 8080) {
        // Initialize worker datastore connection
        let msg = { type: 'connect', host: host, port: port };

        this.dispatchEvent(new CustomEvent('connecting', { detail: msg }));
        this.postMessage(msg);
    }

    /**
     *
     *
     * @memberof StorageWorkerConnector
     */
    dispose() {
        let msg = { type: 'disconnect' };
        this.dispatchEvent(new CustomEvent('disconnect', { detail: msg }));
        this.postMessage(msg);
    }

    /**
     *
     *
     * @param {*} storeName
     * @param {*} [objectID=null]
     * @param {*} [options={}]
     * @returns
     * @memberof StorageWorkerConnector
     */
    get(storeName, objectID = null, options = {}) {
        const type = 'get';
        const queueItem = this.queue.add(type);
        let msg = { type: type, msgID: queueItem.messageID, storeName: storeName, objectID: objectID, options: options }
        this.postMessage(msg);
        return queueItem.promise;
    }

    getAll(storeName, options = {}) {
        return this.get(storeName, null, options);
    }
}