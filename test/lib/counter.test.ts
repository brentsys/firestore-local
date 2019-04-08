import { expect } from "chai";
import localApp from "./firebase"
import { Counter } from "../../index";

let ref = "dummies"

const NB_SHARDS = 2

const failure  = (res: any, error: Error) => {
    console.log("error result: ", res)
    return Promise.reject(error)
}

describe("Counter", function () {
    let db = localApp.firestore()

    it("should create counter on the fly", function (done) {
        Counter.nextIndex(db, ref, NB_SHARDS)
            .then(res => {
                try {
                    expect(res).to.eq(1)
                    return (db.collection("counters").doc(ref) as any).get()                        
                } catch (error) {
                    return failure(res, error)
                }
            })
            .then(snap => {
                try {
                    expect(snap).to.not.be.empty
                    return Counter.nextIndex(db, ref, NB_SHARDS)           
                } catch (error) {
                    return failure(snap, error)
                }
            })
            .then(res => {
                try {
                    expect(res).to.eq(2)
                    return Promise.resolve()
                } catch (error) {
                    return failure(res, error)                    
                }
            })
            .then(done)
            .catch(done)
    })

})