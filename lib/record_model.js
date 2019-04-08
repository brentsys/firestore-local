"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firestore_1 = require("@google-cloud/firestore");
const auth_error_1 = require("./auth_error");
const class_validator_1 = require("class-validator");
class RecordAction {
    constructor(creator, reference) {
        this.creator = creator;
        if (reference instanceof DocumentPath)
            this.documentPath = reference;
        if (reference instanceof RecordModel)
            this.documentPath = reference.getDocumentPath();
        this.debug = 0;
    }
    setData(data) {
        let obj = this.setSyncData(data);
        return Promise.resolve(obj);
    }
    newRecord() {
        return new this.creator(this.creator.recordType(), this.documentPath);
    }
    setSyncData(data) {
        let base = this.newRecord();
        base.assign(data);
        return base;
    }
    setConfig(cfg) {
        this.config = cfg;
        if (cfg.debug !== undefined)
            this.debug = cfg.debug;
    }
    getConfig() {
        return this.config;
    }
    getCollection(cfg) {
        if (cfg !== undefined)
            this.setConfig(cfg);
        return this.newRecord().collection(this.config);
    }
    add(data, cfg) {
        //data.id = "new"
        let rec = this.setSyncData(data);
        return rec.save(cfg);
    }
    find(queries, order) {
        let collRef = this.getCollection();
        let recordAction = this;
        for (var query of queries) {
            let { field, comp, value } = query;
            collRef = collRef.where(field, comp, value);
        }
        if (order !== undefined) {
            collRef.orderBy(order.fieldPath, order.directionStr);
        }
        if (this.debug > 0)
            console.log(`[debug-${this.debug}]collRef =>`, collRef);
        return collRef
            .get()
            .then(function (querySnapshot) {
            if (querySnapshot.empty)
                return auth_error_1.AuthError.reject('Not Found', 404);
            var doc = querySnapshot.docs[0];
            return recordAction.fromDocRef(doc);
        });
    }
    fromDocRef(docRef) {
        var data = docRef.data();
        data.id = docRef.id;
        let record = this.setSyncData(data);
        return Promise.resolve(record);
    }
    ;
    findAll(queries = [], order) {
        let rm = this;
        var qs = this.getCollection();
        for (var query of queries) {
            let { field, comp, value } = query;
            if (this.debug > 2)
                console.log(`[debug-${this.debug}]`, "field =>", field, "(", typeof field, ") - value =>", value, "(", typeof value, ")");
            qs = qs.where(field, comp, value);
        }
        if (order !== undefined) {
            qs.orderBy(order.fieldPath, order.directionStr);
        }
        let recordAction = this;
        if (this.debug > 0)
            console.log(`[debug-${this.debug}]`, "qs =>", qs);
        return qs
            .get()
            .then(function (querySnapshot) {
            if (rm.debug > 1)
                console.log(`[debug-${rm.debug}]`, "found ", querySnapshot.docs.length, "elements");
            var result = [];
            for (var i = 0; i < querySnapshot.docs.length; i++) {
                var doc = querySnapshot.docs[i];
                let obj = recordAction.fromDocRef(doc);
                result.push(obj);
            }
            return Promise.all(result);
        });
    }
    ;
    findById(value) {
        let docRef = this.getCollection().doc(value);
        return docRef.get()
            .then(doc => {
            if (doc.exists) {
                return this.fromDocRef(doc);
            }
            else {
                return Promise.reject(new Error('Not found'));
            }
        });
    }
    ;
}
exports.RecordAction = RecordAction;
class DocumentPath {
    constructor(id, collectionPath) {
        this.id = id;
        this.collectionPath = collectionPath;
    }
    getParentDocumentPath() {
        if (this.collectionPath.length < 3)
            return undefined;
        return new DocumentPath(this.collectionPath.slice(-2, -1)[0], this.collectionPath.slice(0, -2));
    }
    subDocumentPath(subDocPath) {
        let collPath = this.collectionPath.concat([this.id]).concat(subDocPath.collectionPath);
        return new DocumentPath(subDocPath.id, collPath);
    }
    getCollectionReference(cfg) {
        var db = cfg.localApp.firestore();
        let collRef = db.collection(this.collectionPath[0]);
        let loop = (this.collectionPath.length - 1) / 2;
        for (var i = 0; i < loop; i++) {
            let idx = 2 * i + 1;
            collRef = collRef.doc(this.collectionPath[idx]).collection(this.collectionPath[idx + 1]);
        }
        return collRef;
    }
    getDocumentRef(cfg) {
        return this.getCollectionReference(cfg).doc(this.id);
    }
    getRecordModel(cfg, creator) {
        let record = new creator(creator.recordType());
        return this.getDocumentRef(cfg).get()
            .then(docRef => {
            if (!docRef.exists)
                return Promise.reject(new Error("Internal Error - invalid document"));
            let data = docRef.data();
            data.id = this.id;
            data.collectionPath = this.collectionPath;
            record.assign(data);
            return Promise.resolve(record);
        });
    }
}
exports.DocumentPath = DocumentPath;
class RecordModel {
    constructor(modelType, docModel, ...other) {
        this.modelType = modelType;
        this.errors = [];
        let table = modelType.toString().split("::")[0];
        if (docModel == undefined) {
            this.collectionPath = [table];
        }
        else {
            let documentPath;
            if (docModel instanceof DocumentPath) {
                documentPath = docModel;
            }
            if (docModel instanceof RecordModel) {
                documentPath = docModel.getDocumentPath();
            }
            this.collectionPath = documentPath.collectionPath.concat([documentPath.id, table]);
        }
    }
    getTransientSet() {
        return RecordModel.transient;
    }
    getCollectionPath() {
        return this.collectionPath;
    }
    collection(cfg) {
        return this.getDocumentPath().getCollectionReference(cfg);
    }
    getDocumentRef(cfg) {
        return this.getDocumentPath().getDocumentRef(cfg);
    }
    getDocumentPath() {
        if (this.collectionPath === undefined)
            this.collectionPath = [];
        return new DocumentPath(this.id, this.collectionPath);
    }
    save(cfg, id) {
        var data = this.data();
        if (this.id == undefined || this.id === "new") {
            return this.newRecord(data, cfg);
        }
        else {
            return this.updateData(data, cfg);
        }
    }
    set(cfg, data) {
        return this.getDocumentRef(cfg).set(data);
    }
    validate(model) {
        return class_validator_1.validate(model)
            .then(errors => {
            if (errors.length > 0) {
                let msg = errors.map(err => Object.keys(err.constraints).map(key => err.constraints[key]).join(", ")).join(", ");
                return Promise.reject(new Error(msg));
            }
            return Promise.resolve(model);
        });
    }
    data() {
        let attributes = Object.keys(this);
        let reducer = (acc, key) => {
            if (this.getTransientSet().indexOf(key) < 0)
                acc[key] = this[key];
            return acc;
        };
        let result = attributes.reduce(reducer, {});
        return result;
    }
    delete(cfg) {
        let record = this;
        let docRef = this.collection(cfg).doc(this.id);
        return this.beforeDelete(cfg)
            .then(() => {
            return docRef.delete();
        })
            .then(res => {
            return record.afterDelete(cfg, res);
        });
    }
    reload(cfg) {
        return this.getDocumentRef(cfg).get()
            .then(docRef => {
            if (!docRef.exists)
                return Promise.reject(new Error("Record not found"));
            this.assign(docRef.data());
            return Promise.resolve(this);
        });
    }
    assign(data) {
        for (var key of Object.keys(data)) {
            this[key] = data[key];
        }
        return;
    }
    beforeCreate(cfg, data) {
        return Promise.resolve(data);
    }
    beforeUpdate(cfg, data) {
        return Promise.resolve(data);
    }
    beforeDelete(cfg) {
        return Promise.resolve(this);
    }
    afterCreate(cfg) {
        let result = this;
        return Promise.resolve(result);
    }
    afterUpdate(cfg) {
        let result = this;
        return Promise.resolve(result);
    }
    afterDelete(cfg, result) {
        return Promise.resolve(result);
    }
    setRecordId() {
        return undefined;
    }
    updateData(data, cfg) {
        let collection = this.collection(cfg);
        let model = this;
        let newData;
        return this.beforeUpdate(cfg, data)
            .then(xData => {
            newData = xData;
            this.assign(newData);
            model = this;
            return Promise.resolve(model);
        })
            .then(this.validate)
            .then(() => {
            let docRef = collection.doc(this.id);
            return docRef.update(newData);
        })
            .then(() => model.afterUpdate(cfg));
    }
    newRecord(data, cfg) {
        data.createdAt = firestore_1.Timestamp.now();
        let coll = this.collection(cfg);
        let id;
        return this.beforeCreate(cfg, data)
            .then(data => {
            this.assign(data);
            return this.validate(this);
        })
            .then(model => {
            id = this.setRecordId();
            if (id === undefined)
                return coll.add(model.data());
            let doc = coll.doc(id);
            return coll.doc(id).set(model.data());
        })
            .then(docRef => {
            this.id = (id === undefined) ? docRef.id : id;
            return this.afterCreate(cfg);
        });
    }
}
RecordModel.transient = ["errors", "collectionPath"];
exports.RecordModel = RecordModel;
