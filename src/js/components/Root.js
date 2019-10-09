import React from "react";
import { Provider } from "react-redux";

import App from "./App.js";
import store from "../redux/store";
import { startApp } from "../redux/actions/index.js";

window.store = store;

class Root extends React.Component {
    componentDidMount() {
        store.dispatch(startApp());
    }

    render() {
        return (<Provider store={store}>
            <App />
        </Provider>);
    }
}

export default Root;
