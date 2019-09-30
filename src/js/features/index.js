import { NotSupportedException } from "../exceptions";

export function featureDetectionIndexedDB() {
    if (!window.indexedDB) {
        throw new NotSupportedException(`'window.indexedDB' method is not supported in this browser`);
    }
}

export function featureDetectionFetch() {
    if (!window.fetch) {
        throw new NotSupportedException(`'window.fetch' method is not supported in this browser`);
    }
}

export function featureDetectionSharedWorker() {
    if (!window.Worker || !window.SharedWorker) {
        throw new NotSupportedException(`'window.Worker' or 'window.SharedWorker' method(s) are not supported in this browser`);
    }
}