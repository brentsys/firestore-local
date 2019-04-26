import { LocalApp } from "./firebase";

//import firebase_tools from 'firebase-tools' ;
import { TestDB, initFixtures, TestFixtures } from '../db/test_db';
import { Fixture } from './local-firestore';
import { RecordType } from "./record_type";

const firebase_tools = require('firebase-tools');

export function recursiveDelete(done): Promise<any[]> {
  let mapper = (x: RecordType) => {
    return firebase_tools.firestore.delete(x.toString(), {
      project: process.env.GCLOUD_PROJECT,
      recursive: true,
      yes: true
    })
    .catch(error => {
      console.log("---- error", error)
      return Promise.resolve()
    })
  } 
  return Promise.all(RecordType.values.map(mapper))
    .then(()=> done())
}


export function uploadSeedData (db, fix: Fixture[]) {
  var fixtures;
  if (!db) db = LocalApp.getInstance().firestore()
  if (TestDB.getKeys() === undefined) {
    try {
      fixtures = new TestDB(fix).fixtures;      
    } catch (error) {
      console.error(error)
    }
  } else {
    initFixtures(fix);
    fixtures = TestFixtures;
  }
  var promises = [];
  for (var _i = 0, _a = fixtures.keys(); _i < _a.length; _i++) {
    var key = _a[_i];
    let data = fixtures.get(key);
    promises.push(db.doc(key).set(data));
  }
  return Promise.all(promises);
}

export function deleteSeedData (db) {
  if (!db) db = LocalApp.getInstance().firestore()
  var fixtures = TestFixtures;
  var promises = [];
  for (var _i = 0, _a = fixtures.keys; _i < _a.length; _i++) {
    var key = _a[_i];
    promises.push(db.doc(key).delete());
  }
  return Promise.all(promises);
}

export function deleteCollection (db, collectionPath, batchSize) {
  var collectionRef = db.collection(collectionPath);
  var query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

function deleteQueryBatch (db, query, batchSize, resolve, reject) {
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
