import EditableLine from "../../editable/EditableLine";

export class MissionEditLine extends EditableLine {
    static BUSINESSTYPE = "missionEditLine";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || MissionEditLine.BUSINESSTYPE;
    }
}