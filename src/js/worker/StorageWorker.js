import { Store } from '../storage';
import { CustomLogger } from '../utils';

class StorageWorker {
    constructor(worker) {
        this.port = worker;
        this.worker = worker;
        this.connected = false;
        this.store = new Store('OpenHAB');

        // Shared workers need to wait for the 'connect' event
        // See: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker#Example
        this.worker.onconnect = event => {
            [this.port] = event.ports;
            this.port.onmessage = this.incomingMessage.bind(this);
        };

        // this.store.addEventListener('storeItemChanged', event => {
        //     this.postMessage({ type: event.type, msg: event.detail });
        // });
    }

    incomingMessage(messageEvent) {
        const messageContent = messageEvent.data;
        console.debug(`StorageWorker << `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);

        try {
            switch (messageContent.type) {
                case 'connect': {
                    let host = messageContent.host;
                    let port = messageContent.port;
                    if (!host || !port || isNaN(port)) {
                        console.warn(`Invalid or unspecificied host:post (${host}:${port})`);
                    } else {
                        this.store.connect(host, port);
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        } catch (error) {
            console.warn('Database error', data.type, error);
            this.postMessage({ type: error.type, result: error.toString(), isError: true, msgID: data.msgID });
        }
    }

    postMessage(messageContent) {
        if (this.port && typeof this.port.postMessage === 'function') {
            console.debug(`StorageWorker >> `, messageContent.type ? ["Message:", messageContent.type, messageContent] : messageContent);
            this.port.postMessage(messageContent);
        }
    }
}

CustomLogger.enable();
console.clear();

const worker = new StorageWorker(self);