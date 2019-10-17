// React imports
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

// Local imports
import StorageWorkerConnector from "../../worker/StorageWorkerConnector";
import rootReducer from "../reducers/index";
import apiSaga from "../saga/api";

const saga = createSagaMiddleware({
    context: {
        worker: new StorageWorkerConnector()
    }
});

const store = createStore(rootReducer,
    applyMiddleware(saga)
);

window.store = store;

saga.run(apiSaga);

export default store;