import * as admin from 'firebase-admin';
import { fake, LocalDatabase, Fixture } from './local-firestore';
import * as Firestore from '@google-cloud/firestore';

export type FirestoreType = fake.Database | Firestore.Firestore

export interface ILocalApp {
    auth(): LocalAuth
    firestore(): FirestoreType
}

export interface ServiceConfig {
    prodDatabaseUrl: string
    devDatabaseUrl: string
    localCredentialsPath: string
}

export type FBCollection = admin.firestore.CollectionReference

export interface IDBGroupConfig {
    localApp: LocalApp
    getDatabase(): FirestoreType
    debug?: number
}


//----------------------------------
//
// HEAVYLY DEPENDING ON TYPE OF PROCESS

let localApp: LocalApp

export class LocalAuth {
    constructor(private db: FirestoreType) { }
}


export class LocalApp implements ILocalApp {
    private static instance: LocalApp
    private static serviceConfig: ServiceConfig

    private _auth: LocalAuth
    
    constructor(private _db: FirestoreType) {
        this._auth = new LocalAuth(_db)
    }


    static getInstance(): LocalApp {
        return LocalApp.instance
    }
    static init(sCfg, fix: Fixture[]): void {
        if (LocalApp.instance !== undefined) throw new Error("Service already initialized")
        this.serviceConfig = sCfg
        this.instance = this.makeLocalApp(fix)
    }

    static makeLocalApp(fix: Fixture[]): LocalApp {
        if (process.env.NODE_ENV == 'production') {
            /*
            * use the code below when deplying to GAE
            */
            let app = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: this.serviceConfig.prodDatabaseUrl
            });
            return new LocalApp(app.firestore())
        } else {
            if (process.env.DB_REPO == 'remote') {
                var serviceAccount = require(this.serviceConfig.localCredentialsPath);
    
                var defaultAppConfig = {
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: this.serviceConfig.devDatabaseUrl
                };
                // Initialize the default app
                return new LocalApp(admin.initializeApp(defaultAppConfig).firestore())
    
            } else {
                let localFirestore = new LocalDatabase(fix)
                return new LocalApp(localFirestore)
            }
        }
    }

    firestore(): FirestoreType {
        return this._db
    }
    auth(): LocalAuth {
        return this._auth
    }
}


