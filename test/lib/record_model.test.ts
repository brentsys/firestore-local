import { expect } from "chai";
import fix, { User, Device } from '../fixtures'
import { getTestRecord } from "../../db/test_db";
import { DocumentPath } from "../../lib/record_model";
import { desc } from "../../lib/describer";
import localApp , {AppConfig } from "./firebass_config"


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
})
