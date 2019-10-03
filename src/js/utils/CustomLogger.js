export const LogLevel = Object.freeze({ "ERROR": 0, "WARN": 1, "LOG": 2, "INFO": 2, "DEBUG": 3, "TRACE": 9, "VERBOSE": 9});

export class CustomLogger {

    static newConsole (originalConsole, logLevel) {

        if (!originalConsole) {
            origConsole = {};
        }

        let currentLogLevel = logLevel !== undefined ? logLevel : LogLevel.INFO;

        let enableLogging = true, isSaveLog = false,
            logArray = {
                log: [],
                error: [],
                warn: [],
                info: [],
                debug: [],
                trace: []
            };

        return {
            log: function () {
                // this.addLog("log", arguments);
                enableLogging && originalConsole.log && currentLogLevel >= LogLevel.INFO && originalConsole.log.apply(originalConsole, Array.prototype.concat.apply(["[LOG]".padEnd(7), "::"], arguments));
            },
            warn: function () {
                // this.addLog("warn", arguments);
                enableLogging && originalConsole.warn && currentLogLevel >= LogLevel.WARN && originalConsole.warn.apply(originalConsole, Array.prototype.concat.apply(["[WARN]".padEnd(7), "::"], arguments));
            },
            error: function () {
                // this.addLog("error", arguments);
                enableLogging && originalConsole.error && currentLogLevel >= LogLevel.ERROR && originalConsole.error.apply(originalConsole, Array.prototype.concat.apply(["[ERROR]".padEnd(7), "::"], arguments));
            },
            info: function () {
                // this.addLog("info", arguments);
                enableLogging && originalConsole.info && currentLogLevel >= LogLevel.LOG && originalConsole.info.apply(originalConsole, Array.prototype.concat.apply(["[INFO]".padEnd(7), "::"], arguments));
            },
            debug: function () {
                // this.addLog("debug", arguments);
                enableLogging && originalConsole.debug && currentLogLevel >= LogLevel.DEBUG && originalConsole.debug.apply(originalConsole, Array.prototype.concat.apply(["[DEBUG]".padEnd(7), "::"], arguments));
            },
            trace: function () {
                // this.addLog("trace", arguments);
                enableLogging && originalConsole.debug && currentLogLevel >= LogLevel.TRACE && originalConsole.trace.apply(originalConsole, Array.prototype.concat.apply(["[TRACE]".padEnd(7), "::"], arguments));
            },
            dir: function () {
                enableLogging && originalConsole.info && originalConsole.dir.apply(originalConsole, arguments);
            },
            saveLog: function (bool) {
                isSaveLog = bool;
            },
            disableLoging() {
                enableLogging = false;
            },
            enableLogging() {
                enableLogging = true;
            },
            addLog: function (array, ...args) {
                if (!isSaveLog) {
                    return;
                }
                logArray[array || "log"].push(args);
            },
            logArray: function () {
                return logArray;
            },
            clear: function (...args) {
                originalConsole.clear.apply(...args);
            }
        };
    }

    static enable(logLevel) {
        if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
            this.originalConsole = console;
            console = CustomLogger.newConsole(console);
        } else {
            this.originalConsole = window.console;
            window.console = CustomLogger.newConsole(window.console);
        }
    }

    static disable() {
        if (this.originalConsole !== undefined) {
            if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
                console = this.originalConsole;
            } else {
                window.console = this.originalConsole;
            }
        }
    }
}