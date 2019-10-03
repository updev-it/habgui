import React from "react";
import appStore from "../stores/AppStore";

export class PowerContainer extends React.Component {
    constructor() {
        super();

        this.state = { };

        this.itemName = "VT_MQTT_DSMRReader_ElectricityCurrentlyDelivered";

        this.connected = this.connected.bind(this);
        this.storeItemChanged = this.storeItemChanged.bind(this);
    }

    componentDidMount() {
        appStore.on("connected", this.connected);
    }

    componentWillUnmount() {
        appStore.removeListener("connected", this.connected);
        appStore.removeListener("storeItemChanged", this.storeItemChanged);
    }

    connected() {
        const item = appStore.getItem(this.itemName);
        this.setState(item);
        appStore.on("storeItemChanged", this.storeItemChanged);
    }

    storeItemChanged(item) {
        if (item.name === this.itemName) {
            this.setState(item);
        }
    }

    render() {
        return <Power item={this.state} />;
    }
}

// class Power extends React.Component {
//     constructor(props) {
//         super(props);
//     }

//     render() {
//         if (this.props.item !== undefined) {
//             return <div><h1>{this.this.props.item.name}</h1><p>State = {this.props.item.state}</p></div>;
//         } else {
//             return false;
//         }
//     }
// }

const Power = ({item}) => {
    if (item.state !== undefined) {
        return <div><h1>{item.name}</h1><p>State = {item.state}</p></div>;
    } else {
        return false;
    }
}