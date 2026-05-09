export default class DrawInsertPoint {
    static NAME = "DRAW_INSERT_POINT";
    constructor(props) {
        this._map = props.map;
        this._eventMap = [
            {
                type: "click",
                callback: (event) => {
                    this.click(this._map, event);
                }
            }
        ];
        this._name = DrawInsertPoint.NAME;
        this._feature = props.feature;
        this._insertIndex = props.insertIndex;
        this._afterFinish = props.afterFinish;
        this.initPoint();
    }
    get name() {
        return this._name;
    }
    get eventMap() {
        return this._eventMap;
    }

    initPoint() {
        this._feature && this._feature.onSelect();
    }
    click(map, event) {
        let nowLngLat = [event.lngLat.lng, event.lngLat.lat];
        if (!nowLngLat) return;
        this._feature && this._feature.insertCompleted(this._insertIndex, nowLngLat);
        this._finish(nowLngLat);
    }
    _finish(position) {
        this._afterFinish && this._afterFinish({feature: this._feature, position});
    }
}