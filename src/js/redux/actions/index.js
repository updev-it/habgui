import { ADD_ARTICLE, DATA_REQUESTED } from "../constants/action-types";


export function addArticle(payload) {
    return { type: ADD_ARTICLE, payload };
}

window.getItems = getItems;

export function getItems() {
    return { type: DATA_REQUESTED };
}
