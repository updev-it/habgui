/**
 * TODO: Summary. (use period)
 *
 * TODO: Description. (use period)
 *
 * @link   https://github.com/updev-it/habgui/blob/master/src/index.js
 * @file   This is the main application file
 * @author B. van Wetten <bas.van.wetten@gmail.com>
 * @since  30-09-2019
 */

import React from "react";
import ReactDOM from "react-dom";

import { NotSupportedException } from "./js/exceptions";
import { CustomLogger } from "./js/utils";
import {
  featureDetectionFetch,
  featureDetectionIndexedDB,
  featureDetectionSharedWorker
} from "./js/features";
import { StorageWorkerConnector } from "./js/worker/StorageWorkerConnector";
import { LogLevel } from "./js/utils/CustomLogger";
import { customFetch} from "./js/utils";

class Dimmer extends React.Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);

    this.worker = new StorageWorkerConnector();
    this.state = { dimmerLevel: 0 };

    this.worker.connect("rancher.home.besqua.red", "18080");
    this.worker.addEventListener("connected", () => {
      this.worker
        .get("items", "FF_Office_Dimmer_Spotlights")
        .then(item => {
          this.setState({ dimmerLevel: item.state });
        })
        .catch(reject => {
          console.warn(reject);
        });
    });
    this.worker.addEventListener("storeItemChanged", event => {
      if (event.detail.msg.value.name === "FF_Office_Dimmer_Spotlights") {
        this.setState({ dimmerLevel: event.detail.msg.value.state });
      }
    });
  }

  handleChange(event) {
    this.setState({ dimmerLevel: event.target.value });
    customFetch(`http://rancher.home.besqua.red:18080/rest/items/FF_Office_Dimmer_Spotlights`, { body: event.target.value, mode: 'no-cors',method: 'POST', headers: new Headers({ 'content-type': 'text/plain' }) });
  }

  render() {
    return (
      <div>
        {" "}
        <label>
          Dimmer:
          <input
            type="text"
            value={this.state.dimmerLevel}
            onChange={this.handleChange}
          />
        </label>
      </div>
    );
  }
}

try {
  featureDetectionFetch();
  featureDetectionIndexedDB();
  featureDetectionSharedWorker();

  CustomLogger.enable(LogLevel.DEBUG);

  // let worker = new StorageWorkerConnector();
  // worker.connect('rancher.home.besqua.red', '18080');

  // worker.addEventListener('connected', () => {
  //     worker.get('items', 'FF_Office_Dimmer_Spotlights').then((item) => {
  //         console.log(`Item: `, item);
  //     }).catch(reject => {
  //         console.warn(reject);
  //     });
  // });

  ReactDOM.render(<Dimmer />, document.getElementById("root"));
} catch (error) {
  if (error instanceof NotSupportedException) {
    console.warn(error.message);
  } else {
    throw error;
  }
}
