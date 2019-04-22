"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const local_firestore_1 = require("./local-firestore");
const DEFAULT = "default";
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
    static setServiceConfig(scfg, name) {
        if (name === undefined)
            name = DEFAULT;
        LocalApp.serviceConfig[name] = scfg;
    }
    static setInstance(inst, name) {
        if (name === undefined)
            name = DEFAULT;
        LocalApp.service[name] = inst;
    }
    static getInstance(name) {
        if (name === undefined)
            name = DEFAULT;
        return LocalApp.service[name];
    }
    static getDbGroup(debug, name) {
        if (name === undefined)
            name = DEFAULT;
        return {
            localApp: LocalApp.getInstance(name),
            getDatabase: LocalApp.getInstance(name).firestore,
            debug: debug
        };
    }
    static init(sCfg, fix, name) {
        if (LocalApp.getInstance(name) !== undefined)
            throw new Error("Service already initialized");
        LocalApp.setServiceConfig(sCfg, name);
        LocalApp.setInstance(LocalApp.makeLocalApp(fix, name), name);
    }
    static makeLocalApp(fix, name) {
        if (name === undefined)
            name = DEFAULT;
        if (name === DEFAULT) {
            if (process.env.NODE_ENV == 'production') {
                /*
                * use the code below when deplying to GAE
                */
                let app = admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    databaseURL: LocalApp.serviceConfig[name].prodDatabaseUrl
                });
                return new LocalApp(app.firestore());
            }
            else {
                if (process.env.DB_REPO == 'remote') {
                    let serviceAccount = require(LocalApp.serviceConfig[name].localCredentialsPath);
                    var defaultAppConfig = {
                        credential: admin.credential.cert(serviceAccount),
                        databaseURL: LocalApp.serviceConfig[name].devDatabaseUrl
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
        else {
            let serviceAccount = require(LocalApp.serviceConfig[name].localCredentialsPath);
            let app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: LocalApp.serviceConfig[name].prodDatabaseUrl
            });
            return new LocalApp(app.firestore());
        }
    }
    firestore() {
        return this._db;
    }
    auth() {
        return this._auth;
    }
}
LocalApp.serviceConfig = {};
LocalApp.service = {};
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
