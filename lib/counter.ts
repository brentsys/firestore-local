import { IDBGroupConfig, FirestoreType } from "./firebase";

const DEFAULT_SHARDS = 8

let db: FirestoreType

function counterReference(recType) {
  return db.collection("counters").doc(recType);
}

function getCount (ref): Promise<number> {
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
function incrementCounter (db, ref, numShards) {
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

function createCounter(ref, nb):Promise<void>{
  return ref.get()
    .then(snap => {
      if(snap.exists) return Promise.resolve()
      // console.log("creating counter ......", ref.id)
      let doc: any
      //this is a dirty hack for a poor local implementation of firestore
      if(snap.ref === undefined){
        doc = snap
      } else {
        doc = snap.ref
      }
      var batch = db.batch();
      batch.set(doc, {num_shards: nb})
      for(let i=0; i < nb; i++){
        let shardRef = doc.collection("shards").doc(i.toString())
        batch.set(shardRef, {count: 0})
      }
      return batch.commit()
    })
}

function _nextIndex (ref, numShards?: number) {
  if(numShards === undefined) numShards = DEFAULT_SHARDS
  return createCounter(ref, numShards)
    .then(()=> incrementCounter(db, ref, numShards))
    .then(() => {
      return getCount(ref);
    });
}

function nextIndex(cfg: IDBGroupConfig, recType: string, nb?: number) {
  db = cfg.localApp.firestore()
  var rf = counterReference(recType);
  return _nextIndex(rf, nb);
};

export default {
  nextIndex: nextIndex
};
