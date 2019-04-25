import { RecordModel, RecordAction } from "../../lib/record_model";
import { RecordType } from "../../lib/record_type";

export class Dummy extends RecordModel {
    x: number
    y: number
    field: any

    static recordType(): RecordType{
        return new RecordType("dummies")
    }

    static st = new RecordAction(Dummy)
}

