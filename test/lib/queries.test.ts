process.env.GCLOUD_PROJECT = "kash-base-test"
import { BaseOptions, DescriberOptions, setFixtures } from "../../lib/describer";
import { Query } from "../../lib/local-firestore";
import fix from '../fixtures';
import { AppConfig } from "./firebass_config";
import { Dummy } from "./Dummy";
import { assert } from 'chai'

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

function getTitle(success: boolean): string {
    return success ? "should accept inequality filters on single property"
        : "should not have inequality filters on multiple properties";
}

interface Options extends BaseOptions {
    success: boolean
    queries: Query[]
}

function it_test_filter(opt: Options){
    let cfg = AppConfig()
    let title = ["Test #", opt.id,": ", getTitle(opt.success)].join("")
    if(opt.skip) return it(title)
    let positiveFailure = !opt.success
    it(title, function(done){
        try {
            Dummy.st.setConfig(cfg).findAll(opt.queries).then(() => {
                positiveFailure = opt.success
                assert(opt.success)
                done()
            })            
        } catch (error) {
            if(positiveFailure) return done()
            done(error)
        }
    })
}

let testValues: Options[] = [
    {id: 1, success: true, queries: [new Query("x", ">=", "1")]},
    {id: 2, success: true, queries: [new Query("x", ">=", "1"), new Query("y", "==", "0")]},
    {id: 3, success: false, queries: [new Query("x", ">=", "1"), new Query("y", "<=", "0")]},
    {id: 4, success: false, queries: [new Query("x", ">", "1"), new Query("y", "<", "0")]},
]
describe('Queries', function () {
    testValues.forEach(it_test_filter)
})
