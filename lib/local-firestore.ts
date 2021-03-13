import * as fs from 'fs';
import * as path from 'path';
import * as md5 from 'md5';
import { TSMap } from "typescript-map"
import * as admin from 'firebase-admin';
import { DocumentData, UpdateData, Precondition, FieldPath, CollectionReference, WhereFilterOp, OrderByDirection, DocumentReference, SetOptions, Firestore, Timestamp } from '@google-cloud/firestore';

import { TestDB, TestFixtures } from '../db/test_db';

const MEMORY_DB = "memory"

export type Fixture = { [key: string]: any }

let initFixtures: Fixture[];

export declare namespace fake {

    export type Database = LocalDatabase

    export type CollectionReference = Collection

    export type DocumentReference = DocumentRef

    export type Fixtures = TSMap<string, any>

}

export type CollectionType = fake.CollectionReference | CollectionReference
export type DocumentReferenceType = DocumentRef | DocumentReference
export type GenTransaction = Transaction | FirebaseFirestore.Transaction

class WriteBatch {
    _delete: DocumentRef[] = []
    _add: DocumentRef[] = []
    _set: [DocumentRef, DocumentData][] = []

    constructor(readonly context: LocalDatabase) { }

    delete(doc: DocumentRef) {
        this._delete.push(doc);
    };

    set(documentRef: DocumentRef, data: DocumentData,
        options?: SetOptions): WriteBatch {
        checkUndefinedValue(data)
        this._set.push([documentRef, data])
        return this
    }


    commit(): Promise<void> {
        // Delete a bunch of documents
        let delPromises = Promise.all(this._delete.map((doc) => doc.delete(true)))
        let setPromises = Promise.all(this._set.map(pair => pair[0].set(pair[1])))
        return Promise.all([delPromises, setPromises])
            .then(() => {
                this.context.saveDb()
                return Promise.resolve()
            })
    };
}


export class Transaction {
    private context: LocalDatabase
    private errors: Error[] = []
    private constructor() {

    }

    static generate(context: LocalDatabase): Transaction {
        let transaction = new Transaction()
        let ctx = new LocalDatabase([], MEMORY_DB)
        ctx.setMemFixtures(context.getFixtures())
        transaction.context = ctx
        return transaction
    }

    private getGlobalFIxtures(): fake.Fixtures {
        return TestFixtures
    }

    private setError(error: Error): void {
        this.errors.push(error);
    }

    getErrors(): Error {
        let messages = this.errors.map(err => err.message)
        return new Error(messages.join(", "))
    }

    get(documentRef: DocumentRef): Promise<DocumentRef> {
        return documentRef.get()
    }

    create(documentRef: DocumentRef, data: DocumentData): Transaction {
        checkUndefinedValue(data)
        let transaction = this;
        transaction.get(documentRef)
            .then(docRef => {
                docRef.set(data)
            })
            .catch(this.setError)
        return this
    }

    set(documentRef: DocumentRef, data: DocumentData): Transaction {
        checkUndefinedValue(data)
        this.get(documentRef)
            .then(docRef => docRef.set(data))
            .catch(this.setError);
        return this
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
    update(documentRef: DocumentRef, data: UpdateData,
        precondition?: Precondition): Transaction {
        checkUndefinedValue(data)
        this.get(documentRef)
            .then(docRef => {
                if (!docRef.exists) return Promise.reject(new Error("Document not found"))
                docRef.set(data)
            })
        return this
    }

    /**
     * Deletes the document referred to by the provided `DocumentReference`.
     *
     * @param documentRef A reference to the document to be deleted.
     * @param precondition A Precondition to enforce for this delete.
     * @return This `Transaction` instance. Used for chaining method calls.
     */
    delete(documentRef: DocumentRef,
        precondition?: Precondition): Transaction {
        this.get(documentRef)
            .then(docRef => {
                docRef.delete()
            })
        return this
    }

    commit(): void {
        let fx = this.context.getFixtures()
        for (var key of fx.keys()) {
            TestFixtures.set(key, fx.get(key))
        }
    }

    hasErrors(): boolean {
        return this.errors.length > 0
    }

}

export class LocalDatabase {
    _batch: WriteBatch
    memFixtures: fake.Fixtures
    readonly isFake = true
    private _isMemory: boolean
    constructor(fix: Fixture[], path: string = DbPath) {
        this._isMemory = path === MEMORY_DB
        if (this._isMemory) {
            this.memFixtures = new TSMap()
        } else {
            this.init(fix)
        }
        this._batch = new WriteBatch(this)
    }

    setMemFixtures(fx: fake.Fixtures) {
        for (var key of fx.keys()) {
            this.memFixtures.set(key, fx.get(key))
        }
    }

    runTransaction<T>(
        updateFunction: (transaction: Transaction) => Promise<T>,
        transactionOptions?: { maxAttempts?: number }
    ): Promise<T> {
        let transaction = Transaction.generate(this)
        return updateFunction(transaction)
            .then(result => {
                if (transaction.hasErrors()) return Promise.reject(transaction.getErrors())
                transaction.commit()
                return Promise.resolve(result)
            })
    }

    batch(): WriteBatch {
        return this._batch
    }

    getFixtures(): fake.Fixtures {
        if (this._isMemory) return this.memFixtures
        return TestFixtures;
    }

    private init(fix: Fixture[], noDisplay?: boolean) {
        initFixtures = fix
        if (TestDB._keys === undefined) new TestDB(fix)
        TestFixtures.filter(value => { return false }) // clear
        for (let i = 0; i < TestDB.getKeys().length; i++) {
            let key = TestDB.getKey(i)
            TestFixtures.set(key, Object.assign({}, TestDB.getValue(i)))
        }
        if (!noDisplay) console.log("DB Fixtures initialized with ", TestFixtures.length, "elements")
    }

    reset(): void {
        this.init(initFixtures, true)
    }

    collection(ref: string, document?: Document): Collection {
        return new Collection(this, ref, document)
    }

    saveDb() {
        if (fsSave() && !this._isMemory) {
            fs.writeFile(DbPath, JSON.stringify(TestFixtures, undefined, 2), function () { });
        }
    }
}


function fsSave() {
    return process.env.NODE_ENV !== 'test';
}

function getDbFile() {
    if (fsSave()) return '../db/fixtures.db';
    return '../test/test_db.json';
}
const DbPath = path.join(__dirname, '..', getDbFile());


export class Query {
    constructor(readonly field: string, readonly comp: WhereFilterOp, readonly value: any) {
        if (field === undefined) throw new Error(`Invalid query with 'field' undefined`)
        if (comp === undefined) throw new Error(`Invalid query with 'comp' undefined`)
        if (value === undefined) throw new Error(`Invalid query with 'value' undefined`)
    }

    filter(list) {
        let value = this.value
        if (typeof value == "string") value = `'${value}'`
        let filterString: string
        if (value instanceof Timestamp) {
            filterString = `(x) => x.data().${this.field}.toMillis() ${this.comp} ${value.toMillis()}`;
        } else {
            filterString = `(x) => x.data().${this.field} ${this.comp} ${value}`;
        }
        var filterFn = eval(filterString);
        return list.filter(filterFn);
    };
}

export interface QueryOrder {
    fieldPath: string | FieldPath
    directionStr?: OrderByDirection
}

const InequalityOperators = [">", ">=", "<", "<="]

export class QuerySnapshot {
    queries: Query[] = []
    orders: QueryOrder[] = []
    _limit: number

    constructor(private collection: Collection, query: Query) {
        this.queries.push(query)
    }

    where(field, comp, value): QuerySnapshot {
        var query = new Query(field, comp, value);
        this.queries.push(query);
        let ineqFields = this.inequalityFilters()
        if (ineqFields.length > 1) {
            let msg = `Cannot have inequality filters on multiple properties: [${ineqFields.join(", ")}]`
            throw new Error(msg)
        }
        return this;
    }

    private inequalityFilters(): string[] {
        return this.queries.reduce((acc: string[], cur: Query) => {
            if (InequalityOperators.find(x => cur.comp === x) !== undefined) {
                acc.push(cur.field)
            }
            return acc
        }, [])
    }

    orderBy(
        fieldPath: string | FieldPath, directionStr?: OrderByDirection
    ): QuerySnapshot {
        this.orders.push({ fieldPath: fieldPath, directionStr: directionStr })
        return this
    }

    limit(limit: number): QuerySnapshot {
        this._limit = limit
        return this
    };


    get() {
        return this.collection.get()
            .then((querySnapshot) => {
                return filter(querySnapshot, this.queries)
            })
    };
}

function filter(querySnapshot, queries) {
    var list = querySnapshot.docs;
    queries.forEach((query) => {
        list = query.filter(list);
    });
    querySnapshot.docs = list;
    querySnapshot.size = list.length
    if (list.length == 0) querySnapshot.empty = true;
    return querySnapshot;
}


class Collection {
    path: string
    document: Document
    size: number
    docs: DocumentRef[]
    constructor(readonly context: LocalDatabase, ref, document?) {
        this.path = ref;
        if (document) {
            this.path = [document.path, ref].join('/');
        }
        this.docs = [];
    }

    forEach(fn, array?) {
        return this.docs.forEach(fn, array)
    };

    doc(ref) {
        return new DocumentRef(ref, this);
    };

    where(field, comp, value) {
        var query = new Query(field, comp, value);
        return new QuerySnapshot(this, query);
    };

    get() {
        var rxp = new RegExp(`^${this.path}/\\w+$`);
        var rxp2 = new RegExp(`^${this.path}/`);
        let fx = this.context.getFixtures()
        for (var key of fx.keys()) {
            if (rxp.test(key as string)) {
                var id = key.replace(rxp2, "");
                var docRef = new DocumentRef(id, this);
                setDocumentData.bind(docRef)(fx.get(key));
                this.docs.push(docRef)
            }
        }
        this.size = this.docs.length
        return Promise.resolve(this);
    };

    add(data: admin.firestore.DocumentData, batch?: WriteBatch): Promise<DocumentRef> {
        checkUndefinedValue(data)
        var id = md5(`${this.path}-${new Date().toString()}-${Math.random()}`).toString();
        var path = [this.path, id].join('/');
        this.context.getFixtures().set(path, data)
        this.context.saveDb();
        var docRef = new DocumentRef(id, this);
        setDocumentData.bind(docRef)(data);
        return Promise.resolve(docRef);
    };

};


class DocumentRef {
    readonly context: LocalDatabase
    id: string
    path: string
    collections: Collection[]
    _data?: admin.firestore.DocumentData
    exists: boolean

    constructor(ref: string, readonly coll: Collection) {
        this.id = ref;
        this.path = [coll.path, ref].join('/');
        this.collections = [];
        this._data;
        this.exists = !!this._data
        this.context = coll.context
    }

    data(): admin.firestore.DocumentData {
        return this._data;
    };

    collection(ref) {
        return new Collection(this.context, ref, this);
    };

    get() {
        setDocumentData.bind(this)(this.context.getFixtures().get(this.path));
        return Promise.resolve(this);
    };

    set(values) {
        let fx = this.context.getFixtures()
        var data = fx.get(this.path) || {};
        Object.assign(data, values);
        checkUndefinedValue(data)
        setDocumentData.bind(this)(data);
        fx.set(this.path, data);
        this.context.saveDb();
        return Promise.resolve(this);
    };

    update(values) {
        checkUndefinedValue(values)
        return this.set(values)
    }

    delete(save: boolean = true): Promise<boolean | WriteBatch> {
        if (!save) {
            let wb = new WriteBatch(this.context)
            wb.delete(this)
            return Promise.resolve(wb)
        }
        var result = this.context.getFixtures().delete(this.path);
        this.context.saveDb();
        return Promise.resolve(result);
    };
}

function setDocumentData(data) {
    this._data = data;
    this.exists = !!data;
}

function checkUndefinedValue(data: DocumentData): void {
    let values = Object.keys(data).map(key => data[key])
    let idx = values.indexOf(undefined)
    if (idx < 0) return;
    throw new Error(`Cannot save field undefined: ${Object.keys(data)[idx]}`)
}