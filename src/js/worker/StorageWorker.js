import { Store } from '../storage';
import { CustomLogger, LogLevel } from '../utils';

class StorageWorker {
    constructor(worker) {
        // Initialize custom logger
        this.logger = CustomLogger.newConsole(console, LogLevel.DEBUG);
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

        this.store.addEventListener('storeItemChanged', event => {
            this.postMessage({ type: event.type, msg: event.detail });
        });
        this.store.addEventListener('storeItemAdded', event => {
            this.postMessage({ type: event.type, msg: event.detail });
        });
        this.store.addEventListener('storeItemRemoved', event => {
            this.postMessage({ type: event.type, msg: event.detail });
        });
        this.store.addEventListener('connecting', event => {
            this.postMessage({ type: event.type, msg: event.detail });
        });
        this.store.addEventListener('connected', event => {
            this.connected = true;
            this.postMessage({ type: event.type, msg: event.detail });
        });
        this.store.addEventListener('disconnected', event => {
            this.connected = false;
            this.postMessage({ type: event.type, msg: event.detail });
        });
    }

    async incomingMessage(messageEvent) {
        let result;
        const messageContent = messageEvent.data;
        this.logger.trace(`[StorageWorker] << `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);

        try {
            switch (messageContent.type) {
                case 'connect': {
                    let host = messageContent.host;
                    let port = messageContent.port;
                    if (!host || !port || isNaN(port)) {
                        this.logger.warn(`[StorageWorker] Invalid or unspecificied host:post (${host}:${port})`);
                    } else {
                        this.store.connect(host, port);
                    }
                    break;
                }
                case 'disconnect': {
                    this.store.dispose();
                    this.worker.close();
                }
                case 'get': {
                    if (messageContent.objectID) {
                        this.store.get(messageContent.storeName, messageContent.objectID, messageContent.options).then(result => {
                            this.postMessage({ type: messageContent.type, result: result, msgID: messageContent.msgID });
                        }).catch(error => {
                            console.warn(error);
                        });
                    } else {
                        this.store.getAll(messageContent.storeName, messageContent.options).then(result => {
                            this.postMessage({ type: messageContent.type, result: result, msgID: messageContent.msgID });
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
        } catch (error) {
            this.logger.error('[StorageWorker] Error', messageContent.type, error);
            this.postMessage({ type: error.type, result: error.toString(), isError: true, msgID: messageContent.msgID });
        }
    }

    postMessage(messageContent) {
        if (this.port && typeof this.port.postMessage === 'function') {
            this.logger.trace(`[StorageWorker] >> `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);
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