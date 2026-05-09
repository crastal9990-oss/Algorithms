import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import BaseLayer from "../../BaseLayer";
import Line from "../base/Line";
import Polygon from "../base/Polygon";
import Circle from "../base/Circle";

export default class DrawPolygonOperation {
    static NAME = "DRAW_POLYGON_OPERATION";
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
        this._name = DrawPolygonOperation.NAME;
        this._layer = new BaseLayer({
            id: DrawPolygonOperation.NAME,
            map: props.map,
            layerConfig: {
                layout: {circle: {}, fill: {}},
                paint: {
                    line: {
                        'line-color': props.color || "#1164FF",
                        'line-width': props.lineWidth || 4
                    },
                    fill: {
                        'fill-color': props.color || "#1164FF",
                        'fill-opacity': props.alpha || 0.3
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
            this.primitive.draw(this.layer, [[...this._points, nowLngLat, this._points[0]]]);
            let {feature} = this.layer.getFeatureById(`${this.id}-line`, Node.LINE);
            feature && feature.draw(this.layer, [...this._points, nowLngLat]);
        }
    }
    dblclick(map, event) {
        if (this._points.length < 3) return;
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
            this.primitive = new TemporaryDrawArea({
                geometry: {type: Node.POLYGON, coordinates: [[lonLat, lonLat, lonLat]]},
                properties: {
                    id,
                    sourceType: Node.POLYGON,
                    drawType: Node.POLYGON
                },
                otherFeature: {
                    line: new TemporaryDrawLine({
                        geometry: {type: Node.LINE, coordinates: [lonLat]},
                        properties: {
                            id: `${id}-line`,
                            sourceType: Node.POLYGON,
                            drawType: Node.LINE
                        }
                    })
                }
            });
            this.layer.addFeature(this.primitive);
        } else {
            this.primitive.draw(this.layer, [[...this._points, lonLat, this._points[0]]]);
            let {feature} = this.layer.getFeatureById(`${id}-line`, Node.LINE);
            feature.draw(this.layer, [...this._points, lonLat]);
        }
        this._points.push(lonLat);
        setTimeout(() => {
            // 添加每个节点的point样式
            let pointPrimitive = new TemporaryDrawAreaPoint({
                geometry: {type: Node.CIRCLE, coordinates: lonLat},
                properties: {
                    id: `${id}-${this._points.length}`,
                    sourceType: Node.POLYGON,
                    drawType: Node.POINT
                }
            });
            this.layer.addFeature(pointPrimitive);
        }, 10);
    }
    _finish() {
        this._afterFinish && this._afterFinish([[...this._points, this._points[0]]]);
    }
}

class TemporaryDrawArea extends Polygon {
    constructor(options) {
        super(options);
    }
    draw(layer, positions) {
        let {source, feature} = layer.getFeatureById(this.id, Node.POLYGON);
        feature && feature.update({source, options: {
            geometry: {...this.geometry, coordinates: positions},
            properties: this.properties
        }});
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

class TemporaryDrawAreaPoint extends Circle {
    constructor(options) {
        super(options);
    }
}