import EditablePoint from "../../editable/EditablePoint";

export default class MarkPoint extends EditablePoint {
    static BUSINESSTYPE = "Marks";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || MarkPoint.BUSINESSTYPE;
    }
}