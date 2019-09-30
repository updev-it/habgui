import { Store } from '../storage';
import { CustomLogger } from '../utils';
import { LogLevel } from '../utils/CustomLogger';

class StorageWorker {
    constructor(worker) {
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
        console.trace(`[StorageWorker] << `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);

        try {
            switch (messageContent.type) {
                case 'connect': {
                    let host = messageContent.host;
                    let port = messageContent.port;
                    if (!host || !port || isNaN(port)) {
                        console.warn(`[StorageWorker] Invalid or unspecificied host:post (${host}:${port})`);
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
                            console.error(error);
                        }
                        );
                    } else {

                    }
                    break;
                }
                default: {
                    break;
                }
            }
        } catch (error) {
            console.warn('[StorageWorker] Error', messageContent.type, error);
            this.postMessage({ type: error.type, result: error.toString(), isError: true, msgID: messageContent.msgID });
        }
    }

    postMessage(messageContent) {
        if (this.port && typeof this.port.postMessage === 'function') {
            console.trace(`[StorageWorker] >> `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);
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

CustomLogger.enable(LogLevel.DEBUG);
console.clear();

const worker = new StorageWorker(self);