// Local imports
import { arrayToObject } from "../../utils";
import { updateObject, createReducer, removeFromObject } from "./reducerUtils.js";
import { ObjectModel } from "../../storage/ObjectModel.js";

// Action types
import { ITEM_FETCH_ALL_SUCCESS, ITEM_CHANGED, ITEM_REMOVED } from "../actions/actionTypes";

// Items object model
const itemsObjectModel = ObjectModel.getAsObject()["items"];

// Item reducer methods

function itemFetchAllSuccess(itemsState, action) {
    const key = itemsObjectModel.key;
    const items = arrayToObject(action.payload, key);
    return updateObject(itemsState, items);
}

function itemChanged(itemsState, action) {
    const item = action.payload.detail.item;
    return updateObject(itemsState, { [item.name]: item });
}

function itemRemoved(itemsState, action) {
    const key = itemsObjectModel.key;
    const item = action.payload.detail.item;
    return removeFromObject(itemsState, item[key]);
}

// Initial state

export const itemsInitialState = {};

// Create item reducer

export default createReducer(itemsInitialState, {
    [ITEM_CHANGED]: itemChanged,
    [ITEM_REMOVED]: itemRemoved,
    [ITEM_FETCH_ALL_SUCCESS]: itemFetchAllSuccess
});