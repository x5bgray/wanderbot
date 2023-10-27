/**
 * Creates a new instance of the Constructor.
 * @param {Object} bot - The bot object.
 * @param {Object} func - The function object.
 * @param {Object} ctx - The context object.
 * @param {...any} args - Additional arguments.
 * @constructor
 * @summary Creates a new instance of the Constructor.
 * @description This constructor initializes a new instance of the Constructor class. It sets the provided bot, function, context, and arguments to the corresponding properties of the instance.
 * @property {Object} bot - The bot object.
 * @property {Object} ctx - The context object.
 * @property {Array} args - The additional arguments.
 * @property {Function} initialize - The bound init function of the bot.
 * @property {Function} callback - The bound call function of the bot.
 * @property {Function} condition - The bound cond function of the bot.
 */
class Task {
    constructor(bot, task_data, ...args) {
        this.bot = bot;
        this.ctx = task_data.ctx || {};
        this.ctx.bot = bot;
        this.args = args || [];

        this.initialize = task_data.init.bind(this.ctx);
        this.callback = task_data.call.bind(this.ctx);
        this.condition = task_data.cond.bind(this.ctx);

    }
    init() {
        this.initialize(...this.args);
    }
    run() {
        return this.callback();
    }
    check() {
        return this.condition();
    }
}

/**
 * A collection of tasks associated with a bot.
 */
class Tasks {
    constructor(bot) {
        this.children = new Set();
        this.current = undefined;
        this.bot = bot;
    }
    /**
     * Adds a new task to the collection.
     * @param {Object} func - The function object.
     * @param {Object} ctx - The context object.
     * @param {...any} args - Additional arguments.
     */
    add(task_data, ...args) {
        const task = new Task(this.bot, task_data, ...args);
        task.init();
        this.children.add(task);
        return task;
    }
        /**
     * Removes a task from the collection.
     * @param {Task} task - The task to remove.
     */
    remove(task) {
        this.children.delete(task);
    }
        /**
     * Advances the task execution by checking and running the next task in the collection.
     */
    step() {
        // If there is no current task and no others in line, skip this step
        if(this.children.size === 0 && !this.current) { return; }

        if(!this.current) {
            this.current = this.children.values().next().value;
            this.children.delete(this.current);
        }
        if (this.current.check()) {
            this.current = this.children.values().next().value;
            this.children.delete(this.current);
        }

        if(!this.current) { return; }

        this.current.run();
    }
}

module.exports = {Tasks, Task}