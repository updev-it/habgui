import { takeEvery, call, put, getContext } from 'redux-saga/effects'
import { ITEM_COMMAND } from '../actions/actionTypes';
import { customFetch } from '../../utils';

function* itemCommandSaga(action) {
    yield call(customFetch, `http://rancher.home.besqua.red:18080/rest/items/${action.payload}`, { method: "POST", body: action.command });
}

export default function* watchAction() {
    yield takeEvery(ITEM_COMMAND, itemCommandSaga);
}
