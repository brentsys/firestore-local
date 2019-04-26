process.env.GCLOUD_PROJECT = "kash-base-test"
import { expect, assert } from "chai";
import fix, { User, Device } from '../fixtures'
import { getTestRecord } from "../../db/test_db";
import { DocumentPath } from "../../lib/record_model";
import { desc, DescriberOptions, setFixtures } from "../../lib/describer";
import localApp , {AppConfig } from "./firebass_config"
import { Dummy } from "./Dummy";
import { RecordType } from "../../lib/record_type";
import { Timestamp } from "@google-cloud/firestore";

function beforeTest(){
}

function afterTest(){
}

let options : DescriberOptions = {
    beforeEach: beforeTest,
    afterEach: afterTest,
    before: beforeTest,
    after: afterTest
}

setFixtures(fix)

desc('RecordModel', function () {

    let cfg = AppConfig()

    let userId = "An5Wv3JVwSd1yAsdTHIfmqwdMEH3"
    let attributes = { name: "new Demo Company" }

    let devicePath = ["users", "K1f614gwr3QtQL1bS6H5GmDay9B2", "devices", "Bgn6nAp7tzUSqqhqvGIe"]

    let deviceData = getTestRecord(devicePath, fix)

    it("should find device", function(done){
        let st = Device.st(new DocumentPath(devicePath.slice(-3)[0], devicePath.slice(0,1)))
        st.setConfig(cfg)
        st.findById(devicePath.slice(-1)[0])
            .then(res =>{
                try {
                    expect(res).to.not.be.undefined
                    expect(res.pubKey).to.eq(deviceData.pubKey)
                    done()
                } catch (error) {
                    console.log("result error", res)
                    done(error)
                }
            })
    })
    it("should update document", function (done) {
        User.st.setConfig(cfg)
        User.st.findById(userId)
            .then(usr => {
                return usr.updateData(attributes, cfg)
            })
            .then(result => {
                try {
                    let doc = result as any
                    expect(doc.name).to.eq(attributes.name)
                } catch (error) {
                    console.log(error)
                    return Promise.reject(error)
                }
            })
            .then(() => {
                return User.st.findById(userId)
            })
            .then(result => {
                try {
                    let doc = result as any
                    expect(doc.name).to.eq(attributes.name)
                } catch (error) {
                    console.log(error)
                    return Promise.reject(error)
                }
            })
            .then(() => done())
            .catch(done)
    })
    it("should not save document with custom prototypes", function(done){
        let dummy = Dummy.st.setSyncData({id: 'new', field: new RecordType("alpha")})
        let positivefailure = true
        dummy.save(cfg)
            .then(()=> {
                positivefailure = false
                return Promise.reject(new Error("should not save with custom prototypes"))
            })
            .catch(error => {
                if(positivefailure) return Promise.resolve()
                else return Promise.reject(error)
            })
            .then(done)
            .catch(done)

    })
    it("should accept Timestamp object document", function(done){
        let dummy = Dummy.st.setSyncData({id: 'new', field: Timestamp.now()})
        dummy.save(cfg)
            .then(()=> {
                assert(true)
                return Promise.resolve()
            })
            .catch(error => {
                return Promise.reject(error)
            })
            .then(done)
            .catch(done)

    })
}, options)
