export const LogLevel = Object.freeze({ "ERROR": 0, "WARN": 1, "LOG": 2, "INFO": 2, "DEBUG": 3});

export class CustomLogger {

    static enable(logLevel) {

        const newConsole = function (originalConsole) {

            if (!originalConsole) {
                origConsole = {};
            }

            let currentLogLevel = logLevel;

            let enableLoging = true, isSaveLog = false,
                logArray = {
                    logs: [],
                    errors: [],
                    warns: [],
                    infos: [],
                    debugs: []
                };

            return {
                log: function () {
                    this.addLog("logs", arguments);
                    enableLoging && originalConsole.log && currentLogLevel >= LogLevel.INFO && originalConsole.log.apply(originalConsole, Array.prototype.concat.apply(["[LOG]".padEnd(7), "::"], arguments));
                },
                warn: function () {
                    this.addLog("warns", arguments);
                    enableLoging && originalConsole.warn && currentLogLevel >= LogLevel.WARN && originalConsole.warn.apply(originalConsole, Array.prototype.concat.apply(["[WARN]".padEnd(7), "::"], arguments));
                },
                error: function () {
                    this.addLog("errors", arguments);
                    enableLoging && originalConsole.error && currentLogLevel >= LogLevel.ERROR && originalConsole.error.apply(originalConsole, Array.prototype.concat.apply(["[ERROR]".padEnd(7), "::"], arguments));
                },
                info: function () {
                    this.addLog("infos", arguments);
                    enableLoging && originalConsole.info && currentLogLevel >= LogLevel.LOG && originalConsole.info.apply(originalConsole, Array.prototype.concat.apply(["[INFO]".padEnd(7), "::"], arguments));
                },
                debug: function () {
                    this.addLog("debugs", arguments);
                    enableLoging && originalConsole.info && currentLogLevel >= LogLevel.DEBUG && originalConsole.debug.apply(originalConsole, Array.prototype.concat.apply(["[DEBUG]".padEnd(7), "::"], arguments));
                },
                saveLog: function (bool) {
                    isSaveLog = bool;
                },
                disableLoging() {
                    enableLoging = false;
                },
                enableLoging() {
                    enableLoging = true;
                },
                addLog: function (array, ...args) {
                    if (!isSaveLog) {
                        return;
                    }
                    logArray[array || "logs"].push(args);
                },
                logArray: function () {
                    return logArray;
                },
                clear: function (...args) {
                    originalConsole.clear.apply(...args);
                }
            };

        }

        if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
            this.originalConsole = console;
            console = newConsole(console);
        } else {
            this.originalConsole = window.console;
            window.console = newConsole(window.console);
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