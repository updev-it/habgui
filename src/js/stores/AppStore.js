import EventEmitter from "events";
import PromiseRetry from "promise-retry";

import { StorageWorkerConnector } from "../worker/StorageWorkerConnector";
import { CustomLogger, LogLevel, arrayToObject } from "../utils";

class AppStore extends EventEmitter {
    constructor() {
        super();

        // Initialize custom logger
        this.logger = CustomLogger.newConsole(window.console, LogLevel.DEBUG);

        // Maintain connection state
        this.connectionState = false;

        this.data = {
            items: {}
        };

        this.connected = this.connected.bind(this);
        this.disconnected = this.disconnected.bind(this);
        this.itemChanged = this.itemChanged.bind(this);

        this.worker = new StorageWorkerConnector();
        this.worker.connect("rancher.home.besqua.red", 18080);
        this.worker.on("connected", this.connected);
    }

    isConnected() {
        return this.connectionState;
    }

    connected(event) {
        PromiseRetry((retry, number) => {
            if (number > 1) {
                this.logger.warn(`[AppStore] Retrying to retrieve all items from store after timeout (attempt ${number})`);
            }

            return this.worker.getAll("items").catch(retry);
        }, {
            minTimeout: 5000,
            retries: 3
        }).then((items) => {
            this.emit("connected");

            this.connectionState = true;
            this.data["items"] = arrayToObject(items, "name");

            this.worker.on("storeItemChanged", this.itemChanged);
            this.worker.on("disconnected", this.disconnected);
        }).catch(error => {
            this.worker.disconnect();
            this.logger.warn(error);
        });
    }

    disconnected() {
        this.emit("disconnected");
        this.removeAllListeners();
        this.connectionState = false;
    }

    isConnected() {
        return this.connectionState;
    }

    itemChanged(event) {
        let item = event.detail.item;
        this.data[item.name] = item;
        this.emit("storeItemChanged", item);
    }

    getItems() {
        return this.data.items;
    }

    getItem(itemName) {
        return this.data.items[itemName];
    }
}

const appStore = new AppStore;
// dispatcher.register(appStore.handleActions.bind(appStore));
// window.dispatcher = dispatcher;

export default appStore;