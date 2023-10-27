const debug = require('./debug');
const Bot = require('./bot');
const Entities = require('./entities');
const conv = require('./conv');

class Bots {
    constructor(ctx) {
        ctx = ctx || {};
        this.url = 's14523994187';
        this.entities = new Entities;
        this.stepDelay = ctx.stepDelay || 5000;
        this.children = [];
        this.name = ctx.name || 'XBot';
        this.group = ctx.group || 'r1ck';
        this.mode = ctx.mode || 'Castle';
    }
    run() {
        debug.logger.debug('Running Bots Manger. Connecting all initialized bots to server\nand setting up step function')
        this.connectAll();
        setInterval(()=> {
            for (const bot of this.children) {
                bot.step();
            }
        }, this.stepDelay);
    }
    addBot(name, group, mode) {
        name = name || this.name;
        group = group || this.group;
        mode = mode || this.mode;

        let index = this.children.length;

        const bot = new Bot(this, name, group, mode);
        this.children.push(bot);

        bot.on('death', () => { bot.send('respawn'); });


        bot.on('error',
            () => {
                bot.socket.close();
            });
        bot.on('close',
            () => {
                this.addBot(bot.name, bot.group, bot.mode).connect();
                this.children.splice(this.children.indexOf(bot),1);
            });
        
        if (index !== 0) { return bot; }

        debug.logger.debug('Adding update callbacks to first bot');
        bot.on('snapshot',
            (data) => {
                this.snapshot(bot, data);
            });
        bot.on('update',
            (data) => {
                this.update(bot, data);
            });
            
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
    connectBot(index) {
        this.children[index].connect();
    }
    connectAll() {
        for (const bot of this.children) {
            bot.connect();
        }
    }
    addCond(index, cond_data, ...args) {
        this.children[index].addCond(cond_data, ...args);
    }
    addCondAll(cond_data, ...args) {
        for (const bot of this.children) {
            bot.addCond(cond_data, ...args);
        }
    }
    removeCond(index, conditional) {
        this.children[index].removeCond(conditional);
    }
    removeCondAll(conditional) {
        for (const bot of this.children) {
            bot.removeCond(conditional);
        }
    }
    addTask(index, task_data,  ...args) {
        this.children[index].addTask(task_data, ...args);
    }
    addTaskAll(task_data, ...args) {
        for (const bot of this.children) {
            bot.addTask(task_data, ...args);
        }
    }
    allTribes() {
        return this.entities.filter((ent) => constructorName === 'Tribe');
    }
    move(index, x, y) {
        this.children[index].move(x,y);
    }
    moveAll(x, y) {
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
