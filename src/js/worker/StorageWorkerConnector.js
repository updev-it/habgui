import { StorageMessageQueue } from "./StorageMessageQueue";
import { CustomLogger, LogLevel } from "../utils";
import { EventEmitter } from "events";

export default class StorageWorkerConnector extends EventEmitter {

    constructor() {
        super();

        // Initialize custom logger
        this.logger = CustomLogger.newConsole(window.console, LogLevel.DEBUG, "[StorageWorkerConnector]");

        // Keep track of connection state
        this.connected = false;
    }

    incomingMessage(messageEvent) {
        const messageContent = messageEvent.data;
        this.logger.trace(`<< `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);

        // Received response to datastore method
        if (messageContent.messageId !== undefined) {
            const queueItem = this.queue.get(messageContent.messageId);

            if (queueItem) {
                if (messageContent.isError) {
                    queueItem.accept(new Error(`Error occured in SharedWorker`, messageContent.detail));
                } else {
                    queueItem.accept(messageContent.detail);
                }
            } else {
                this.logger.warn(`Message ID '${messageContent.messageId}' with type '${messageContent.type}' not found in queue`);
            }
            return;
        }

        // Received event message
        switch (messageContent.type) {
            case "storeItemChanged":
            case "storeItemAdded":
            case "storeItemRemoved":
            case "connecting": {
                this.emit(messageContent.type, { detail: messageContent.detail });
                break;
            }
            case "connected": {
                this.connected = true;
                this.emit(messageContent.type, { detail: messageContent.detail });
                break;
            }
            case "disconnected": {
                this.connected = false;
                this.emit(messageContent.type, { detail: messageContent.detail });
                this.port.close();
                break;
            }
            case "error": {
                break;
            }
            default: {
                // Unknown event or regular message
                if (!messageContent.type) {
                    this.logger.warn(`Message received without 'type' property`, messageContent);
                } else {
                    this.logger.warn(`Unknown message type ('${messageContent.type}') received`, messageContent);
                }
                break;
            }
        }
    }

    error(messageError) {
        this.logger.error(messageError);
    }

    isConnected() {
        return this.connected;
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
            this.logger.trace(`>> `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);
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
        if (!this.connected) {
            // Initialize worker datastore connection
            let messageContent = { type: 'connect', host: host, port: port };

            // this.worker = new SharedWorker('StorageWorker.js');
            this.worker = new Worker('StorageWorker.js');
            this.worker.port instanceof MessagePort ? (this.port = this.worker.port) : (this.port = this.worker);

            // Initialize queue
            this.queue = new StorageMessageQueue(this);

            // Setup event handlers
            this.worker.onerror = this.error.bind(this);
            this.port.onmessage = this.incomingMessage.bind(this);

            this.emit("connecting", { detail: messageContent });
            this.postMessage(messageContent);
        }
    }

    /**
     *
     *
     * @memberof StorageWorkerConnector
     */
    disconnect() {
        if (this.connected) {
            let msg = { type: 'disconnect' };
            this.emit("disconnect");
            this.postMessage(msg);
        }
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
        let msg = { type: type, messageId: queueItem.messageID, storeName: storeName, objectID: objectID, options: options }
        this.postMessage(msg);
        return queueItem.promise;
    }

    getAll(storeName, options = {}) {
        return this.get(storeName, null, options);
    }
}