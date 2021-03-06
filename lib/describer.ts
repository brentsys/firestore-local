import { uploadSeedData, recursiveDelete, deleteCollection } from "./firestore_upload"

import { RecordModel } from "./record_model";
import { LocalApp } from "..";
import { LocalDatabase, Fixture } from "./local-firestore";
import { RecordType } from "./record_type";

if (process.env.DB_REPO === "remote" && process.env.GCLOUD_PROJECT === undefined) {
    throw new Error("Please set GCLOUD_PROJECT env.variable to proceed with remote firestore")
}


type Fn = () => any

export interface DescriberOptions {
    before?: Fn
    after?: Fn
    beforeEach?: Fn
    afterEach?: Fn
}

export interface BaseOptions {
    id: number
    skip?: boolean
}

let fix: any

export function setFixtures(_fix: any){
    fix = _fix
}

let noDelete = false

export function noDeleteDatabase(res?: boolean){
    if(res ===  undefined) res = true
    noDelete = res
}
export function desc<Q extends RecordModel>(title: string, fn: () => any, options?: DescriberOptions) {

    let db = LocalApp.getInstance().firestore()
    function reInit(fn: () => any): void {
        if (db instanceof LocalDatabase) {
            db.reset()
        }
        fn()
    }

    if (RecordType.values.length === 0) console.log("\nRecordTypes.values does not seems to be set yet!..")

    describe(title, function () {
        if (options === undefined) options = {}

        before(function () {
            if (options.before !== undefined) options.before.call(this)
        })
        after(function (done) {
            if (options.after !== undefined) {
                options.after.call(this)
            }
            if (process.env.DB_REPO === "remote" && !noDelete) recursiveDelete(done)
            else done()
        })


        beforeEach(function (done) {
            if (options !== undefined && options.beforeEach != undefined) options.beforeEach.call(this)
            if (process.env.DB_REPO !== "remote") return done()
            if(fix === undefined) {
                console.log("fixtures to upload are not yet set!\nUse 'setFixtures' somewhere on top of your test file to set it up");
                return done()
            }
            uploadSeedData(db, fix)
                .then(() => done())
        })
        afterEach(function (done) {
            if (options !== undefined && options.afterEach != undefined) options.afterEach.call(this)
            if (process.env.DB_REPO !== "remote" && !noDelete) return reInit(done)
            let promises = RecordType.values.map(x => deleteCollection(db, x.toString(), 500))
            Promise.all(promises)
                .then(() => done())
        })
        fn()
    })
}
