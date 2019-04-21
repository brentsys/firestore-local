"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_upload_1 = require("./firestore_upload");
const __1 = require("..");
const local_firestore_1 = require("./local-firestore");
const record_type_1 = require("./record_type");
if (process.env.DB_REPO === "remote" && process.env.GCLOUD_PROJECT === undefined) {
    throw new Error("Please set GCLOUD_PROJECT env.variable to proceed with remote firestore");
}
let fix;
function setFixtures(_fix) {
    fix = _fix;
}
exports.setFixtures = setFixtures;
let noDelete = false;
function noDeleteDatabase(res) {
    if (res === undefined)
        res = true;
    noDelete = res;
}
exports.noDeleteDatabase = noDeleteDatabase;
function desc(title, fn, options) {
    let db = __1.LocalApp.getInstance().firestore();
    function reInit(fn) {
        if (db instanceof local_firestore_1.LocalDatabase) {
            db.reset();
        }
        fn();
    }
    if (record_type_1.RecordType.values.length === 0)
        console.log("\nRecordTypes.values does not seems to be set yet!..");
    describe(title, function () {
        if (options === undefined)
            options = {};
        before(function () {
            if (options.before !== undefined)
                options.before.call(this);
        });
        after(function (done) {
            if (options.after !== undefined) {
                options.after.call(this);
            }
            if (process.env.DB_REPO === "remote" && !noDelete)
                firestore_upload_1.recursiveDelete(done);
            else
                done();
        });
        beforeEach(function (done) {
            if (options !== undefined && options.beforeEach != undefined)
                options.beforeEach.call(this);
            if (process.env.DB_REPO !== "remote")
                return done();
            firestore_upload_1.uploadSeedData(db, fix)
                .then(() => done());
        });
        afterEach(function (done) {
            if (options !== undefined && options.afterEach != undefined)
                options.afterEach.call(this);
            if (process.env.DB_REPO !== "remote" && !noDelete)
                return reInit(done);
            let promises = record_type_1.RecordType.values.map(x => firestore_upload_1.deleteCollection(db, x.toString(), 500));
            Promise.all(promises)
                .then(() => done());
        });
        fn();
    });
}
exports.desc = desc;
