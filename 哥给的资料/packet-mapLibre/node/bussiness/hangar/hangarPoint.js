import Point from '../../base/Point';

export class HangarShowPoint extends Point {
    static BUSINESSTYPE = "Hangar";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || HangarShowPoint.BUSINESSTYPE;
        this.sn = options.sn || '';
    }
    upperUpdate(updateData) {
        const {options} = updateData;
        this.sn = options.sn || '';
        this.update(updateData);
    }
}