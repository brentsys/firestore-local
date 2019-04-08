export class RecordType {
    constructor(protected value: string) { }
    
    static values: RecordType[] = []

    static setValues( keys: string[]): RecordType[]{
        return keys.map(x => new RecordType(x))
    }

    public toString() {
        return String(this.value);
    }

    public is(value: RecordType | string) {
        return this.value = value.toString();
    }


}
