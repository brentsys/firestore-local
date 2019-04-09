"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_map_1 = require("typescript-map");
class TestDB {
    static getKeys() {
        return TestDB._keys;
    }
    static getKey(id) {
        return TestDB._keys[id];
    }
    static getValue(id) {
        return TestDB._values[id];
    }
    constructor(fix) {
        this.fixtures = new typescript_map_1.TSMap();
        fix.map(el => merge.call(this, el));
        if (TestDB._keys === undefined)
            TestDB._keys = this.fixtures.keys();
        if (TestDB._values === undefined)
            TestDB._values = this.fixtures.values();
    }
}
exports.TestDB = TestDB;
function merge(data) {
    for (let key of Object.keys(data)) {
        let subData = data[key];
        adapt.call(this, key, subData);
    }
}
function adapt(path, data) {
    let keysFn = data.keysFn;
    delete data.keysFn;
    for (let key of Object.keys(data)) {
        let altKey = key;
        if (keysFn !== undefined) {
            altKey = keysFn.call(data[key]);
        }
        let includes = data[key].includes;
        delete data[key].includes;
        let newKey = [path, altKey].join("/");
        this.fixtures.set(newKey, data[key]);
        if (includes !== undefined) {
            for (let k2 of Object.keys(includes)) {
                let subData = {};
                let subkey = [path, altKey, k2].join("/");
                subData[subkey] = includes[k2];
                merge.call(this, subData);
            }
        }
    }
}
exports.TestFixtures = new typescript_map_1.TSMap();
function initFixtures(fix) {
    if (TestDB.getKeys() === undefined)
        new TestDB(fix);
    for (let i = 0; i < TestDB.getKeys().length; i++) {
        let key = TestDB.getKey(i);
        exports.TestFixtures.set(key, Object.assign({}, TestDB.getValue(i)));
    }
}
exports.initFixtures = initFixtures;
function getTestRecord(docPath, fix) {
    if (fix === undefined)
        fix = [];
    if (exports.TestFixtures.length == 0)
        initFixtures(fix);
    let path = docPath.join("/");
    let value = exports.TestFixtures.get(path);
    value.id = docPath.slice(-1)[0];
    return value;
}
exports.getTestRecord = getTestRecord;
