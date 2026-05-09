import Point from '../../base/Point';
import Line from '../../base/Line';

export class TargetPonit extends Point {
    static BUSINESSTYPE = "TargetPonit";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || TargetPonit.BUSINESSTYPE;
    }
}

export class TargetLine extends Line {
    static BUSINESSTYPE = "TargetLine";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || TargetLine.BUSINESSTYPE;
    }
}