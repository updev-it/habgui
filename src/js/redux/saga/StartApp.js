import { eventChannel, END } from 'redux-saga'
import { take, call, put, fork, cancel, getContext } from 'redux-saga/effects'
import { itemFetchAll, itemAdded, itemRemoved, itemChanged, appError } from '../actions';
import { START_APP, STOP_APP } from '../actions/actionTypes';

function connect(worker) {
    return new Promise(resolve => {
        worker.connect("rancher.home.besqua.red", 18080);
        worker.on("initialized", () => {
            resolve(worker);
        });
    });
}

function disconnect(worker) {
    return new Promise(resolve => {
        worker.disconnect();
        worker.on("disconnected", () => {
            resolve(worker);
        });
    });
}

function* subscribe(worker) {

    const channel = new eventChannel(emit => {
        worker.on("storeItemAdded", event => {
            emit(itemAdded(event));
        });
        worker.on("storeItemRemoved", event => {
            emit(itemRemoved(event));
        });
        worker.on("storeItemChanged", event => {
            emit(itemChanged(event));
        });
        worker.on("disconnected", (event => {
            emit(END);
        }));
        return () => {
            worker.removeAllListeners();
        };
    });

    while (true) {
        let { type, payload } = yield take(channel);
        yield put({ type, payload });
    }
}

export function* workerSaga(worker) {
    try {
        yield call(connect, worker);
        yield put(itemFetchAll());
        yield call(subscribe, worker);
    } catch (error) {
        yield put(appError(error));
    }
}

export default function* watchAction() {
    while (yield take(START_APP)) {
        const worker = yield getContext("worker");
        const appTask = yield fork(workerSaga, worker);
        yield take(STOP_APP);
        yield cancel(appTask);
        yield call (disconnect, worker);
    }
}