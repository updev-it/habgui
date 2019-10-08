import React from "react";
import { Provider } from "react-redux";

import App from "./App.js";
import store from "../redux/store";

window.store = store;

export default () =>
    <Provider store={store}>
        <App />
    </Provider>;
