const msgjs = require('msgpack.js');
const msgpack = {
    pack: msgjs.encode,
    unpack: msgjs.decode,
}
const sharer_data = require('./sharerdata');
const debug = require('./debug');

const descriptors = sharer_data.desc;
const keyToIndex = new Map;
const indexToKey = new Map;
const keys = [];
const keysQueue = [];
let symbol_last_update = Symbol.for('last_update');
let symbol_last_share = Symbol.for('last_share');
let keyIndex = 0;

function hasDesc(key) {
    return descriptors[key] ? true : false;
}
function setKey(index, key) {
    keyToIndex.set(key, index);
    indexToKey.set(index, key);
    keys.push(index, key);
    keysQueue.push(index, key);
}
function setKeys(array) {
    if (!array) {return;}
    for (let i = 0; i < array.length; i += 2) {
        setKey(array[i], array[i + 1]);
    }
}
function getKey(index) {
    return indexToKey.get(index);
}
function getKeyIndex(key) {
    if (!keyToIndex.has(key)) {
        setKey(++keyIndex, key);
    }
    return keyToIndex.get(key);
}

function pack(key, data) {
    return msgpack.pack([key, data]);
}
function unpack(datapack) {
    const data = msgpack.unpack(new Uint8Array(datapack));
    return { key: data[0], data: data[1] };
}
function encode(key, source, full, partial, ignoreUndefined = false) {
    symbol_last_update = Symbol.for('last_update');
    symbol_last_share = Symbol.for('last_share');
    if (!full) {full = [];}
    let changes = 0;
    let changesCount = 0;
    const desc = descriptors[key];
    if (partial) {partial.length = desc.length + 1;}
    for (let i = 0; i < desc.length; i++) {
        const property = desc[i][0];
        const type = desc[i][1];
        let val = desc[i][2] ? source[desc[i][2]] : source[property];
        let skip = false;
        let force = false;
        if (ignoreUndefined && typeof val === 'undefined') {skip = true;}
        if (!skip) {
            switch (type) {
            case 'key':
                val = getKeyIndex(val);
                break;
            case 'queue':
                if (val.length) {
                    val = [].concat(val);
                    source[property].length = 0;
                } else {
                    skip = true;
                }
                break;
            case 'bool':
                val = Boolean(val);
                break;
            case 'int':
                val = val | 0;
                break;
            case 'float':
                val = val * 100 | 0;
                break;
            case 'sfloat':
                val = val * 10 | 0;
                break;
            case 'object':
                if ((val[symbol_last_update] | 0) !== val[symbol_last_share]) {
                    val[symbol_last_update] = val[symbol_last_update] | 0;
                    val[symbol_last_share] = val[symbol_last_update];
                    force = true;
                } else {
                    skip = true;
                }
                break;
            default:
                break;
            }
        }
        if (!skip && (force || (full[i] !== val || type === 'always'))) {
            full[i] = val;
            if (partial) {partial[changesCount + 1] = val;}
            changes = changes | Math.pow(2, i);
            changesCount++;
        }
    }
    if (partial) {
        partial[0] = changes;
        partial.length = changesCount + 1;
    }
    return partial || full;
}
function decode(key, data, partial) {
    const properties = descriptors[key];
    if (typeof properties === 'undefined') {
        debug.logger.warn(`Undefined properties in decode \n ${JSON.stringify(key)}`);
        return;
    }
    const result = {};
    if (partial) {
        const changes = data[0];
        let index = 1;
        for (let i = 0; i < properties.length; i++) {
            if (changes >= 0 && !(changes & Math.pow(2, i))) {continue;}
            const property = properties[i][0];
            const type = properties[i][1];
            let value = data[index];
            switch (type) {
            case 'key':
                value = getKey(value);
                break;
            case 'float':
                value /= 100;
                break;
            case 'sfloat':
                value /= 10;
                break;
            }
            result[property] = value;
            index++;
            if (index >= data.length) {break;}
        }
    } else {
        for (let i = 0; i < data.length; i++) {
            const property = properties[i][0];
            const type = properties[i][1];
            let value = data[i];
            switch (type) {
            case 'key':
                value = getKey(value);
                break;
            case 'float':
                value /= 100;
                break;
            case 'sfloat':
                value /= 10;
                break;
            }
            result[property] = value;
        }
    }
    return result;
}

setKeys(sharer_data.keys);
module.exports = {
    hasDesc: hasDesc,
    getKey: getKey,
    getKeyIndex: getKeyIndex,
    pack: pack,
    unpack: unpack,
    encode: encode,
    decode: decode,
};
