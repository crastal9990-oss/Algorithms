import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import BaseLayer from "../../BaseLayer";
import InflectionPoint from "./InflectionPoint";
import Point from "../base/Point";
import Line from "../base/Line";
import Circle from "../base/Circle";

export default class EditableCircle extends Circle {
    constructor(options) {
        super(options);
        this._options = options;
        this._baseLayer = options.baseLayer;
        this._layerId = generateUUID();
        this._layer = new BaseLayer({
            id: this._layerId,
            map: options.map,
            layerConfig: {
                layout: {
                    symbol: {
                        'icon-image': ['get', 'useIcon'],
                        'icon-size': ['coalesce', ['get', 'iconSize'], 1],
                        'icon-anchor': 'center',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true
                    }
                },
                paint: {
                    line: {
                        'line-color': options.properties.areaColor || options.properties.lineColor || "#1164FF",
                        'line-width': options.properties.lineWidth || 4
                    }
                }
            }
        });
    }

    // 上层更新
    upperUpdate(updateData) {
        this.initLine(updateData.options);
        this.update(updateData);
    }
    // 初始化
    initClass() {
        this.initLine(this._options);
    }
    // 初始化线
    initLine(options) {
        // 
    }
    // 初始化点
    initPoint() {
        const coordinates = this.geometry.coordinates;
        const id = `${this.id}-point-`;
        let iconImg = new InflectionPoint({});
        if (iconImg) {
            const iconId = `InflectionPoint-`;
            let point = new EditableCirclePoint({
                geometry: {type: Node.POINT, coordinates},
                properties: {
                    id,
                    parentId: this.id,
                    sourceType: Node.CIRCLE,
                    drawType: Node.POINT,
                    useIcon: iconId,
                    icons: [{id: iconId, url: iconImg._iconImg.src}]
                }
            });
            this._layer.addFeature(point);
        }
    }
    // 移除点
    removePoint() {
        const id = `${this.id}-point-`;
        this._layer.removeFeatureById(id);
    }
    // 选中
    onSelect(props) {
        this.selected = true;
        this.removePoint();
        this.initPoint();
    }
    // 取消选中
    unSelect(props) {
        this.selected = false;
        this.removePoint();
    }
    // 移动点
    move(map, args) {
        const {source, position} = args;
    }
    // 移动半径
    moveRadius(map, args) {
        const {source, radius} = args;
    }
    // 销毁
    destroyClass() {
        this._layer && this._layer.destroy();
    }
}

class EditableCircleLine extends Line {
    constructor(options) {
        super(options);
        this._canEdit = true;
    }
    get canEdit() {
        return this._canEdit;
    }

    onSelect({map}) {
        if (this.properties.parentId) {
            let feature = map.featuresCache.getCacheById(this.properties.parentId);
            feature && feature.onSelect({map});
        }
    }
    unSelect({map}) {
        if (this.properties.parentId) {
            let feature = map.featuresCache.getCacheById(this.properties.parentId);
            feature && feature.unSelect({map});
        }
    }
}

class EditableCirclePoint extends Point {
    constructor(options) {
        super(options);
        this._canEdit = true;
    }
    get canEdit() {
        return this._canEdit;
    }

    move(map, args) {
        if (this.properties.parentId) {
            let feature = map.featuresCache.getCacheById(this.properties.parentId);
            feature && feature.move(map, args);
        }
    }
}