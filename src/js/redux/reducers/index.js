import { ITEM_FETCH_ALL_SUCCESS, ITEM_CHANGED } from "../actions/actionTypes";
import { arrayToObject } from "../../utils";
import { ObjectModel } from "../../storage";

const initialState = {
    items: {},
};

function rootReducer(state = initialState, action) {
    if (action.type === ITEM_FETCH_ALL_SUCCESS) {
        const items = arrayToObject(action.payload, ObjectModel.getAsObject()["items"].key);
        return Object.assign({}, state, { items: items });
    } else if (action.type === ITEM_CHANGED) {
        const item = action.payload.detail.item;
        return {
            ...state,
            items: {
                ...state.items,
                [item.name]: item
            }
        }
    }
    return state;
}
export default rootReducer;