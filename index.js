const debug = require('./debug');

const Bot = require('./bot');
const Entities = require('./entities');
const conv = require('./conv');

const task_attack = {

    /**
     * Initialize the task with the target ID
     * @param {string} sid - ID of entity to attack  
     */
      init: function(sid) {
          this.sid = sid; // Store target ID
          this.target = this.bot.parent.entities.get(sid); // Get target entity from bot's manager
      },
    
    /**
     * Main logic to execute the attack
     */
      call: function(){
          const player = this.bot.parent.entities.get(this.bot.player); // Get bot entity
            
          const distance = utils.getDistance(player.x, player.y, this.target.x, this.target.y); // Calculate distance
    
          if(distance >= 10) { // If far away, move towards target
              this.bot.move(this.target.x, this.target.y) 
          }
      },
    
    /**
     * Check if target still exists
     * @returns {Entity} The target entity if still exists
     */
      cond: function() {
          this.target = bots.entities.get(this.sid); 
          return this.target; 
      },
  }

class Bots {
    constructor(ctx) {
        ctx = ctx || {};
        this.url = 's14421783116';
        this.entities = new Entities;
        this.stepDelay = ctx.stepDelay || 5000;
        this.children = [];
        this.name = ctx.name || 'XBot';
        this.group = ctx.group || 'r1ck';
        this.mode = ctx.mode || 'Castle';
    }
    run() {
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
    }
    addBot(name, group, mode) {
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
