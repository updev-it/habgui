/**
 * TODO: Summary. (use period)
 *
 * TODO: Description. (use period)
 *
 * @link   https://github.com/updev-it/openhabvue/blob/dev/src/js/storage/index.js
 * @file   This files defines the MyClass class.
 * @author B. van Wetten <bas.van.wetten@gmail.com>
 * @since  27-03-2019
 */

const QUEUE_ITEM_TIMEOUT = 5000;

/**
 *
 *
 * @export
 * @class StorageMessageQueue
 */
export class StorageMessageQueue {

  /**
   *Creates an instance of StorageMessageQueue.
   * @param {*} storageConnector
   * @memberof StorageMessageQueue
   */
  constructor(storageWorkerConnector) {
    this.queue = {};
    this.messageID = 0;

    this.storageWorkerConnector = storageWorkerConnector;
  }

  /**
   *
   *
   * @param {*} messageID
   * @memberof StorageMessageQueue
   */
  remove(messageID) {
    delete this.queue[messageID];
  }

  /**
   *
   *
   * @param {*} messageID
   * @returns
   * @memberof StorageMessageQueue
   */
  get(messageID) {
    return this.queue[messageID];
  }

  /**
   *
   *
   * @param {*} type
   * @returns
   * @memberof StorageMessageQueue
   */
  add(type) {
    let newQueueItem = new QueueItem(this, this.storageWorkerConnector, type);
    this.queue[this.messageID++] = newQueueItem;
    this.messageID %= 1000;
    return newQueueItem;
  }
}

/**
 *
 *
 * @export
 * @class QueueItem
 */
export class QueueItem {

  /**
   *Creates an instance of QueueItem.
   * @param {*} storageMessageQueue
   * @param {*} storageWorkerConnector
   * @param {*} messageType
   * @memberof QueueItem
   */
  constructor(storageMessageQueue, storageWorkerConnector, messageType) {
    this.queue = storageMessageQueue;
    this.messageID = storageMessageQueue.messageID;
    this.messageType = messageType;
    this.storageWorkerConnector = storageWorkerConnector;

    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    // Automatically de-queue item after timeout
    this.expireTimer = setTimeout(() => this.expire(), QUEUE_ITEM_TIMEOUT);
  }

  /**
   *
   *
   * @memberof QueueItem
   */
  delete() {
    this.queue.remove(this.messageID);
  }

  /**
   *
   *
   * @param {*} value
   * @memberof MessageQueue
   */
  accept(value) {
    this.delete();
    clearTimeout(this.expireTimer);

    if (value instanceof Error) {
      this.reject(value);
    } else {
      this.resolve(value);
    }
  }

  /**
   *
   *
   * @memberof MessageQueue
   */
  expire() {
    this.delete();
    this.reject(`StorageWorkerConnector queue item with ID '${this.messageID}' and type '${this.messageType}' timed out`);
  }
}
