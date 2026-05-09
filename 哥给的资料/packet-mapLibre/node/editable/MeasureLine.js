import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import Line from "../base/Line";
import Circle from "../base/Circle";

export default class MeasureLine {
    static NAME = "MEASURE_LINE";
    constructor(props) {
        this._map = props.map;
        this._eventMap = [
            {
                type: "click",
                callback: (event) => {
                    this.click(this._map, event);
                }
            },
            {
                type: "mousemove",
                callback: (event) => {
                    this.mousemove(this._map, event);
                }
            },
            {
                type: "dblclick",
                callback: (event) => {
                    this.dblclick(this._map, event);
                }
            }
        ];
        this._name = MeasureLine.NAME;
        this._color = props.color ? props.color : "#FF0000";
        this._layer = props.layer;
        this._primitive = null;
        this._mousePosition = null;
        this._points = [];
        this._drawing = false;
        this._distance = 0;
        this._drawIng = props.drawIng;
        this._afterFinish = props.afterFinish;
    }
    get name() {
        return this._name;
    }
    get eventMap() {
        return this._eventMap;
    }
    set primitive(value) {
        this._primitive = value;
    }
    get primitive() {
        return this._primitive;
    }
    get layer() {
        return this._layer;
    }

    click(map, event) {
        let nowLngLat = [event.lngLat.lng, event.lngLat.lat];
        if (!nowLngLat) return;
        this._drawing = true;
        let length = this._points.length;
        if (length) {
            let lastPoint = this._points[length - 1];
            if (lastPoint[0] == nowLngLat[0] && lastPoint[1] == nowLngLat[1]) return;
        }
        this._addPointCall(nowLngLat);
    }
    mousemove(map, event) {
        let nowLngLat = [event.lngLat.lng, event.lngLat.lat];
        if (nowLngLat) {
            this._mousePosition = nowLngLat;
        }
        if (this.primitive) {
            this.primitive.draw(this.layer, [...this._points, this._mousePosition]);
        }
    }
    dblclick(map, event) {
        if (this._points.length < 2) return;
        this._finish();
        map.getCanvas().style.cursor = "default";
        this._drawing = false;
    }
    _addPointCall(lonLat) {
        let id = '';
        if (!this.primitive) {
            id = generateUUID();
            this.primitive = new TemporaryMeasureLine({
                geometry: {type: Node.LINE, coordinates: [lonLat]},
                properties: {
                    id,
                    sourceType: Node.LINE,
                    drawType: Node.LINE,
                    lineColor: this._color
                }
            });
            this.layer.addFeature(this.primitive);
        } else {
            id = this.primitive.id;
            this.primitive.draw(this.layer, [...this._points, lonLat]);
        }
        this._points.push(lonLat);
        // 添加每个节点的point样式
        let pointPrimitive = new TemporaryMeasureLinePoint({
            geometry: {type: Node.CIRCLE, coordinates: lonLat},
            properties: {
                id: `${id}-${this._points.length}`,
                sourceType: Node.POINT,
                drawType: Node.POINT,
                pointColor: this._color
            }
        });
        this.layer.addFeature(pointPrimitive);
        // 计算当前点个上一个点的距离（默认单位为m）
        let length = this._points.length;
        if (length > 1) {
            const point1 = turf.point(this._points[length - 2]);
            const point2 = turf.point(this._points[length - 1]);
            const distance = turf.distance(point1, point2, {units: 'meters'});
            this._distance += distance;
        }
        this._drawIng && this._drawIng({
            index: length,
            id,
            type: 'line',
            point: lonLat,
            finish: false,
            distance: this._distance
        });
    }
    _finish() {
        this._afterFinish && this._afterFinish(this.primitive.id);
    }
}

class TemporaryMeasureLine extends Line {
    constructor(options) {
        super(options);
        this._color = options.properties.lineColor ? options.properties.lineColor : "#FF0000";
    }
    draw(layer, positions) {
        let {source, feature} = layer.getFeatureById(this.id, Node.LINE);
        feature && feature.update({source, options: {
            geometry: {...this.geometry, coordinates: positions},
            properties: this.properties
        }});
    }
    changePoint(layer, data, index) {
        let positions = [];
        let measureData = JSON.parse(JSON.stringify(data));
        measureData.points.splice(index, 1);
        let pointDistance = 0;
        measureData.points.map((t, idx) => {
            t.index = idx + 1;
            t.id = `${measureData.id}-${idx + 1}`;
            if (t.index == 1) {
                t.distance = pointDistance;
            } else {
                const point1 = turf.point(measureData.points[idx - 1].coordinate);
                const point2 = turf.point(t.coordinate);
                const distance = turf.distance(point1, point2, {units: 'meters'});
                pointDistance += distance;
                t.distance = pointDistance;
            }
            positions.push(t.coordinate);
            // 添加每个节点的point样式
            let pointPrimitive = new TemporaryMeasureLinePoint({
                geometry: {type: Node.CIRCLE, coordinates: t.coordinate},
                properties: {
                    id: t.id,
                    sourceType: Node.POINT,
                    drawType: Node.POINT,
                    pointColor: this._color
                }
            });
            layer.addFeature(pointPrimitive);
        });
        this.draw(layer, positions);
        return measureData.points;
    }
}

class TemporaryMeasureLinePoint extends Circle {
    constructor(options) {
        super(options);
    }
}