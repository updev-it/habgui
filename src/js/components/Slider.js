// React imports
import React from "react";

// Redux imports
import { connect } from "react-redux";
import { itemCommand } from "../redux/actions";

// Material-UI imports
import Slider from "@material-ui/core/Slider";

const mapStateToProps = (state, ownProps) => {
    const { itemName } = ownProps;
    return {
        item: state.items[itemName]
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    const { itemName } = ownProps;
    return {
        valueChanged: (event, value) => {
            event.preventDefault();
            dispatch(itemCommand(itemName, value))
        }
    }
};

const ConnectedHGSlider = ({ item, valueChanged }) => {

    if (item && item.name) {
        return (
            <div>
                <span className="d-block" style={{ margin: '0px', padding: '10px' }}>{item.label} : {item.state} %</span>
                <Slider defaultValue={parseInt(item.state)} onChangeCommitted={valueChanged} marks={[{ value: 25 }, { value: 50 }, { value: 75 }]} step={5} valueLabelDisplay="auto" color="primary" />
            </div>
        )
    } else {
        return null;
    }
}

const HGSlider = connect(mapStateToProps, mapDispatchToProps)(ConnectedHGSlider);

export default HGSlider;