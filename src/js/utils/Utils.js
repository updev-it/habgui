import { defaults } from 'lodash';
// import { reject } from 'q';

const FETCH_TIMEOUT = 5000;

export async function customFetch(url, options) {
    const controller = new AbortController();
    const signal = controller.signal;
    const request = new Request(url, { signal });

    options = defaults(options, {
        method: 'GET',
        mode: 'cors',
        headers: {},
        signal: controller.signal,
        validateHttpsCertificates: false,
        muteHttpExceptions: true,
        timeout: FETCH_TIMEOUT,
    });

    setTimeout(() => controller.abort(), options.timeout);

    return fetch(request, options).catch(error => {
        if (error.name === 'AbortError') {
            return reject(`Timeout (${options.timeout} ms) fetching '${url}'`);
        } else {
            return reject(`Error occured: '${error}'`);
        }
    });
}

export async function isIterable(object) {
    // Checks for null and undefined
    if (object == null) {
        return false;
    }
    return typeof object[Symbol.iterator] === 'function';
}

/**
 * Helper function to convert an array of objects to an object with objects
 *
 * e.g. const peopleArray = [
  { id: 123, name: "dave", age: 23 },
  { id: 456, name: "chris", age: 23 },
  { id: 789, name: "bob", age: 23 },
  { id: 101, name: "tom", age: 23 },
  { id: 102, name: "tim", age: 23 }

  to ==>

  const peopleObject = {
  "123": { id: 123, name: "dave", age: 23 },
  "456": { id: 456, name: "chris", age: 23 },
  "789": { id: 789, name: "bob", age: 23 },
  "101": { id: 101, name: "tom", age: 23 },
  "102": { id: 102, name: "tim", age: 23 }
}
]
 *
 * @export
 * @param {*} array
 * @param {*} keyField
 */
export function arrayToObject(array, keyField) {
    return array.reduce((obj, item) => {
        obj[item[keyField]] = item;
        return obj;
    }, {});
}