import { RecordModel, RecordAction, DocumentPath } from "../lib/record_model";
import { ServiceConfig } from "../lib/firebase";
import { IsString } from "class-validator";
import { RecordType } from "../lib/record_type";


export const serviceConfig : ServiceConfig = {
    devDatabaseUrl: "https://kash-base-test.firebaseio.com",
    prodDatabaseUrl: "https://<production-db-url>.firebaseio.com",
    localCredentialsPath: '/Users/henrisack/X509/kash-base-test-firebase-adminsdk-rcac5-a9225fd148.json'
};

RecordType.values = ["users", "devices", "accounts"].map(x => new RecordType(x))

function accountIdSetter(): string {
    let id = `account_${this.ref}`
    this.code = id
    return id
}

export class Device extends RecordModel {
    @IsString()
    curve: string
    pubKey: string
    userId: string
    verified: boolean
    static recordType(): RecordType {
        return new RecordType("devices")
    }
    static st = (path: DocumentPath) => new RecordAction(Device, path)
}

export class User extends RecordModel {
    @IsString()
    name: string
    givenNames: string
    email: string
    static recordType(): RecordType {
        return new RecordType("users")
    }

    static st = new RecordAction(User)
}

export const users = {
    users: {                                    // <- collection reference is "users"
        An5Wv3JVwSd1yAsdTHIfmqwdMEH3: {         // <- document ID
            name: 'DOE',                            // 
            givenNames: 'John G',                   //   <- document data
            email: 'john.g.doe@example.com',        //
        },
        K1f614gwr3QtQL1bS6H5GmDay9B2: {
            name: 'STUART',
            givenNames: 'Mary',
            email: 'mary@stuart.com',
            includes: {                          // <- includes is a keyword indicating a sub collection
                devices: {                       // <- name of the sub collection ("devices" in this case)
                    Bgn6nAp7tzUSqqhqvGIe: {      // <- id of the document
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

export class Account extends RecordModel {

    code: string
    userid: string
    name: string
    accountType: string
    static recordType(): RecordType {
        return new RecordType("accounts")
    }

    static st = new RecordAction(Account)
}

export const accounts = {
    accounts: {
        keysFn: accountIdSetter,            // <- a special keyword used to compute the document Id istead of letting firestore choose one
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

export default [users, accounts]
