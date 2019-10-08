// React imports
import { createStore, applyMiddleware, compose } from "redux";
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

saga.run(apiSaga);

export default store;