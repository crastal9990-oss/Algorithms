import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import BaseLayer from "../../BaseLayer";
import Line from "../base/Line";
import Circle from "../base/Circle";

export default class DrawPolyLineOperation {
    static NAME = "DRAW_POLYLINE_OPERATION";
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
        this._id = generateUUID();
        this._name = DrawPolyLineOperation.NAME;
        this._layer = new BaseLayer({
            id: DrawPolyLineOperation.NAME,
            map: props.map,
            layerConfig: {
                layout: {circle: {}},
                paint: {
                    line: {
                        'line-color': props.color || "#1164FF",
                        'line-width': props.lineWidth || 4
                    },
                    circle: {
                        'circle-radius': props.lineWidth ? props.lineWidth * 2 : 8,
                        'circle-color': '#fff'
                    }
                }
            }
        });
        this._primitive = null;
        this._points = [];
        this._afterFinish = props.afterFinish;
    }
    get id() {
        return this._id;
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
        let length = this._points.length;
        if (length) {
            let lastPoint = this._points[length - 1];
            if (lastPoint[0] == nowLngLat[0] && lastPoint[1] == nowLngLat[1]) return;
        }
        this._addPointCall(nowLngLat);
    }
    mousemove(map, event) {
        let nowLngLat = [event.lngLat.lng, event.lngLat.lat];
        if (this.primitive) {
            this.primitive.draw(this.layer, [...this._points, nowLngLat]);
        }
    }
    dblclick(map, event) {
        if (this._points.length < 2) return;
        this._finish();
        map.getCanvas().style.cursor = "default";
        setTimeout(() => {
            this.layer.destroy();
            this._layer = null;
        });
    }
    _addPointCall(lonLat) {
        let id = this.id;
        if (!this.primitive) {
            this.primitive = new TemporaryDrawLine({
                geometry: {type: Node.LINE, coordinates: [lonLat]},
                properties: {
                    id,
                    sourceType: Node.LINE,
                    drawType: Node.LINE
                }
            });
            this.layer.addFeature(this.primitive);
        } else {
            this.primitive.draw(this.layer, [...this._points, lonLat]);
        }
        this._points.push(lonLat);
        // 添加每个节点的point样式
        let pointPrimitive = new TemporaryDrawLinePoint({
            geometry: {type: Node.CIRCLE, coordinates: lonLat},
            properties: {
                id: `${id}-${this._points.length}`,
                sourceType: Node.LINE,
                drawType: Node.POINT
            }
        });
        this.layer.addFeature(pointPrimitive);
    }
    _finish() {
        this._afterFinish && this._afterFinish(this._points);
    }
}

class TemporaryDrawLine extends Line {
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

class TemporaryDrawLinePoint extends Circle {
    constructor(options) {
        super(options);
    }
}