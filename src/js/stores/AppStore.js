import { EventEmitter } from "events";
import { StorageWorkerConnector } from "../worker/StorageWorkerConnector";
import { CustomLogger, LogLevel, arrayToObject } from "../utils";

class AppStore extends EventEmitter {
    constructor() {
        super();

        // Initialize custom logger
        this.logger = CustomLogger.newConsole(window.console, LogLevel.DEBUG);

        this.data = {
            items: {}
        };

        this.worker = new StorageWorkerConnector();
        this.worker.connect("rancher.home.besqua.red", 18080);

        this.worker.addEventListener("connected", () => {
            this.worker.getAll("items").then((items) => {
                this.data["items"] = arrayToObject(items, "name");
                this.emit("connected");
            }).catch(error => {
                console.error(error.message);
            });
        });

        this.worker.addEventListener("storeItemChanged", (event) => {
            let item = event.detail.msg.value;
            this.data[item.name] = item;
            this.emit("storeItemChanged", item);
        })
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