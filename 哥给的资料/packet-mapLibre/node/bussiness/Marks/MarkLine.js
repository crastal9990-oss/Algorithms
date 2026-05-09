import EditableLine from "../../editable/EditableLine";

export default class MarkLine extends EditableLine {
    static BUSINESSTYPE = "Marks";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || MarkLine.BUSINESSTYPE;
    }
}