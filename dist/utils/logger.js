"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const config_1 = require("../config");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
const levelMap = {
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    info: LogLevel.INFO,
    debug: LogLevel.DEBUG,
};
class Logger {
    constructor() {
        this.currentLevel = levelMap[config_1.config.logging.level] || LogLevel.INFO;
    }
    shouldLog(level) {
        return level <= this.currentLevel;
    }
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        if (data) {
            return `${formattedMessage} ${JSON.stringify(data, null, 2)}`;
        }
        return formattedMessage;
    }
    log(level, levelName, message, data) {
        if (!this.shouldLog(level))
            return;
        const formattedMessage = this.formatMessage(levelName, message, data);
        if (level === LogLevel.ERROR) {
            console.error(formattedMessage);
        }
        else if (level === LogLevel.WARN) {
            console.warn(formattedMessage);
        }
        else {
            console.log(formattedMessage);
        }
    }
    error(message, data) {
        this.log(LogLevel.ERROR, 'error', message, data);
    }
    warn(message, data) {
        this.log(LogLevel.WARN, 'warn', message, data);
    }
    info(message, data) {
        this.log(LogLevel.INFO, 'info', message, data);
    }
    debug(message, data) {
        this.log(LogLevel.DEBUG, 'debug', message, data);
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map