"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_1 = require("./firebase");
const firebase_tools_1 = require("firebase-tools");
const test_db_1 = require("../db/test_db");
function recursiveDelete(path) {
    return firebase_tools_1.default.firestore.delete(path, {
        project: process.env.GCLOUD_PROJECT,
        recursive: true,
        yes: true
    });
}
exports.recursiveDelete = recursiveDelete;
function uploadSeedData(db, fix) {
    var fixtures;
    if (!db)
        db = firebase_1.LocalApp.getInstance().firestore();
    if (test_db_1.TestDB.getKeys() === undefined) {
        fixtures = new test_db_1.TestDB(fix).fixtures;
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
