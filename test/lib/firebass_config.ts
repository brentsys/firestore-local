import { ServiceConfig, LocalApp } from '../../lib/firebase';
import {users, accounts} from "../fixtures";

const serviceConfig : ServiceConfig = {
    prodDatabaseUrl: "https://<PROD-PROJECT-ID>.firebaseio.com",
    devDatabaseUrl: "https://kash-base-test.firebaseio.com",
    localCredentialsPath: '/Users/henrisack/X509/kash-base-test-firebase-adminsdk-rcac5-a9225fd148.json'
};

LocalApp.init(serviceConfig, [users, accounts])

export default LocalApp.getInstance()

export const AppConfig = (debug?: number) => LocalApp.getDbGroup(debug)