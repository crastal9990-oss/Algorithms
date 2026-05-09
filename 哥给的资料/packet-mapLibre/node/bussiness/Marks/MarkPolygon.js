import EditablePolygon from "../../editable/EditablePolygon";

export default class MarkPolygon extends EditablePolygon {
    static BUSINESSTYPE = "Marks";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || MarkPolygon.BUSINESSTYPE;
    }
}