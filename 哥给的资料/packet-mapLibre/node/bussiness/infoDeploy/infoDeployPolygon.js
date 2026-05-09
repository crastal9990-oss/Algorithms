import EditablePolygon from "../../editable/EditablePolygon";

export class InfoDeployPolygon extends EditablePolygon {
    static BUSINESSTYPE = "InfoDeploy";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || InfoDeployPolygon.BUSINESSTYPE;
        this._drawTypeDeployType = options.infoDeployType;
    }
}