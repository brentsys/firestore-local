import * as admin from 'firebase-admin';
import { fake, LocalDatabase, Fixture } from './local-firestore';
import * as Firestore from '@google-cloud/firestore';
import { TSMap } from 'typescript-map';

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

    static getDbGroup(debug? : number): IDBGroupConfig {
        return {
            localApp: LocalApp.instance,
            getDatabase: LocalApp.getInstance().firestore,
            debug: debug
        }
    }
    static init(sCfg, fix: Fixture[]): void {
        if (LocalApp.instance !== undefined) throw new Error("Service already initialized")
        LocalApp.serviceConfig = sCfg
        LocalApp.instance = LocalApp.makeLocalApp(fix)
    }

    static makeLocalApp(fix: Fixture[]): LocalApp {
        if (process.env.NODE_ENV == 'production') {
            /*
            * use the code below when deplying to GAE
            */
            let app = admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                databaseURL: LocalApp.serviceConfig.prodDatabaseUrl
            });
            return new LocalApp(app.firestore())
        } else {
            if (process.env.DB_REPO == 'remote') {
                var serviceAccount = require(LocalApp.serviceConfig.localCredentialsPath);
    
                var defaultAppConfig = {
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: LocalApp.serviceConfig.devDatabaseUrl
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

export function seedFixtures(cfg: IDBGroupConfig, fix: TSMap<string, any>) : Promise<void>{
    if(LocalApp.getInstance() === undefined) LocalApp.init(cfg, [])
    let mapper = (key: string) => {
        let array = key.split("/")
        if(array.length % 2 > 0) return Promise.reject(new Error("Key should have even paths"))
        let coll = array.slice(0, -1).join("/")
        let id = array.slice(-1).join("/")
        return (cfg.getDatabase().collection(coll).doc(id) as any).set(fix.get(key), {merge: true})
            .then(()=> Promise.resolve())
    }
    return Promise.all(fix.keys().map(mapper)).then(()=> Promise.resolve())
}


