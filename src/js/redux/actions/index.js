import { ITEM_FETCH_ALL, ITEM_FETCH_ALL_SUCCESS, ITEM_FETCH_ALL_FAILED, ITEM_CHANGED, START_APP, WORKER_ERROR, APP_ERROR, STOP_APP } from "./actionTypes";

// Application actions
export function startApp() {
    return { type: START_APP };
}

export function stopApp() {
    return { type: STOP_APP };
}

// Item actions

export function itemFetchAll() {
    return { type: ITEM_FETCH_ALL };
}

export function itemFetchAllSuccess() {
    return { type: ITEM_FETCH_ALL_SUCCESS };
}

export function itemFetchAllFailed() {
    return { type: ITEM_FETCH_ALL_FAILED };
}

export function itemChanged(payload) {
    return { type: ITEM_CHANGED, payload: payload };
}

// Exceptions & erros

export function appError(error) {
    return { type: APP_ERROR, payload: error };
}

export function workerError(error) {
    return { type: WORKER_ERROR, payload: error };
}