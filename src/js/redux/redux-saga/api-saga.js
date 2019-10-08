import { takeEvery, call, put } from "redux-saga/effects";

function getData() {
    return fetch("https://jsonplaceholder.typicode.com/posts").then(response =>
        response.json()
    );
}

function* dataRequested() {
    try {
        const payload = yield call(getData);
        yield put({ type: "DATA_LOADED", payload });
    } catch (e) {
        yield put({ type: "API_ERRORED", payload: e });
    }
}

// use them in parallel
export default function* rootSaga() {
    yield takeEvery('DATA_REQUESTED', dataRequested)
    // yield takeEvery('CREATE_USER', createUser)
}