const Bots = require('./BotManager');
const utils = require('./utils');
const REPL = require('repl');

const bots = new Bots;

let x = 0, y = 0;

bots.addBots(3);

/**
 * Defines a task to make the bot attack a target entity.
 * 
 * @param {string} sid - The ID of the target entity to attack.
 */
const task_attack = {
    init: function(sid) {
        this.sid = sid;
        this.target = bots.entities.get(sid);
    },
    call: function(){
        const player = bots.entities.get(this.bot.player);
          
        const distance = utils.getDistance(player.x, player.y, this.target.x, this.target.y);
  
        if(distance >= 10) {
            this.bot.move(this.target.x, this.target.y)
        }
    },
    cond: function() {
        this.target = bots.entities.get(this.sid);
        return this.target;
    },
}

const cond_recruit = {
    cond: function(){
        return (this.bot.resources.food >= 5);
    },
    call: function(){
        this.bot.send('recruit');
    }
}
const cond_equip = {
    cond: function(){
        return (this.bot.resources.wood >= 5);
    },
    call: function(){
        let tribesmen = bots.entities.filter((ent)=> {
            return (ent.constructorName === 'Tribesman' &&
                    ent.group_sid === this.bot.player &&
                    ent.weapon === 0);
        });
        if(tribesmen.length === 0) { return; }

        let man = tribesmen.shift();

        this.bot.send('equip', {key: 'hammer', target: man.sid});
    }
}

//bots.addTaskAll(task_attack);
bots.addCondAll(cond_recruit);
bots.addCondAll(cond_equip);

bots.run();

const repl = REPL.start('> ');
repl.context.bots = bots;
repl.context.task_attack = task_attack;
repl.context.global = global;