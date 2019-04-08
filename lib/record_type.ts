export class RecordType {
    constructor(protected value: string) { }
    
    static values: RecordType[] = []

    public toString() {
        return String(this.value);
    }

    public is(value: RecordType | string) {
        return this.value = value.toString();
    }
}
