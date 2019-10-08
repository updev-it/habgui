// React imports
import { createStore, applyMiddleware, compose } from "redux";
import createSagaMiddleware from "redux-saga";

// Local imports
import rootReducer from "../reducers/index";
import apiSaga from "../redux-saga/api-saga";

const initialiseSagaMiddleware = createSagaMiddleware();

// const storeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(rootReducer,
    applyMiddleware(initialiseSagaMiddleware)
);

initialiseSagaMiddleware.run(apiSaga);

export default store;