import React from "react";
import List from "./List.js";
import Form from "./Form.js";

const App = () =>
    <div className="row mt-5">
        <div className="col-md-6 offset-md-2">
            <h2>Items</h2>
            <List itemName="VT_MQTT_DSMRReader_ElectricityCurrentlyDelivered" />
        </div>
    </div>;

export default App;