import React from "react";
import { connect } from "react-redux";

const mapStateToProps = (state, ownProps) => {
    const { itemName } = ownProps;
    return { item: state.items[itemName] };
};

const ConnectedList = ({ item }) => {
    return (
        <ul className="list-group list-group-flush">
            {item && item.name &&
                <li className="list-group-item" key={item.name}>
                    {item.label !== "" ? item.label : item.name} : {item.state * 1000} Watt
                </li>
            }
        </ul>)
}

const List = connect(mapStateToProps)(ConnectedList);

export default List;