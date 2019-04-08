"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RecordType {
    constructor(value) {
        this.value = value;
    }
    toString() {
        return String(this.value);
    }
    is(value) {
        return this.value = value.toString();
    }
}
RecordType.values = [];
exports.RecordType = RecordType;
