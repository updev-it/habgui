import React from "react";
import { connect } from "react-redux";
import { itemCommand } from "../redux/actions";

const mapStateToProps = (state, ownProps) => {
    const { itemName } = ownProps;
    return {
        item: state.items[itemName]
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    const { itemName } = ownProps;
    return {
        switchOn: () => dispatch(itemCommand(itemName, "ON")),
        switchOff: () => dispatch(itemCommand(itemName, "OFF"))
    }
}

const ConnectedItem = ({ item, switchOn, switchOff }) => {
    if (item && item.name) {
        return (
            <div>
                <p className="list-group-item" key={item.name}>
                    {item.label !== "" ? item.label : item.name} : {item.state}
            </p>
                <button onClick={switchOn}>On</button>
                <button onClick={switchOff}>Off</button>
            </div>
        )
    } else {
        return null;
    }
}

const Item = connect(mapStateToProps, mapDispatchToProps)(ConnectedItem);

export default Item;