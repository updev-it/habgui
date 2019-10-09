import { takeLatest, call, put, getContext } from 'redux-saga/effects'
import { ITEM_FETCH_ALL, ITEM_FETCH_ALL_SUCCESS, ITEM_FETCH_ALL_FAILED } from '../actions/actionTypes';
import { itemFetchAllSuccess, itemFetchAllFailed } from '../actions';

export function* workerSaga() {
    try {
        const worker = yield getContext('worker');
        const items = yield call(worker.getAll.bind(worker, "items"));
        yield put(itemFetchAllSuccess(items));
    } catch (error) {
        yield put(itemFetchAllFailed(error));        
    }
}

export default function* watchAction() {
    yield takeLatest(ITEM_FETCH_ALL, workerSaga);
}