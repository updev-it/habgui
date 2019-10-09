import { combineReducers } from "redux";
import reducerItems  from "./reducerItems";

// Create root reducer

const rootReducer = combineReducers({
    items: reducerItems
});

export default rootReducer;