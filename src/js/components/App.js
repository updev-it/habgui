import React from "react";
import Item from "./Item.js";
import Slider from "./Slider.js";

const App = () =>
    <>
        <div className="container-fluid text-dark" style={{ padding: '0px', paddingRight: '0px', paddingLeft: '0px' }}>
            <nav className="navbar navbar-dark">
                <div className="container-fluid"><a className="navbar-brand" href="#">OpenHAB GUI</a><button data-toggle="collapse" data-target="#navcol-1" className="navbar-toggler"><span className="sr-only">Toggle navigation</span><span className="navbar-toggler-icon"></span></button>
                    <div className="collapse navbar-collapse"
                        id="navcol-1">
                        <ul className="nav navbar-nav">
                            <li role="presentation" className="nav-item"><a className="nav-link active" href="#">First Item</a></li>
                            <li role="presentation" className="nav-item"><a className="nav-link" href="#">Second Item</a></li>
                            <li role="presentation" className="nav-item"><a className="nav-link" href="#">Third Item</a></li>
                        </ul>
                    </div>
                </div>
            </nav>
        </div>
        <div className="container-fluid" style={{ paddingLeft: '0px', paddingRight: '0px' }}>
            <div className="row" style={{ marginRight: '15px', marginLeft: '15px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="col-3 text-white" style={{ padding: '0px' }}>
                    <Slider itemName="FF_Office_Dimmer_Spotlights" />
                </div>
            </div>
        </div>
    </>

export default App;