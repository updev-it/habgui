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

// React imports
import React from "react";
import ReactDOM from "react-dom";

// HabGUI exceptions
import { NotSupportedException } from "./js/exceptions";

// HabGUI logger
import { CustomLogger, LogLevel } from "./js/utils";

// HabGUI Feature detection
import { featureDetectionFetch, featureDetectionIndexedDB, featureDetectionSharedWorker } from "./js/features";

// HabGUI Component imports
import { PowerContainer } from "./js/components/App.js";

const logger = CustomLogger.newConsole(window.console, LogLevel.DEBUG);
logger.clear();

try {
  featureDetectionFetch();
  featureDetectionIndexedDB();
  featureDetectionSharedWorker();

  ReactDOM.render(<PowerContainer />, document.querySelector("#container"));
} catch (error) {
  if (error instanceof NotSupportedException) {
    logger.warn(error.message);
  } else {
    throw error;
  }
}
