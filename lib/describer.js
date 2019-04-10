"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_upload_1 = require("./firestore_upload");
const chai = require("chai");
const chaiHttp = require("chai-http");
const __1 = require("..");
const fixtures_1 = require("../test/fixtures");
const local_firestore_1 = require("./local-firestore");
const record_type_1 = require("./record_type");
chai.use(chaiHttp);
let collections = record_type_1.RecordType.values.map(x => x.toString());
function deleteRecursively(done) {
    let promises = collections.map(firestore_upload_1.recursiveDelete);
    Promise.all(promises)
        .then(() => done());
}
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
        if (options !== undefined) {
            before(function () {
                if (options.before !== undefined)
                    options.before();
            });
            after(function (done) {
                if (options.after !== undefined) {
                    options.after();
                    if (process.env.DB_REPO === "remote")
                        deleteRecursively(done);
                }
            });
        }
        beforeEach(function (done) {
            if (options !== undefined && options.beforeEach != undefined)
                options.beforeEach.call(this);
            if (process.env.DB_REPO !== "remote")
                return done();
            firestore_upload_1.uploadSeedData(db, fixtures_1.default)
                .then(() => done());
        });
        afterEach(function (done) {
            if (options !== undefined && options.afterEach != undefined)
                options.afterEach.call(this);
            if (process.env.DB_REPO !== "remote")
                return reInit(done);
            let promises = collections.map(coll => firestore_upload_1.deleteCollection(db, coll, 500));
            Promise.all(promises)
                .then(() => done());
        });
        fn();
    });
}
exports.desc = desc;
