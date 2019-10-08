import { arrayToObject } from '../utils';

const currentVersion = 1;

const objectStructures = [
    { id: 'items', uri: 'rest/items?metadata=.*', allowSingleItem: true, key: 'name', onStart: true, label: 'Items' },
]

const objectStructuresObject = arrayToObject(objectStructures, 'id');

class ObjectModel {
    static currentVersion() {
        return currentVersion;
    }

    static getAsArray() {
        return objectStructures;
    }

    static getAsObject() {
        return objectStructuresObject;
    }
}

export { ObjectModel };