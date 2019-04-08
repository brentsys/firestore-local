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
    static init(sCfg, fix) {
        if (LocalApp.instance !== undefined)
            throw new Error("Service already initialized");
        this.serviceConfig = sCfg;
        this.instance = this.makeLocalApp(fix);
    }
    static makeLocalApp(fix) {
        if (process.env.NODE_ENV == 'production') {
            /*
            * use the code below when deplying to GAE
            */
            let app = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: this.serviceConfig.prodDatabaseUrl
            });
            return new LocalApp(app.firestore());
        }
        else {
            if (process.env.DB_REPO == 'remote') {
                var serviceAccount = require(this.serviceConfig.localCredentialsPath);
                var defaultAppConfig = {
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: this.serviceConfig.devDatabaseUrl
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
