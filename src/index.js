import { NotSupportedException } from './js/exceptions';
import { CustomLogger } from './js/utils';
import { featureDetectionFetch, featureDetectionIndexedDB, featureDetectionSharedWorker } from './js/features';
import { StorageWorkerConnector } from './js/worker/StorageWorkerConnector';
import { Store } from './js/storage';
import { LogLevel } from './js/utils/CustomLogger';

// import React from 'react';
// import ReactDOM from 'react-dom';

try {
    featureDetectionFetch();
    featureDetectionIndexedDB();
    featureDetectionSharedWorker();

    CustomLogger.enable(LogLevel.WARN);

    const store = new Store("OpenHAB");
    (async () => {
        await store.connect("rancher.home.besqua.red", 18080);

        store.addEventListener('storeItemChanged', (event) => {
            // console.log(event);
        });
        store.addEventListener('storeItemRemoved', (event) => {
            console.log(event);
        });
        store.addEventListener('storeItemAdded', (event) => {
            console.log(event);
        });
    })();

    // const worker = new StorageWorkerConnector();

    // worker.connect('rancher.home.besqua.red', '18080');
} catch (error) {
    if (error instanceof NotSupportedException) {
        console.warn(error.message);
    } else {
        throw error;
    }
}