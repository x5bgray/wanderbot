const debug = require('./debug');

const Bot = require('./bot');
const Entities = require('./entities');
const conv = require('./conv');

const { EventEmitter } = require('events');


const URL = "https://wanderers.io/client/server/";

async function getURL() {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
  
      const serv_url = await response.text()
      debug.logger.debug("Current Server: " + serv_url);
      return serv_url
    } catch (error) {
      debug.logger.error(error.message);
    }
  }

class Bots extends EventEmitter {
    constructor(ctx) {
        debug.stack.enter("Bots.constructor");
        super()
        ctx = ctx || {};
        this.url = undefined;
        this.entities = new Entities;
        this.stepDelay = ctx.stepDelay || 5000;
        this.children = [];
        this.name = ctx.name || 'XBot';
        this.group = ctx.group || 'r1ck';
        this.mode = ctx.mode || 'Castle';
        debug.stack.exit()
    }
    run() {
        debug.stack.enter("Bots.run");
        getURL.then(res => )
        if (this.children.length === 0 ) {
            debug.logger.warn('No bots added. Add bots to run first');
        }

        this.children[0].on('snapshot',
        (data) => {
            this.snapshot(this.children[0], data);
        });
        this.children[0].on('update',
        (data) => {
            this.update(this.children[0], data);
        });
        
        debug.logger.debug('Running Bots Manger. Connecting all initialized bots to server\nand setting up step function')
        
        setImmediate(()=> {
            for (let bot of this.children) {
                bot.run();
            }
        }, 5000);

        debug.stack.exit()
    }
    addBot(name, group, mode) {
        debug.stack.enter()
        name = name || this.name;
        group = group || this.group;
        mode = mode || this.mode;

        let index = this.children.length;

        const bot = new Bot(this, name, group, mode);
        this.children.push(bot);

        return bot;
    }
    addBots (count, name, group, mode) {
        for (let i = 0; i < count; i++) {
            this.addBot(name, group, mode);
        }
    }
    removeBot(index) {
        this.children[index].socket.close();
        delete this.children[index];
    }

    attack(sid) {
        this.followed = this.entities.get(sid);
        for (const bot of this.children) {
            bot.addTask(task_attack, sid);
        }
    }
    move(x, y) {
        for (const bot of this.children) {
            bot.move(x,y);
        }
    }

    snapshot(bot, data) {
        data.entities.forEach((ent_data) => {
            const code = conv.getKey(ent_data[1]);
            const entity = conv.decode(code, ent_data);
            if (!entity) {
                debug.logger.warn('Undefined entity in snapshot msg hndlr ');
                return;
            }
            this.entities.add(entity);
        });
    }
    update(bot, data) {
        data.entities.forEach((ent_data) => {
            const sid = ent_data[1];
            let entity = this.entities.get(sid);

            if (!entity) {
                const key = conv.getKey(ent_data[2]);
                if (typeof key === 'undefined') {
                    debug.logger.warn(`Undefined key in update \n ${JSON.stringify(ent_data)}`);
                    return;
                }
                entity = conv.decode(key, ent_data, true);
                this.entities.add(entity);
                return;
            }

            entity = conv.decode(entity.constructorName, ent_data, true);

            if (entity.remove) {
                if (entity.sid === bot.player) {
                    bot.emit('death');
                    bot.emit('message', 'death');
                }
                this.entities.remove(entity.sid);
                return;
            }

            this.entities.update(entity);
        });
    }


    *[Symbol.iterator]() {
        for (const bot of this.children) {
            yield bot;
        }
    }
}

module.exports = Bots;
