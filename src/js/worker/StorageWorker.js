import { Store } from '../storage';
import { CustomLogger, LogLevel } from '../utils';
import Message from '../messages/Message';
import ErrorMessage from '../messages/ErrorMessage';

class StorageWorker {
    constructor(worker) {
        // Initialize custom logger
        this.logger = CustomLogger.newConsole(console, LogLevel.DEBUG, "[StorageWorker]");
        this.logger.clear();

        // Keep track of connection state
        this.connected = false;

        this.port = worker;
        this.worker = worker;
        this.store = new Store('OpenHAB');

        // Shared workers need to wait for the 'connect' event
        // See: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker#Example
        this.worker.onconnect = event => {
            [this.port] = event.ports;
            this.port.onmessage = this.incomingMessage.bind(this);
        };

        this.store.on('storeItemChanged', event => {
            this.postMessage({ type: "storeItemChanged", detail: event.detail });
        });
        this.store.on('storeItemAdded', event => {
            this.postMessage({ type: "storeItemAdded", detail: event.detail });
        });
        this.store.on('storeItemRemoved', event => {
            this.postMessage({ type: "storeItemRemoved", detail: event.detail });
        });
        this.store.on('connecting', event => {
            this.postMessage({ type: "connecting", message: event.message, detail: event.detail });
        });
        this.store.on('connected', event => {
            this.connected = true;
            this.postMessage({ type: "connected", message: event.message, detail: event.detail });
        });
        this.store.on('disconnected', event => {
            this.connected = false;
            this.postMessage({ type: "disconnected", message: event.message, detail: event.detail });
        });
        this.store.on("warn", event => {
            this.postMessage({ type: "warn", message: event.message, detail: event.detail, isError: event.isError });
        });
        this.store.on("error", event => {
            this.postMessage({ type: "error", message: event.message, detail: event.detail, isError: event.isError });
        });
    }

    async incomingMessage(messageEvent) {
        let result;
        const messageContent = messageEvent.data;
        this.logger.trace(`<< `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);

        switch (messageContent.type) {
            case 'connect': {
                let host = messageContent.host;
                let port = messageContent.port;
                if (!host || !port || isNaN(port)) {
                    this.logger.warn(`Invalid or unspecificied host:post (${host}:${port})`);
                } else {
                    this.store.connect(host, port).catch(error => {
                        this.logger.error('Error', messageContent.type, error);
                        this.postMessage({type: "error", message: error.message, isError: true });
                    });
                }
                break;
            }
            case 'disconnect': {
                this.worker.close();
                this.store.dispose();
            }
            case 'get': {
                if (messageContent.objectID) {
                    this.store.get(messageContent.storeName, messageContent.objectID, messageContent.options).then(result => {
                        this.postMessage({type: messageContent.type, detail: result, messageId: messageContent.messageId });
                    }).catch(error => {
                        console.warn(error);
                    });
                } else {
                    this.store.getAll(messageContent.storeName, messageContent.options).then(result => {
                        this.postMessage({type: messageContent.type, detail: result, messageId: messageContent.messageId });
                    }).catch(error => {
                        console.warn(error);
                    });
                }
                break;
            }
            default: {
                break;
            }
        }
    }

    postMessage(messageContent) {
        if (this.port && typeof this.port.postMessage === 'function') {
            this.logger.trace(`>> `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);
            try {
                this.port.postMessage(messageContent);
            } catch (error) {
                if (error instanceof DOMException) {
                    // Hack to serialize objects that cannot be cloned by structured clone algortithm (see: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
                    this.port.postMessage(JSON.parse(JSON.stringify(messageContent)));
                } else {
                    throw error;
                }
            }
        }
    }
}

const worker = new StorageWorker(self);