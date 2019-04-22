"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const local_firestore_1 = require("./local-firestore");
//----------------------------------
//
// HEAVYLY DEPENDING ON TYPE OF PROCESS
let localApp;
class LocalAuth {
    constructor(db) {
        this.db = db;
    }
    verifyIdToken(token, checkRevoked) {
        return Promise.reject(new Error("verifyIdToken not implemented"));
    }
}
exports.LocalAuth = LocalAuth;
class LocalApp {
    constructor(_db) {
        this._db = _db;
        this._auth = new LocalAuth(_db);
    }
    static getInstance() {
        return LocalApp.instance;
    }
    static getDbGroup(debug) {
        return {
            localApp: LocalApp.instance,
            getDatabase: LocalApp.getInstance().firestore,
            debug: debug
        };
    }
    static init(sCfg, fix) {
        if (LocalApp.instance !== undefined)
            throw new Error("Service already initialized");
        LocalApp.serviceConfig = sCfg;
        LocalApp.instance = LocalApp.makeLocalApp(fix);
    }
    static makeLocalApp(fix) {
        if (process.env.NODE_ENV == 'production') {
            /*
            * use the code below when deplying to GAE
            */
            let app = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: LocalApp.serviceConfig.prodDatabaseUrl
            });
            return new LocalApp(app.firestore());
        }
        else {
            if (process.env.DB_REPO == 'remote') {
                var serviceAccount = require(LocalApp.serviceConfig.localCredentialsPath);
                var defaultAppConfig = {
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: LocalApp.serviceConfig.devDatabaseUrl
                };
                // Initialize the default app
                return new LocalApp(admin.initializeApp(defaultAppConfig).firestore());
            }
            else {
                let localFirestore = new local_firestore_1.LocalDatabase(fix);
                return new LocalApp(localFirestore);
            }
        }
    }
    firestore() {
        return this._db;
    }
    auth() {
        return this._auth;
    }
}
exports.LocalApp = LocalApp;
function seedFixtures(db, fix) {
    let mapper = (key) => {
        let array = key.split("/");
        if (array.length % 2 > 0)
            return Promise.reject(new Error("Key should have even paths"));
        let coll = array.slice(0, -1).join("/");
        let id = array.slice(-1).join("/");
        return db.collection(coll).doc(id).set(fix.get(key), { merge: true })
            .then(res => {
            console.log("set result:", res);
            return Promise.resolve();
        });
    };
    return Promise.all(fix.keys().map(mapper)).then(() => Promise.resolve());
}
exports.seedFixtures = seedFixtures;
