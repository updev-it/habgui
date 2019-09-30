export class StorageWorkerConnector extends EventTarget {

    constructor() {
        super();

        this.worker = new SharedWorker('StorageWorker.js');
        this.port = this.worker.port;

        // Setup event handlers
        this.worker.onerror = this.error.bind(this);
        this.port.onmessage = this.incomingMessage.bind(this);
    }

    incomingMessage(messageEvent) {
        const messageContent = messageEvent.data;
        console.debug(`StorageWorkerConnector << `, messageContent.type ? [ "Message:", messageContent.type, messageContent ] : messageContent);
    }

    error(messageError) {
        console.error(messageError);
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
            console.debug(`StorageWorkerConnector >> `, messageContent.type ? [ "Message:", messageContent.type, messageContent ] : messageContent);
            this.port.postMessage(messageContent);
        }
    }

    connect(host = 'localhost', port = 8080) {
        // Initialize worker datastore connection
        let msg = { type: 'connect', host: host, port: port };

        this.dispatchEvent(new CustomEvent('connecting', { detail: msg }));
        this.postMessage(msg);
    }
}