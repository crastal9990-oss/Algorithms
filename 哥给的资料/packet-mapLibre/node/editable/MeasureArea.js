import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import Line from "../base/Line";
import Polygon from "../base/Polygon";
import Circle from "../base/Circle";

export default class MeasureArea {
    static NAME = "MEASURE_AREA";
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
        this._name = MeasureArea.NAME;
        this._color = props.color ? props.color : "#FF0000";
        this._layer = props.layer;
        this._primitive = null;
        this._mousePosition = null;
        this._points = [];
        this._drawing = false;
        this._area = 0;
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
            this.primitive.draw(this.layer, [[...this._points, this._mousePosition, this._points[0]]]);
            let {feature} = this.layer.getFeatureById(`${this.primitive.id}-line`, Node.LINE);
            feature && feature.draw(this.layer, [...this._points, this._mousePosition]);
        }
    }
    dblclick(map, event) {
        if (this._points.length < 3) return;
        this._finish();
        map.getCanvas().style.cursor = "default";
        this._drawing = false;
        this.primitive.draw(this.layer, [[...this._points, this._points[0]]]);
        let {feature} = this.layer.getFeatureById(`${this.primitive.id}-line`, Node.LINE);
        feature && feature.draw(this.layer, [...this._points, this._points[0]]);
    }
    _addPointCall(lonLat) {
        let id = '';
        if (!this.primitive) {
            id = generateUUID();
            this.primitive = new TemporaryMeasureArea({
                geometry: {type: Node.POLYGON, coordinates: [[lonLat, lonLat, lonLat]]},
                properties: {
                    id,
                    sourceType: Node.POLYGON,
                    drawType: Node.POLYGON,
                    areaColor: this._color
                },
                otherFeature: {
                    line: new TemporaryMeasureAreaLine({
                        geometry: {type: Node.LINE, coordinates: [lonLat]},
                        properties: {
                            id: `${id}-line`,
                            sourceType: Node.POLYGON,
                            drawType: Node.LINE,
                            lineColor: this._color
                        }
                    })
                }
            });
            this.layer.addFeature(this.primitive);
        } else {
            id = this.primitive.id;
            this.primitive.draw(this.layer, [[...this._points, lonLat, this._points[0]]]);
            let {feature} = this.layer.getFeatureById(`${id}-line`, Node.LINE);
            feature.draw(this.layer, [...this._points, lonLat]);
        }
        this._points.push(lonLat);
        setTimeout(() => {
            // 添加每个节点的point样式
            let pointPrimitive = new TemporaryMeasureAreaPoint({
                geometry: {type: Node.CIRCLE, coordinates: lonLat},
                properties: {
                    id: `${id}-${this._points.length}`,
                    sourceType: Node.POINT,
                    drawType: Node.POINT,
                    pointColor: this._color
                }
            });
            this.layer.addFeature(pointPrimitive);
        }, 10);
        // 计算当前所有点围成的多边形面积（默认单位为㎡）
        let length = this._points.length;
        if (length >= 3) {
            let {feature} = this.layer.getFeatureById(this.primitive.id, Node.POLYGON);
            if (feature.geometry) {
                let area = turf.area(feature.geometry);
                this._area = area;
            }
        }
        this._drawIng && this._drawIng({
            index: length,
            id,
            type: 'polygon',
            point: lonLat,
            finish: false,
            area: this._area
        });
    }
    _finish() {
        this._afterFinish && this._afterFinish(this.primitive.id);
    }
}

class TemporaryMeasureArea extends Polygon {
    constructor(options) {
        super(options);
        this._color = options.properties.areaColor ? options.properties.areaColor : "#FF0000";
    }
    draw(layer, positions) {
        let {source, feature} = layer.getFeatureById(this.id, Node.POLYGON);
        feature && feature.update({source, options: {
            geometry: {...this.geometry, coordinates: positions},
            properties: this.properties
        }});
    }
    changePoint(layer, data, index) {
        let positions = [];
        let measureData = JSON.parse(JSON.stringify(data));
        measureData.points.splice(index, 1);
        let pointsLength = measureData.points.length;
        measureData.points.map((t, idx) => {
            t.index = idx + 1;
            t.id = `${measureData.id}-${idx + 1}`;
            t.area = 0;
            positions.push(t.coordinate);
            if (idx + 1 == pointsLength) {
                let polygon = {type: 'Polygon', coordinates: [positions]};
                let area = turf.area(polygon);
                t.area = area;
            }
            // 添加每个节点的point样式
            let pointPrimitive = new TemporaryMeasureAreaPoint({
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
        positions = [...positions, positions[0]];
        this.draw(layer, [positions]);
        let {feature} = layer.getFeatureById(`${this.id}-line`, Node.LINE);
        feature && feature.draw(layer, positions);
        return measureData.points;
    }
}

class TemporaryMeasureAreaLine extends Line {
    constructor(options) {
        super(options);
    }
    draw(layer, positions) {
        let {source, feature} = layer.getFeatureById(this.id, Node.LINE);
        feature && feature.update({source, options: {
            geometry: {...this.geometry, coordinates: positions},
            properties: this.properties
        }});
    }
}

class TemporaryMeasureAreaPoint extends Circle {
    constructor(options) {
        super(options);
    }
}