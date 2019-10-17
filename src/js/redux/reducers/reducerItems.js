// Local imports
import { createReducer, removeFromObject, updateObject } from "./reducerUtils.js";
import { ObjectModel } from "../../storage/ObjectModel.js";
import { arrayToObject } from "../../utils";

// Action types
import { ITEM_FETCH_ALL_SUCCESS, ITEM_ADDED, ITEM_REMOVED, ITEM_CHANGED } from "../actions/actionTypes";

// Items object model
const itemsObjectModel = ObjectModel.getAsObject()["items"];

// Item reducer methods

function itemFetchAllSuccess(itemsState, action) {        
    const key = itemsObjectModel.key;
    const items = arrayToObject(action.payload, key);
    return updateObject(itemsState, items);
}

function itemAdded(itemsState, action) {
    const addedItem = action.payload.detail.item;
    return updateObject(itemsState, addedItem);
    // return [].concat(itemsState, addedItem);
}

function itemRemoved(itemsState, action) {    
    const removedItem = action.payload.detail.item;
    const key = itemsObjectModel.key;
    return removeFromObject(itemsState, removedItem[key]);
    // return itemsState.filter(item => item[itemsObjectModel.key] !== removedItem[itemsObjectModel.key]);
}

function itemChanged(itemsState, action) {
    const changedItem = action.payload.detail.item;    
    const key = itemsObjectModel.key;    
    return updateObject(itemsState, { [changedItem[key]]: changedItem });    
    // return itemsState.map((item) => item[itemsObjectModel.key] === changedItem[itemsObjectModel.key] ? changedItem : item);
}

// Initial state

export const itemsInitialState = {};

// Create item reducer

export default createReducer(itemsInitialState, {
    [ITEM_ADDED]: itemAdded,
    [ITEM_REMOVED]: itemRemoved,
    [ITEM_CHANGED]: itemChanged,    
    [ITEM_FETCH_ALL_SUCCESS]: itemFetchAllSuccess
});