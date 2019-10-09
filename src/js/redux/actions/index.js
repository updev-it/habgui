import { ITEM_FETCH_ALL, ITEM_FETCH_ALL_SUCCESS, ITEM_FETCH_ALL_FAILED, ITEM_CHANGED, ITEM_COMMAND, START_APP, WORKER_ERROR, APP_ERROR, STOP_APP } from "./actionTypes";

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

export function itemFetchAllSuccess(payload) {
    return { type: ITEM_FETCH_ALL_SUCCESS, payload };
}

export function itemFetchAllFailed(error) {
    return { type: ITEM_FETCH_ALL_FAILED, error };
}

export function itemChanged(payload) {
    return { type: ITEM_CHANGED, payload };
}

export function itemRemoved(payload) {
    return { type: ITEM_REMOVED, payload };
}

export function itemCommand(payload, command) {
    return { type: ITEM_COMMAND, payload, command };
}

// Exceptions & erros

export function appError(error) {
    return { type: APP_ERROR, error };
}

export function workerError(error) {
    return { type: WORKER_ERROR, error };
}