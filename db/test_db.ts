import { TSMap } from "typescript-map"
import { Fixture } from '../lib/local-firestore';

export class TestDB {
    fixtures: TSMap<string, any>
    static _keys: string[]
    static _values: Fixture[]

    static getKeys(): string[] {
        return TestDB._keys
    }

    static getKey(id: number): string {
        return TestDB._keys[id]
    }

    static getValue(id: number): Fixture {
        return TestDB._values[id]
    }

    constructor(fix : Fixture[]) {
        this.fixtures = new TSMap<string, any>();
        fix.map(el => merge.call(this, el))
        if (TestDB._keys === undefined) TestDB._keys = this.fixtures.keys()
        if (TestDB._values === undefined) TestDB._values = this.fixtures.values()
    }
}

function merge(data: Fixture): void {
    for (let key of Object.keys(data)) {
        let subData = data[key]
        adapt.call(this, key, subData)
    }
}

function adapt(path: string, data: Fixture) {
    let keysFn = data.keysFn
    delete data.keysFn
    for (let key of Object.keys(data)) {
        let altKey = key
        if (keysFn !== undefined) {
            altKey = keysFn.call(data[key])
        }
        let includes = data[key].includes
        delete data[key].includes
        let newKey = [path, altKey].join("/")
        this.fixtures.set(newKey, data[key]);

        if (includes !== undefined) {
            for (let k2 of Object.keys(includes)) {
                let subData = {}
                let subkey = [path, altKey, k2].join("/")
                subData[subkey] = includes[k2]
                merge.call(this, subData)
            }
        }
    }
}
export const TestFixtures = new TSMap<string, any>()

export function initFixtures(fix : Fixture[]) {
    if (TestDB.getKeys() === undefined) new TestDB(fix)
    for (let i = 0; i < TestDB.getKeys().length; i++) {
        let key = TestDB.getKey(i)
        TestFixtures.set(key, Object.assign({}, TestDB.getValue(i)))
    }
}


export function getTestRecord(docPath: string[], fix? : Fixture[], ): Fixture {
    if(fix === undefined) fix = []
    if (TestFixtures.length == 0) initFixtures(fix)
    let path = docPath.join("/")
    let value = TestFixtures.get(path)
    value.id = docPath.slice(-1)[0]
    return value
}
