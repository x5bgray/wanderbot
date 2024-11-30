const winston = require('winston');
const { combine, errors, timestamp, cli } = winston.format;

const stack = new Array;
function enter(func_name) {
    stack.push(func_name);
}
function exit() {
    stack.pop();
}

const logs = new Array;
const logger = winston.createLogger({
    level: 'info',
    format: combine(errors({ stack: true }), timestamp(), cli()),
    transports: [
        new winston.transports.Console(),
    ],
});

function clear() {
    logs.logs = new Array;
}

module.exports = {
    logs: logs,
    clear: clear,
    logger: logger,
    stack: { enter: enter, exit: exit },
};