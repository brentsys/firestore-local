"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./lib/firebase"));
__export(require("./lib/counter"));
__export(require("./lib/record_model"));
__export(require("./lib/record_type"));
__export(require("./lib/describer"));
__export(require("./lib/firestore_upload"));
__export(require("./db/test_db"));
__export(require("./lib/utils"));
var firestore_1 = require("@google-cloud/firestore");
exports.Timestamp = firestore_1.Timestamp;
