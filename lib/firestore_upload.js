"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("./firebase");
//import firebase_tools from 'firebase-tools' ;
const test_db_1 = require("../db/test_db");
const record_type_1 = require("./record_type");
const firebase_tools = require('firebase-tools');
function recursiveDelete(done) {
    let mapper = (x) => {
        return firebase_tools.firestore.delete(x.toString(), {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true
        })
            .catch(error => {
            console.log("---- error", error);
            return Promise.resolve();
        });
    };
    return Promise.all(record_type_1.RecordType.values.map(mapper))
        .then(() => done());
}
exports.recursiveDelete = recursiveDelete;
function uploadSeedData(db, fix) {
    var fixtures;
    if (!db)
        db = firebase_1.LocalApp.getInstance().firestore();
    if (test_db_1.TestDB.getKeys() === undefined) {
        try {
            fixtures = new test_db_1.TestDB(fix).fixtures;
        }
        catch (error) {
            console.error(error);
        }
    }
    else {
        test_db_1.initFixtures(fix);
        fixtures = test_db_1.TestFixtures;
    }
    var promises = [];
    for (var _i = 0, _a = fixtures.keys(); _i < _a.length; _i++) {
        var key = _a[_i];
        let data = fixtures.get(key);
        promises.push(db.doc(key).set(data));
    }
    return Promise.all(promises);
}
exports.uploadSeedData = uploadSeedData;
function deleteSeedData(db) {
    if (!db)
        db = firebase_1.LocalApp.getInstance().firestore();
    var fixtures = test_db_1.TestFixtures;
    var promises = [];
    for (var _i = 0, _a = fixtures.keys; _i < _a.length; _i++) {
        var key = _a[_i];
        promises.push(db.doc(key).delete());
    }
    return Promise.all(promises);
}
exports.deleteSeedData = deleteSeedData;
function deleteCollection(db, collectionPath, batchSize) {
    var collectionRef = db.collection(collectionPath);
    var query = collectionRef.orderBy('__name__').limit(batchSize);
    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
    });
}
exports.deleteCollection = deleteCollection;
function deleteQueryBatch(db, query, batchSize, resolve, reject) {
    query.get()
        .then((snapshot) => {
        // When there are no documents left, we are done
        if (snapshot.size === 0) {
            return 0;
        }
        // Delete documents in a batch
        var batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        return batch.commit().then(() => {
            return snapshot.size;
        });
    }).then((numDeleted) => {
        if (numDeleted === 0) {
            resolve();
            return;
        }
        // Recurse on the next process tick, to avoid
        // exploding the stack.
        process.nextTick(() => {
            deleteQueryBatch(db, query, batchSize, resolve, reject);
        });
    })
        .catch(reject);
}
