import Node from "../base/Node";

export default class DrawPointOperation {
    static NAME = "DRAW_POINT_OPERATION";
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
        this._name = DrawPointOperation.NAME;
        this._afterFinish = props.afterFinish;
    }
    get name() {
        return this._name;
    }
    get eventMap() {
        return this._eventMap;
    }

    click(map, event) {
        let nowLngLat = [event.lngLat.lng, event.lngLat.lat];
        if (!nowLngLat) return;
        this._finish(nowLngLat);
    }
    _finish(position) {
        this._afterFinish && this._afterFinish(position);
    }
}