"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_SHARDS = 8;
let db;
function counterReference(recType) {
    return db.collection("counters").doc(recType);
}
function getCount(ref) {
    // Sum the count of each shard in the subcollection
    return ref.collection('shards').get().then(snapshot => {
        let totalCount = 0;
        snapshot.forEach(doc => {
            totalCount += doc.data().count;
        });
        return Promise.resolve(totalCount);
    });
}
// [START increment_counter]
function incrementCounter(db, ref, numShards) {
    // Select a shard of the counter at random
    const shardId = Math.floor(Math.random() * numShards).toString();
    const shardRef = ref.collection('shards').doc(shardId);
    // Update count in a transaction
    return db.runTransaction(t => {
        return t.get(shardRef).then(doc => {
            const newCount = doc.data().count + 1;
            t.update(shardRef, { count: newCount });
        });
    });
}
// [END increment_counter]
function createCounter(ref, nb) {
    return ref.get()
        .then(snap => {
        if (snap.exists)
            return Promise.resolve();
        // console.log("creating counter ......", ref.id)
        let doc;
        //this is a dirty hack for a poor local implementation of firestore
        if (snap.ref === undefined) {
            doc = snap;
        }
        else {
            doc = snap.ref;
        }
        var batch = db.batch();
        batch.set(doc, { num_shards: nb });
        for (let i = 0; i < nb; i++) {
            let shardRef = doc.collection("shards").doc(i.toString());
            batch.set(shardRef, { count: 0 });
        }
        return batch.commit();
    });
}
function _nextIndex(ref, numShards) {
    if (numShards === undefined)
        numShards = DEFAULT_SHARDS;
    return createCounter(ref, numShards)
        .then(() => incrementCounter(db, ref, numShards))
        .then(() => {
        return getCount(ref);
    });
}
function nextIndex(_db, recType, nb) {
    db = _db;
    var rf = counterReference(recType);
    return _nextIndex(rf, nb);
}
;
exports.Counter = {
    nextIndex: nextIndex
};
