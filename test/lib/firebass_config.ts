import { ServiceConfig, LocalApp } from '../../lib/firebase';
import {users, accounts} from "../fixtures";

const serviceConfig : ServiceConfig = {
    devDatabaseUrl: "https://<DEV-PROJECT-ID>.firebaseio.com",
    prodDatabaseUrl: "https://<PROD-PROJECT-ID>.firebaseio.com",
    localCredentialsPath: 'someFilePath'
};

LocalApp.init(serviceConfig, [users, accounts])

export default LocalApp.getInstance()

export const AppConfig = (debug?: number) => LocalApp.getDbGroup(debug)