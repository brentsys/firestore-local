import { IDBGroupConfig } from "./firebase";
import * as admin from 'firebase-admin';
import { fake, Query, QueryOrder } from './local-firestore';
import { DocumentData, Timestamp } from "@google-cloud/firestore";
import { AuthError } from './auth_error';
import { validate } from "class-validator";
import { RecordType } from "./record_type";


type CollectionReference = fake.CollectionReference | admin.firestore.CollectionReference;
export type DocReference = fake.DocumentReference | admin.firestore.DocumentReference;

export interface ModelCreator<Q extends RecordModel> {
    recordType(): RecordType
    new(type?: RecordType, reference?: DocumentPath | RecordModel): Q
}

export interface DataModel extends admin.firestore.DocumentData {
    id: string | undefined
}

export class RecordAction<Q extends RecordModel> {
    private config: IDBGroupConfig
    debug: number;
    documentPath: DocumentPath
    constructor(readonly creator: ModelCreator<Q>, reference?: DocumentPath | Q) {
        if(reference instanceof DocumentPath) this.documentPath = reference
        if(reference instanceof RecordModel) this.documentPath = reference.getDocumentPath()
        this.debug = 0
    }

    setData(data: DataModel): Promise<Q> {
        let obj = this.setSyncData(data)
        return Promise.resolve(obj)
    }

    newRecord(): Q {
        return new this.creator(this.creator.recordType(), this.documentPath)
    }

    setSyncData(data: DataModel): Q {
        let base = this.newRecord()
        base.assign(data);
        return base
    }

    setConfig(cfg: IDBGroupConfig): RecordAction<Q> {
        this.config = cfg
        if(cfg.debug !== undefined) this.debug = cfg.debug
        return this
    }

    getConfig(): IDBGroupConfig{
        return this.config
    }

    getCollection(cfg?: IDBGroupConfig): CollectionReference {
        if(cfg !== undefined) this.setConfig(cfg)
        return this.newRecord().collection(this.config)
    }

    add(data: DocumentData, cfg?: IDBGroupConfig): Promise<Q>{
        //data.id = "new"
        let rec = this.setSyncData(data as DataModel)
        return rec.save(cfg)
    }

    find(queries: Query[], order?: QueryOrder): Promise<Q> {
        let collRef = this.getCollection() as any
        let recordAction = this
        for (var query of queries) {
            let { field, comp, value } = query
            collRef = collRef.where(field, comp, value)
        }
        if(order !== undefined) {
            collRef.orderBy(order.fieldPath, order.directionStr)
        }
        if(this.debug >0) console.log(`[debug-${this.debug}]collRef =>`, collRef)
        return collRef
            .get()
            .then(function (querySnapshot) {
                if (querySnapshot.empty) return AuthError.reject('Not Found', 404);
                var doc = querySnapshot.docs[0];
                return recordAction.fromDocRef(doc)
            });
    }

    fromDocRef(docRef): Promise<Q> {
        var data = docRef.data();
        data.id = docRef.id
        let record = this.setSyncData(data)
        return Promise.resolve(record)
    };


    findAll(queries: Query[] = [], order?: QueryOrder): Promise<Q[]> {
        let rm = this;
        var qs = this.getCollection() as any
        for (var query of queries) {
            let { field, comp, value } = query
            if(this.debug > 2) console.log(`[debug-${this.debug}]`,"field =>", field, "(",typeof field,") - value =>", value, "(", typeof value, ")")
            qs = qs.where(field, comp, value);
        }
        if(order !== undefined) {
            qs.orderBy(order.fieldPath, order.directionStr)
        }
        let recordAction = this
        if(this.debug > 0) console.log(`[debug-${this.debug}]`,"qs =>", qs)
        return qs
            .get()
            .then(function (querySnapshot) {
                if(rm.debug > 1) console.log(`[debug-${rm.debug}]`,"found ", querySnapshot.docs.length, "elements")
                var result: Promise<RecordModel>[] = [];
                for (var i = 0; i < querySnapshot.docs.length; i++) {
                    var doc = querySnapshot.docs[i];
                    let obj = recordAction.fromDocRef(doc)
                    result.push(obj);
                }
                return Promise.all(result);
            });
    };

    findById(value): Promise<Q> {
        let docRef = this.getCollection().doc(value) as any
        return docRef.get()
            .then(doc => {
                if (doc.exists) {
                    return this.fromDocRef(doc)
                } else {
                    return Promise.reject(new Error('Not found'))
                }
            })
    };

}

export interface IDocumentPath {
    id: string
    collectionPath: string[]
}

export class DocumentPath implements IDocumentPath {
    constructor(public id: string, public collectionPath: string[]) {
    }

    getParentDocumentPath(): DocumentPath | undefined {
        if(this.collectionPath.length < 3 ) return undefined
        return new DocumentPath(this.collectionPath.slice(-2,-1)[0], this.collectionPath.slice(0, -2))
    }

    subDocumentPath(subDocPath: DocumentPath): DocumentPath {
        let collPath = this.collectionPath.concat([this.id]).concat(subDocPath.collectionPath)
        return new DocumentPath(subDocPath.id, collPath)
    }

    getCollectionReference(cfg: IDBGroupConfig): CollectionReference {
        var db = cfg.localApp.firestore()
        let collRef = db.collection(this.collectionPath[0])
        let loop = (this.collectionPath.length - 1) / 2
        for (var i = 0; i < loop; i++) {
            let idx = 2 * i + 1
            collRef = collRef.doc(this.collectionPath[idx]).collection(this.collectionPath[idx + 1])
        }
        return collRef
    }

    getDocumentRef(cfg: IDBGroupConfig): DocReference {
        return this.getCollectionReference(cfg).doc(this.id)
    }

    getRecordModel<Q extends RecordModel, T extends ModelCreator<Q>>(cfg: IDBGroupConfig, creator: T): Promise<Q> {
        let record = new creator(creator.recordType())
        return (this.getDocumentRef(cfg) as any ).get()
            .then(docRef => {
                if(!docRef.exists) return Promise.reject(new Error("Internal Error - invalid document"))
                let data = docRef.data()
                data.id = this.id
                data.collectionPath = this.collectionPath
                record.assign(data)
                return Promise.resolve(record)
            })
    }
}

export abstract class RecordModel {

    createdAt: Timestamp
    id: string | undefined
    private errors: string[] = []
    private collectionPath: string[]

    protected static transient: string[] = ["errors", "collectionPath"]

    constructor(readonly modelType: RecordType, docModel?: DocumentPath | RecordModel, ...other: any) {
        let table = modelType.toString().split("::")[0]
        if (docModel == undefined) {
            this.collectionPath = [table]
        } else {
            let documentPath: DocumentPath
            if(docModel instanceof DocumentPath){
                documentPath = docModel
            }
            if(docModel instanceof RecordModel) {
                documentPath = docModel.getDocumentPath()
            }
            this.collectionPath = documentPath.collectionPath.concat([documentPath.id, table])
        }
    }

    protected getTransientSet(): string[] {
        return RecordModel.transient
    }

    getCollectionPath(): string[] {
        return this.collectionPath
    }

    collection(cfg: IDBGroupConfig): CollectionReference {
        return this.getDocumentPath().getCollectionReference(cfg)
    }

    getDocumentRef(cfg: IDBGroupConfig): DocReference {
        return this.getDocumentPath().getDocumentRef(cfg)
    }

    getDocumentPath(): DocumentPath {
        if(this.collectionPath === undefined) this.collectionPath = []
        return new DocumentPath(this.id, this.collectionPath)
    }

    save<Q extends RecordModel>(cfg: IDBGroupConfig, id?: string): Promise<Q> {
        var data = this.data();
        if (this.id == undefined || this.id === "new") {
            return this.newRecord(data, cfg)
        } else {
            return this.updateData(data, cfg)
        }
    }

    set(cfg: IDBGroupConfig, data: DocumentData): Promise<void>{
        return (this.getDocumentRef(cfg) as any).set(data)
    }

    validate(model: any): Promise<any> {
        return validate(model)
            .then(errors => {
                if (errors.length > 0) {
                    let msg = errors.map(err => Object.keys(err.constraints).map(key => err.constraints[key]).join(", ")).join(", ")
                    return Promise.reject(new Error(msg))
                }
                return Promise.resolve(model)
            })
    }

    data(): admin.firestore.DocumentData {
        let attributes = Object.keys(this)
        let reducer = (acc, key) => {
            if (this.getTransientSet().indexOf(key) < 0) acc[key] = this[key]
            return acc
        }
        let result = attributes.reduce(reducer, {})
        return result
    }

    delete(cfg: IDBGroupConfig): Promise<any> {
        let record = this
        let docRef = this.collection(cfg).doc(this.id) as any
        return this.beforeDelete(cfg)
            .then(() => {
                return docRef.delete()
            })
            .then(res => {
                return record.afterDelete(cfg, res)
            })
    }

    reload<T extends RecordModel>(cfg: IDBGroupConfig): Promise<T> {
        return (this.getDocumentRef(cfg) as any).get()
            .then(docRef => {
                if(!docRef.exists) return Promise.reject(new Error("Record not found"))
                this.assign(docRef.data())
                return Promise.resolve(this)
            })
    }

    assign(data: DataModel | DocumentData) {
        for (var key of Object.keys(data)) {
            this[key] = data[key]
        }
        return
    }

    protected beforeCreate(cfg: IDBGroupConfig, data: DocumentData): Promise<DocumentData> {
        return Promise.resolve(data)
    }

    protected beforeUpdate(cfg: IDBGroupConfig, data: DocumentData): Promise<DocumentData> {
        return Promise.resolve(data)
    }

    protected beforeDelete(cfg: IDBGroupConfig): Promise<RecordModel> {
        return Promise.resolve(this)
    }

    protected afterCreate<Q extends RecordModel>(cfg: IDBGroupConfig): Promise<Q> {
        let result = (this as any) as Q
        return Promise.resolve(result)
    }

    protected afterUpdate<Q extends RecordModel>(cfg: IDBGroupConfig): Promise<Q> {
        let result = (this as any) as Q
        return Promise.resolve(result)
    }

    protected afterDelete(cfg: IDBGroupConfig, result: any): Promise<any> {
        return Promise.resolve(result)
    }

    protected setRecordId(): string | undefined{
        return undefined
    }



    updateData<Q extends RecordModel>(data: DocumentData, cfg: IDBGroupConfig): Promise<Q> {
        let collection = this.collection(cfg)
        let model = this
        let newData: DocumentData
        return this.beforeUpdate(cfg, data)
            .then(xData => {
                newData = xData
                this.assign(newData)
                model = this
                return Promise.resolve(model)
            })
            .then(this.validate)
            .then(() => {
                let docRef = collection.doc(this.id) as any
                return docRef.update(newData)
            })
            .then(() => model.afterUpdate<Q>(cfg))
    }


    protected newRecord<Q extends RecordModel>(data: DocumentData, cfg: IDBGroupConfig): Promise<Q> {
        data.createdAt = Timestamp.now();
        let coll = this.collection(cfg) as any
        let id: string
        return this.beforeCreate(cfg, data)
            .then(data => {
                this.assign(data)
                return this.validate(this)
            })
            .then(model => {
                id = this.setRecordId()
                if(id ===  undefined) return coll.add(model.data())
                let doc = coll.doc(id)
                return coll.doc(id).set(model.data())
            })
            .then(docRef => {
                this.id = (id === undefined) ? docRef.id : id
                return this.afterCreate<Q>(cfg)
            })
    }
}

export interface IdRecordModel {
    id: string
    collection(cfg: IDBGroupConfig): CollectionReference
    getCollectionPath(): string[]
}
