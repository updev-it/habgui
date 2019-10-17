// External imports
import _ from "lodash";

// React imports
import React from "react";

// Redux imports
import { connect } from "react-redux";
import { itemCommand } from "../redux/actions";


const mapStateToProps = (state, ownProps) => {
    const { itemName } = ownProps;
    return {
        item: _.find(state.items, { name: itemName})
    };
};

const ConnectedHGItem = ({ item, dispatch }) => {

    if (item && item.name) {
        return (
            <div>
                <span className="d-block" style={{ margin: '0px', padding: '10px' }}>{item.label} : {item.state} %</span>                
            </div>
        )
    } else {
        return (
            <div>
                <span className="d-block" style={{ margin: '0px', padding: '10px' }}>Not found</span>
            </div>
        )
    }
}

const HGItem = connect(mapStateToProps)(ConnectedHGItem);

export default HGItem;