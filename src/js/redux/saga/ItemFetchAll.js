import { takeLatest, call, put, getContext } from 'redux-saga/effects'
import { ITEM_FETCH_ALL, ITEM_FETCH_ALL_SUCCESS, ITEM_FETCH_ALL_FAILED } from '../actions/actionTypes';

export function* workerSaga() {
    try {
        const worker = yield getContext('worker');
        const payload = yield call(worker.getAll.bind(worker, "items"));
        yield put({ type: ITEM_FETCH_ALL_SUCCESS, payload });
    } catch (error) {
        yield put({ type: ITEM_FETCH_ALL_FAILED, payload: error });        
    }
}

export default function* watchAction() {
    yield takeLatest(ITEM_FETCH_ALL, workerSaga);
}