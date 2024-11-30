const debug = require('./debug');

const { WebSocket } = require('ws');
const { EventEmitter } = require('events');
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

class Bot extends EventEmitter {
    constructor(mgr, name, group, mode) {
        super();
        console.log("test")
        debug.logger.warn('Constructing Bot App');
        this.parent = mgr;
        this.conditionals = [];
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

        this.autorespawn = false;

        this.on('death', () => { if (this.autorespawn) {this.send('respawn');} });
        this.on('error', () => { bot.socket.close(); });
        this.on('close', () => { this.run(); });
    
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
    async run() {
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

            const handlerFunc = this.handler[message.key];
            if (handlerFunc) {
                handlerFunc(message.data);
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
        
    }
    respawn() {
        this.send(respawn);
    }
    setAutoRespawn(b) {
        if (b) {
            this.autorespawn = b;
            return;
        }
        this.autorespawn = this.autorespawn ? false : true;
    }
    handler = {
        setPlayer: (data) => {
            this.player = data;
        },
        resources: (data) => {
            this.resources = data;
        },
    }
}

module.exports = Bot;
