const debug = require('./debug');

const { WebSocket } = require('ws');
const { EventEmitter } = require('events');
const {Tasks} = require('./tasks');
const conv = require('./conv');

class Conditional {
    constructor(bot, cond_data, ...args) {
        this.bot = bot;
        this.condition = cond_data.cond;
        this.callback = cond_data.call;
        this.args = args;
    }
    run() {
        if (!this.condition()) { return; }
        return this.callback(...this.args);
    }
}

const MessageHandler = {
    setPlayer: (obj, mgr, data) => {
        obj.player = data;
    },
    resources: (obj, mgr, data) => {
        obj.resources = data;
    },
};

class Bot extends EventEmitter {
    constructor(mgr, name, group, mode) {
        debug.logger.debug('Constructing Bot App');
        super();
        this.parent = mgr;
        this.conditionals = [];
        this.tasks = new Tasks(this);
        this.connected = false;
        this.name = name;
        this.group = group;
        this.mode = mode;
        this.tribesmen = [];
        this.resources = {
            food:0,
            wood:0,
            gold:0,
            water:0,
        };
    }

    send(key, data) {
        debug.logger.debug(`Sending Message: ${key}`);
        if (!this.connected) { return; }

        let index = undefined;
        if (conv.hasDesc(key)) {
            data = conv.encode(key, data, false, [], true);
            index = conv.getKeyIndex(key);
        }

        const code = index || key;
        const packet = conv.pack(code, data);
        this.socket.send(packet);
    }
    move(x, y) {
        this.send('move', {x: x, y: y});
    }
    targetSid(sid) {
        this.target = this.parent.entities.get(sid);
    }
    async connect() {
        debug.logger.debug('Running Bot');


        this.socket = new WebSocket(`wss://${this.parent.url}.wanderers.io`);
        this.socket.binaryType = 'arraybuffer';

        this.socket.addEventListener('open', (res) => {
            debug.logger.debug('WebSocket Opened. Sending Hello');
            this.connected = true;
            this.send('hello', {
                name: this.name,
                group: this.group,
                mode: this.mode });
            this.emit('open', res.data);
        });
        this.socket.addEventListener('message', (packet) => {
            const { key, data } = conv.unpack(packet.data);
            const message = {};
            if (typeof key === 'number') {
                message.key = conv.getKey(key);
            } else {
                message.key = key;
            }
            if (conv.hasDesc(message.key)) {
                message.data = conv.decode(message.key, data, true);
            } else {
                message.data = data;
            }

            const handler = MessageHandler[message.key];
            if (handler) {
                handler(this, this.parent, message.data);
            }

            this.emit(message.key, message.data);
            this.emit('message', message);
        });
        this.socket.addEventListener('close', (res) => {
            debug.logger.debug('WebSocket Closed. GOODBYE');
            this.connected = false;
            this.emit('close', res.data);
        });
        this.socket.addEventListener('error', (res) => {
            debug.logger.warn(`Websocket ERROR: ${res}`);
        });
    }
    step() {
        this.tasks.step();
        for (const cond of this.conditionals) {
                cond.run();
        }
    }
    addCond(cond_data, ...args) {
        const cond = new Conditional(this, cond_data, ...args)
        this.conditionals.push(cond);
        return cond;
    }
    removeCond(cond) {
        this.conditionals.splice(this.conditionals.indexOf(cond), 1);
    }
    addTask(task_data, ...args) {
        return this.tasks.add(task_data, ...args);
    }
    removeTask(task) {
        this.tasks.remove(task);
    }
}

module.exports = Bot;