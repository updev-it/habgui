import { all } from "redux-saga/effects"
import ItemActions from "./ItemActions.js";
import ItemFetchAll from "./ItemFetchAll.js";
import StartApp from "./StartApp.js";

// use them in parallel
export default function* rootSaga() {
    yield all([ItemFetchAll(), StartApp(), ItemActions()]);
}