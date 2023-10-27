class Entities {
    constructor() {
        this.list = {};
    }

    add(entity) {
        const {sid} = entity;
        this.list[sid] = entity;
    }

    remove(sid) {
        delete this.list[sid];
    }
    update(entity) {
        const {sid} = entity;
        Object.assign(this.list[sid], entity);
    }
    
    get(sid) {
        return this.list[sid];
    }
    filter(filter) {
        return Object.values(this.list).filter(filter);
    }
    *[Symbol.iterator]() {
        for (const bot of this.list) {
            yield bot;
        }
    }
}

module.exports = Entities;
