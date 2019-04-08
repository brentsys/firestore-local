import { uploadSeedData, recursiveDelete, deleteCollection } from "./firestore_upload"

import { expect } from 'chai';
import { RecordModel } from "./record_model";
import chai = require('chai')
import chaiHttp = require('chai-http');
import { LocalApp } from "..";
import fix, { serviceConfig } from "../test/fixtures";
import { LocalDatabase } from "./local-firestore";
import { RecordType } from "./record_type";

LocalApp.init(serviceConfig, fix)
let db = LocalApp.getInstance().firestore()

chai.use(chaiHttp);

function reInit(fn: () => any): void {
    if (db instanceof LocalDatabase) {
        db.reset()
    }
    fn()
}
let collections = RecordType.values.map(x => x.toString())

function deleteRecursively(done) {
    let promises = collections.map(recursiveDelete)
    Promise.all(promises)
        .then(() => done())
}

type Fn = () => any

export interface DescriberOptions {
    before?: Fn
    after?: Fn
    beforeEach?: Fn
    afterEach?: Fn
}

export function desc<Q extends RecordModel>(title: string, fn: () => any, options?: DescriberOptions) {

    if(RecordType.values.length === 0) console.log("\nRecordTypes.values does not seems to be set yet!..")

    describe(title, function () {

        if(options!== undefined){
            before(function () {
                if (options.before !== undefined) options.before()
            })
            after(function (done) {
                if (options.after !== undefined) options.after()
                deleteRecursively(done)
            })
        }

        beforeEach(function (done) {
            if(options !== undefined && options.beforeEach != undefined) options.beforeEach.call(this)
            if (process.env.DB_REPO !== "remote") return done()
            uploadSeedData(db, fix)
                .then(() => done())
        })
        afterEach(function (done) {
            if(options !== undefined && options.afterEach != undefined) options.afterEach.call(this)
            if (process.env.DB_REPO !== "remote") return reInit(done)
            let promises = collections.map(coll => deleteCollection(db, coll, 500))
            Promise.all(promises)
                .then(() => done())
        })
        fn()
    })
}
