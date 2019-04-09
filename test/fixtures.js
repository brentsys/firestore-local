"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const record_model_1 = require("../lib/record_model");
const class_validator_1 = require("class-validator");
const record_type_1 = require("../lib/record_type");
exports.serviceConfig = {
    devDatabaseUrl: "https://kash-base-test.firebaseio.com",
    prodDatabaseUrl: "https://<production-db-url>.firebaseio.com",
    localCredentialsPath: '/Users/henrisack/X509/kash-base-test-firebase-adminsdk-rcac5-a9225fd148.json'
};
record_type_1.RecordType.values = ["users", "devices", "accounts"].map(x => new record_type_1.RecordType(x));
function accountIdSetter() {
    let id = `account_${this.ref}`;
    this.code = id;
    return id;
}
class Device extends record_model_1.RecordModel {
    static recordType() {
        return new record_type_1.RecordType("devices");
    }
}
Device.st = (path) => new record_model_1.RecordAction(Device, path);
__decorate([
    class_validator_1.IsString()
], Device.prototype, "curve", void 0);
exports.Device = Device;
class User extends record_model_1.RecordModel {
    static recordType() {
        return new record_type_1.RecordType("users");
    }
}
User.st = new record_model_1.RecordAction(User);
__decorate([
    class_validator_1.IsString()
], User.prototype, "name", void 0);
exports.User = User;
exports.users = {
    users: {
        An5Wv3JVwSd1yAsdTHIfmqwdMEH3: {
            name: 'DOE',
            givenNames: 'John G',
            email: 'john.g.doe@example.com',
        },
        K1f614gwr3QtQL1bS6H5GmDay9B2: {
            name: 'STUART',
            givenNames: 'Mary',
            email: 'mary@stuart.com',
            includes: {
                devices: {
                    Bgn6nAp7tzUSqqhqvGIe: {
                        'curve': 'secp384r1',
                        'pubKey': '0448a708b0f411eb97de3a33e3ba2aa9e4c7d3a47d94e7b79e60e1615397312fe176e222dfc92c3b39e45d6077d8fbedf980bb49e2eae2f7c89949c7143c38d8211aa59f6fa764cdac2276ab10706423fb992037edc73f3795031fb828a3baa65e',
                        'userId': 'K1f614gwr3QtQL1bS6H5GmDay9B2',
                        'verified': false
                    },
                    Q7wG9ZvcylqRwvO8UPhF: {
                        'curve': 'secp384r1',
                        'pubKey': '04980566cd5a893a7df241f8b8785d5a985bfca0e5a8e34907c0bc258c7496e736e8d62f04f378d2054aac3382f5c362bfde545977c47d37b227e8ea63f7d140b550e57ff617a1e5cf1d2751a8d389bc794bbadf6fadf894bcda7bfa0985dee318',
                        'userId': 'K1f614gwr3QtQL1bS6H5GmDay9B2',
                        'verified': false
                    },
                    T3TRb0RYmcHQYZsya5jv: {
                        'curve': 'secp384r1',
                        'pubKey': '045302c440c2f4688261564c492fcd12dc123908220e3003be0a914d48dc98d901381a9b9c5221ecb5d55e34acf37ef7b0b7bfdaf5538b8b32fd32b1b8489217782e198e2308586e415d2e5e70501308c4f1d043a14b0c247908fb2edd1b38acac',
                        'userId': 'K1f614gwr3QtQL1bS6H5GmDay9B2',
                        'verified': false
                    }
                }
            }
        }
    }
};
class Account extends record_model_1.RecordModel {
    static recordType() {
        return new record_type_1.RecordType("accounts");
    }
}
Account.st = new record_model_1.RecordAction(Account);
exports.Account = Account;
exports.accounts = {
    accounts: {
        keysFn: accountIdSetter,
        acc_1234234534564567: {
            ref: 1,
            name: "base account",
            userId: 'An5Wv3JVwSd1yAsdTHIfmqwdMEH3',
            accountType: "USER"
        },
        acc_1111_USER: {
            ref: 2,
            name: "savings account",
            userId: 'K1f614gwr3QtQL1bS6H5GmDay9B2',
            accountType: "PREMIUM"
        }
    }
};
exports.default = [exports.users, exports.accounts];
