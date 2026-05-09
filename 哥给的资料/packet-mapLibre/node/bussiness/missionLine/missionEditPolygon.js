import EditablePolygon from "../../editable/EditablePolygon";

export class MissionEditPolygon extends EditablePolygon {
    static BUSINESSTYPE = "missionEditPolygon";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || MissionEditPolygon.BUSINESSTYPE;
    }
}