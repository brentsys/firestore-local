"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const md5 = require("md5");
const typescript_map_1 = require("typescript-map");
const firestore_1 = require("@google-cloud/firestore");
const test_db_1 = require("../db/test_db");
const MEMORY_DB = "memory";
let initFixtures;
class WriteBatch {
    constructor(context) {
        this.context = context;
        this._delete = [];
        this._add = [];
        this._set = [];
    }
    delete(doc) {
        this._delete.push(doc);
    }
    ;
    set(documentRef, data, options) {
        checkUndefinedValue(data);
        this._set.push([documentRef, data]);
        return this;
    }
    commit() {
        // Delete a bunch of documents
        let delPromises = Promise.all(this._delete.map((doc) => doc.delete(true)));
        let setPromises = Promise.all(this._set.map(pair => pair[0].set(pair[1])));
        return Promise.all([delPromises, setPromises])
            .then(() => {
            this.context.saveDb();
        });
    }
    ;
}
class Transaction {
    constructor() {
        this.errors = [];
    }
    static generate(context) {
        let transaction = new Transaction();
        let ctx = new LocalDatabase([], MEMORY_DB);
        ctx.setMemFixtures(context.getFixtures());
        transaction.context = ctx;
        return transaction;
    }
    getGlobalFIxtures() {
        return test_db_1.TestFixtures;
    }
    setError(error) {
        this.errors.push(error);
    }
    getErrors() {
        let messages = this.errors.map(err => err.message);
        return new Error(messages.join(", "));
    }
    get(documentRef) {
        return documentRef.get();
    }
    create(documentRef, data) {
        checkUndefinedValue(data);
        let transaction = this;
        transaction.get(documentRef)
            .then(docRef => {
            docRef.set(data);
        })
            .catch(this.setError);
        return this;
    }
    set(documentRef, data) {
        checkUndefinedValue(data);
        this.get(documentRef)
            .then(docRef => docRef.set(data))
            .catch(this.setError);
        return this;
    }
    /**
     * Updates fields in the document referred to by the provided
     * `DocumentReference`. The update will fail if applied to a document that
     * does not exist.
     *
     * Nested fields can be updated by providing dot-separated field path
     * strings.
     *
     * @param documentRef A reference to the document to be updated.
     * @param data An object containing the fields and values with which to
     * update the document.
     * @param precondition A Precondition to enforce on this update.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    update(documentRef, data, precondition) {
        checkUndefinedValue(data);
        this.get(documentRef)
            .then(docRef => {
            if (!docRef.exists)
                return Promise.reject(new Error("Document not found"));
            docRef.set(data);
        });
        return this;
    }
    /**
     * Deletes the document referred to by the provided `DocumentReference`.
     *
     * @param documentRef A reference to the document to be deleted.
     * @param precondition A Precondition to enforce for this delete.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    delete(documentRef, precondition) {
        this.get(documentRef)
            .then(docRef => {
            docRef.delete();
        });
        return this;
    }
    commit() {
        let fx = this.context.getFixtures();
        for (var key of fx.keys()) {
            test_db_1.TestFixtures.set(key, fx.get(key));
        }
    }
    hasErrors() {
        return this.errors.length > 0;
    }
}
exports.Transaction = Transaction;
class LocalDatabase {
    constructor(fix, path = DbPath) {
        this.isFake = true;
        this._isMemory = path === MEMORY_DB;
        if (this._isMemory) {
            this.memFixtures = new typescript_map_1.TSMap();
        }
        else {
            this.init(fix);
        }
        this._batch = new WriteBatch(this);
    }
    setMemFixtures(fx) {
        for (var key of fx.keys()) {
            this.memFixtures.set(key, fx.get(key));
        }
    }
    runTransaction(updateFunction, transactionOptions) {
        let transaction = Transaction.generate(this);
        return updateFunction(transaction)
            .then(result => {
            if (transaction.hasErrors())
                return Promise.reject(transaction.getErrors());
            transaction.commit();
            return Promise.resolve(result);
        });
    }
    batch() {
        return this._batch;
    }
    getFixtures() {
        if (this._isMemory)
            return this.memFixtures;
        return test_db_1.TestFixtures;
    }
    init(fix, noDisplay) {
        initFixtures = fix;
        if (test_db_1.TestDB._keys === undefined)
            new test_db_1.TestDB(fix);
        test_db_1.TestFixtures.filter(value => { return false; }); // clear
        for (let i = 0; i < test_db_1.TestDB.getKeys().length; i++) {
            let key = test_db_1.TestDB.getKey(i);
            test_db_1.TestFixtures.set(key, Object.assign({}, test_db_1.TestDB.getValue(i)));
        }
        if (!noDisplay)
            console.log("DB Fixtures initialized with ", test_db_1.TestFixtures.length, "elements");
    }
    reset() {
        this.init(initFixtures, true);
    }
    collection(ref, document) {
        return new Collection(this, ref, document);
    }
    saveDb() {
        if (fsSave() && !this._isMemory) {
            fs.writeFile(DbPath, JSON.stringify(test_db_1.TestFixtures, undefined, 2), function () { });
        }
    }
}
exports.LocalDatabase = LocalDatabase;
function fsSave() {
    return process.env.NODE_ENV !== 'test';
}
function getDbFile() {
    if (fsSave())
        return '../db/fixtures.db';
    return '../test/test_db.json';
}
const DbPath = path.join(__dirname, '..', getDbFile());
class Query {
    constructor(field, comp, value) {
        this.field = field;
        this.comp = comp;
        this.value = value;
        if (field === undefined)
            throw new Error(`Invalid query with 'field' undefined`);
        if (comp === undefined)
            throw new Error(`Invalid query with 'comp' undefined`);
        if (value === undefined)
            throw new Error(`Invalid query with 'value' undefined`);
    }
    filter(list) {
        let value = this.value;
        if (typeof value == "string")
            value = `'${value}'`;
        let filterString;
        if (value instanceof firestore_1.Timestamp) {
            filterString = `(x) => x.data().${this.field}.toMillis() ${this.comp} ${value.toMillis()}`;
        }
        else {
            filterString = `(x) => x.data().${this.field} ${this.comp} ${value}`;
        }
        var filterFn = eval(filterString);
        return list.filter(filterFn);
    }
    ;
}
exports.Query = Query;
class QuerySnapshot {
    constructor(collection, query) {
        this.collection = collection;
        this.queries = [];
        this.orders = [];
        this.queries.push(query);
    }
    where(field, comp, value) {
        var query = new Query(field, comp, value);
        this.queries.push(query);
        return this;
    }
    orderBy(fieldPath, directionStr) {
        this.orders.push({ fieldPath: fieldPath, directionStr: directionStr });
        return this;
    }
    limit(limit) {
        this._limit = limit;
        return this;
    }
    ;
    get() {
        return this.collection.get()
            .then((querySnapshot) => {
            return filter(querySnapshot, this.queries);
        });
    }
    ;
}
exports.QuerySnapshot = QuerySnapshot;
function filter(querySnapshot, queries) {
    var list = querySnapshot.docs;
    queries.forEach((query) => {
        list = query.filter(list);
    });
    querySnapshot.docs = list;
    querySnapshot.size = list.length;
    if (list.length == 0)
        querySnapshot.empty = true;
    return querySnapshot;
}
class Collection {
    constructor(context, ref, document) {
        this.context = context;
        this.path = ref;
        if (document) {
            this.path = [document.path, ref].join('/');
        }
        this.docs = [];
    }
    forEach(fn, array) {
        return this.docs.forEach(fn, array);
    }
    ;
    doc(ref) {
        return new DocumentRef(ref, this);
    }
    ;
    where(field, comp, value) {
        var query = new Query(field, comp, value);
        return new QuerySnapshot(this, query);
    }
    ;
    get() {
        var rxp = new RegExp(`^${this.path}/\\w+$`);
        var rxp2 = new RegExp(`^${this.path}/`);
        let fx = this.context.getFixtures();
        for (var key of fx.keys()) {
            if (rxp.test(key)) {
                var id = key.replace(rxp2, "");
                var docRef = new DocumentRef(id, this);
                setDocumentData.bind(docRef)(fx.get(key));
                this.docs.push(docRef);
            }
        }
        this.size = this.docs.length;
        return Promise.resolve(this);
    }
    ;
    add(data, batch) {
        checkUndefinedValue(data);
        var id = md5(`${this.path}-${new Date().toString()}-${Math.random()}`).toString();
        var path = [this.path, id].join('/');
        this.context.getFixtures().set(path, data);
        this.context.saveDb();
        var docRef = new DocumentRef(id, this);
        setDocumentData.bind(docRef)(data);
        return Promise.resolve(docRef);
    }
    ;
}
;
class DocumentRef {
    constructor(ref, coll) {
        this.coll = coll;
        this.id = ref;
        this.path = [coll.path, ref].join('/');
        this.collections = [];
        this._data;
        this.exists = !!this._data;
        this.context = coll.context;
    }
    data() {
        return this._data;
    }
    ;
    collection(ref) {
        return new Collection(this.context, ref, this);
    }
    ;
    get() {
        setDocumentData.bind(this)(this.context.getFixtures().get(this.path));
        return Promise.resolve(this);
    }
    ;
    set(values) {
        let fx = this.context.getFixtures();
        var data = fx.get(this.path) || {};
        Object.assign(data, values);
        checkUndefinedValue(data);
        setDocumentData.bind(this)(data);
        fx.set(this.path, data);
        this.context.saveDb();
        return Promise.resolve(this);
    }
    ;
    update(values) {
        checkUndefinedValue(values);
        return this.set(values);
    }
    delete(save = true) {
        if (!save) {
            let wb = new WriteBatch(this.context);
            wb.delete(this);
            return Promise.resolve(wb);
        }
        var result = this.context.getFixtures().delete(this.path);
        this.context.saveDb();
        return Promise.resolve(result);
    }
    ;
}
function setDocumentData(data) {
    this._data = data;
    this.exists = !!data;
}
function checkUndefinedValue(data) {
    let values = Object.keys(data).map(key => data[key]);
    let idx = values.indexOf(undefined);
    if (idx < 0)
        return;
    throw new Error(`Cannot save field undefined: ${Object.keys(data)[idx]}`);
}
