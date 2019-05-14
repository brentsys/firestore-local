import * as admin from 'firebase-admin';
import { fake, LocalDatabase, Fixture } from './local-firestore';
import * as Firestore from '@google-cloud/firestore';
import { TSMap } from 'typescript-map';
import { FullDecoded } from './interfaces/jwt';

const DEFAULT = "default"
export type FirestoreType = fake.Database | Firestore.Firestore

export interface ILocalApp {
    auth(): LocalAuth
    firestore(): FirestoreType
}

export interface ServiceConfig {
    prodDatabaseUrl: string
    devDatabaseUrl: string
    localCredentialsPath: string | object
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
    constructor(protected db: FirestoreType) { }
    verifyIdToken(token: string, checkRevoked?: boolean): Promise<FullDecoded> {
        return Promise.reject(new Error("verifyIdToken not implemented"))
    }
}


export class LocalApp implements ILocalApp {
    private static serviceConfig: {[key: string]: ServiceConfig} = {}
    private static service: {[key: string]: LocalApp} = {}

    private _auth: LocalAuth
    
    constructor(private _db: FirestoreType) {
        this._auth = new LocalAuth(_db)
    }

    private static setServiceConfig(scfg: ServiceConfig, name?: string):void{
        if(name === undefined) name = DEFAULT
        LocalApp.serviceConfig[name] = scfg
    }

    private static setInstance(inst: LocalApp, name?: string):void{
        if(name === undefined) name = DEFAULT
        LocalApp.service[name] = inst
    }


    static getInstance(name?: string): LocalApp {
        if(name === undefined) name = DEFAULT
        return LocalApp.service[name]
    }

    static getDbGroup(debug? : number, name?: string): IDBGroupConfig {
        if(name === undefined) name = DEFAULT
        return {
            localApp: LocalApp.getInstance(name),
            getDatabase: LocalApp.getInstance(name).firestore,
            debug: debug
        }
    }
    static init(sCfg, fix: Fixture[], name?: string): void {
        if (LocalApp.getInstance(name) !== undefined) throw new Error("Service already initialized")
        LocalApp.setServiceConfig(sCfg, name)
        LocalApp.setInstance(LocalApp.makeLocalApp(fix, name), name)
    }

    static makeLocalApp(fix: Fixture[], name?: string): LocalApp {
        if(name === undefined) name = DEFAULT
        let credential = LocalApp.serviceConfig[name].localCredentialsPath
        if(name === DEFAULT){
            if (process.env.NODE_ENV == 'production') {
                /*
                * use the code below when deplying to GAE
                */
                let app = admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    databaseURL: LocalApp.serviceConfig[name].prodDatabaseUrl
                });
                return new LocalApp(app.firestore())
            } else {
                if (process.env.DB_REPO == 'remote') {
        
                    var defaultAppConfig = {
                        credential: admin.credential.cert(credential),
                        databaseURL: LocalApp.serviceConfig[name].devDatabaseUrl
                    };
                    // Initialize the default app
                    return new LocalApp(admin.initializeApp(defaultAppConfig).firestore())
        
                } else {
                    let localFirestore = new LocalDatabase(fix)
                    return new LocalApp(localFirestore)
                }
            }            
        } else {
            let app = admin.initializeApp({
                credential: admin.credential.cert(credential),
                databaseURL: LocalApp.serviceConfig[name].prodDatabaseUrl
            }, name);
            return new LocalApp(app.firestore())
        }

    }

    firestore(): FirestoreType {
        return this._db
    }
    auth(): LocalAuth {
        return this._auth
    }
}

export function seedFixtures(db: FirestoreType, fix: TSMap<string, any>) : Promise<void>{
    let mapper = (key: string) => {
        let array = key.split("/")
        if(array.length % 2 > 0) return Promise.reject(new Error("Key should have even paths"))
        let coll = array.slice(0, -1).join("/")
        let id = array.slice(-1).join("/")
        return (db.collection(coll).doc(id) as any).set(fix.get(key), {merge: true})
            .then(res => {
                console.log("set result:", res)
                return Promise.resolve()
            })
    }
    return Promise.all(fix.keys().map(mapper)).then(()=> Promise.resolve())
}


