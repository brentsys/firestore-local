import { expect } from "chai";
import { RecordType } from "../../lib/record_type"
import { hasNoCustomProperties, getCustomProperties } from "../../lib/utils"
import { Timestamp } from "@google-cloud/firestore";

interface TestOptions {
    id: number
    skip?: boolean
    test: any
    result: boolean
}

interface T2 {
    id: number
    skip?: boolean,
    test: {[key:string]: any}
    result: string[]
}

function it_should_test_properties(opt: TestOptions){
    let should = opt.result ? "should" : "should not"
    let title = `Test#${opt.id}: ${should} have custom properties`
    if(opt.skip) return it(title)
    it(title, function(){
        expect(hasNoCustomProperties(opt.test)).to.eq(opt.result)
    })
}

function it_should_find_faulty_keys(opt: T2){
    let should = opt.result.length ==0 ? "no custom properties" : `${opt.result.length} faulty key(s)`
    let title = `Test 2 #${opt.id}: should have ${should}`
    if(opt.skip) return it(title)
    it(title, function(){
        let props = getCustomProperties(opt.test)
        expect(props).to.have.lengthOf(opt.result.length)
        expect(props).to.have.members(opt.result)
    })

}

let rt = new RecordType("test")

let testValues: TestOptions[]= [
    {id: 1, test: new RecordType("trest"), result: false},
    {id: 2, test: {}, result: true},
    {id: 3, test: [], result: true},
    {id: 4, test: ["23", 3], result: true},
    {id: 5, test: {a: "23", b:3}, result: true},
    {id: 6, test: [{a: "23", b:3}], result: true},
    {id: 7, test: {x: "23", y:3, z: rt}, result: false},
    {id: 8, test: rt, result: false},
    {id: 9, test: [{a: "23", b:3}, rt], result: false},
    {id: 10, test: [["23", 3], {x: "23", y:3, z: rt}], result: false},
    {id: 11, test: {dt: Timestamp.now()}, result: true},
]

let t2Values: T2[]=[
    {id: 1, test: {r1: rt}, result: ["r1"]},
    {id: 2, test: {a: 1, b: 2, c: [{a: 1, x: rt}]}, result: ["c::0::x"]},
    {id: 3, test: {a: 1, b: 2, c: {a: 1, x: rt}}, result: ["c::x"]},
    {id: 4, test: {a: 1, b: 2, c: {a: 1}}, result: []},
]



describe("Custom Properties", function () {
    testValues.forEach(it_should_test_properties)
    t2Values.forEach(it_should_find_faulty_keys)
})