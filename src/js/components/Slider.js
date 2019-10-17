// External imports
import _ from "lodash";

// React imports
import React from "react";

// Redux imports
import { connect } from "react-redux";
import { itemCommand } from "../redux/actions";

// Material-UI imports
import Slider from "@material-ui/core/Slider";

const mapStateToProps = (state, ownProps) => {
    const { itemName } = ownProps;
    const item = _.find(state.items, { name: itemName });

    return {
        item: item,        
        lightsOnCount: _.filter(state.items, item => {
            return item.groupNames && item.groupNames.includes("g_Dimmers") && item.state !== "0" && item.state !== "OFF" && item.state !== "UNDEF" && item.state !== "NULL"
        }).length
    };
};

const mapDispatchToProps = (dispatch, ownProps) => {
    const { itemName } = ownProps;
    return {
        valueChanged: (event, value) => {
            event.preventDefault();
            dispatch(itemCommand(itemName, value));
        }
    }
};

class ConnectedHGSlider extends React.Component {
    constructor(props) {
        super(props);

        this.state = { value: 0 } ;
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event, value) {
        this.setState({value});
    }

    static getDerivedStateFromProps(props, state) {
        if (props.item && parseInt(props.item.state) != state.value) {
            return { value: parseInt(props.item.state) };
        } else {
            return state;
        }
    }

    render() {
        if (this.props.item && this.props.item.name) {
            return (
                <div>
                    <span className="d-block" style={{ margin: '0px', padding: '10px' }}>Number of lights on: {this.props.lightsOnCount}</span>
                    <span className="d-block" style={{ margin: '0px', padding: '10px' }}>{this.props.item.label} : {this.props.item.state} %</span>
                    <Slider defaultValue={parseInt(this.props.item.state)} value={this.state.value} onChange={this.handleChange} onChangeCommitted={this.props.valueChanged} marks={[{ value: 25 }, { value: 50 }, { value: 75 }]} step={5} valueLabelDisplay="auto" color="primary" />
                </div>
            )
        } else {
            return null;
        }
    }
}

// const ConnectedHGSlider = ({ item, lightsOnCount, valueChanged }) => {

//     if (item && item.name) {
//         return (
//             <div>
//                 <span className="d-block" style={{ margin: '0px', padding: '10px' }}>Number of lights on: {lightsOnCount}</span>
//                 <span className="d-block" style={{ margin: '0px', padding: '10px' }}>{item.label} : {item.state} %</span>
//                 <Slider value={parseInt(item.state)} onChange={handleChange} onChangeCommitted={valueChanged} marks={[{ value: 25 }, { value: 50 }, { value: 75 }]} step={5} valueLabelDisplay="auto" color="primary" />
//             </div>
//         )
//     } else {
//         return null;
//     }
// }

const HGSlider = connect(mapStateToProps, mapDispatchToProps)(ConnectedHGSlider);

export default HGSlider;