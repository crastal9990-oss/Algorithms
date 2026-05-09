import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import BaseLayer from "../../BaseLayer";
import InflectionPoint from "./InflectionPoint";
import Point from "../base/Point";
import Line from "../base/Line";

export default class EditableLine extends Line {
    constructor(options) {
        super(options);
        this._options = options;
        this._map = options.map;
        this._lineColor = options.properties.lineColor || "#1164FF";
        this._baseLayer = options.baseLayer;
        this._layerId = generateUUID();
        this._layer = new BaseLayer({
            id: this._layerId,
            map: this._map,
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
                paint: {}
            }
        });
    }

    // 上层更新
    upperUpdate(updateData) {
        this.update(updateData);
        if (JSON.stringify(this._options.geometry) != JSON.stringify(updateData.options.geometry)) {
            this.selected && this.onSelect();
        }
        this._options = updateData.options;
        let lineColor = this._options.properties.lineColor;
        if (lineColor != this._lineColor) {
            this._lineColor = lineColor;
            this.selected && this.onSelect();
        }
    }
    // 初始化点
    initPoint() {
        const coordinates = this.geometry.coordinates;
        for (let i = 0; i < coordinates.length; i++) {
            const item = coordinates[i];
            const id = `${this.id}-point-${i + 1}`;
            let iconImg = new InflectionPoint({index: i + 1, color: this._lineColor});
            if (iconImg) {
                const iconId = `InflectionPoint-${this._lineColor}-${i + 1}`;
                let point = new EditableLinePoint({
                    geometry: {type: Node.POINT, coordinates: item},
                    properties: {
                        index: i + 1,
                        id,
                        parentId: this.id,
                        sourceType: Node.LINE,
                        drawType: Node.POINT,
                        useIcon: iconId,
                        icons: [{id: iconId, url: iconImg._iconImg.src}]
                    }
                });
                this._layer.addFeature(point);
            }
        }
    }
    // 移除点
    removePoint() {
        this.geometry.coordinates.map((item, index) => {
            const id = `${this.id}-point-${index + 1}`;
            this._layer.removeFeatureById(id);
        });
    }
    // 获取点
    getInflectionPoint() {
        let points = [];
        const coordinates = this.geometry.coordinates;
        for (let i = 0; i < coordinates.length; i++) {
            points.push({point: coordinates[i], id: `${this.id}-point-${i + 1}`});
        }
        return points;
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
        const {index, source, position} = args;
        let coordinates = this.geometry.coordinates;
        coordinates[index - 1] = position;
        // 更新父级元素
        let {source: parentSource} = this._baseLayer.getFeatureById(this.id, Node.LINE);
        let options = {
            geometry: {type: Node.LINE, coordinates: coordinates},
            properties: {...this.properties}
        };
        // 判断父级元素是否有symbol特征
        if (this.otherFeature && this.otherFeature.symbol) {
            let {source: labelSource, feature: labelFeature} = this._baseLayer.getFeatureById(
                `${this.id}-symbol`,
                Node.POINT
            );
            if (labelFeature) {
                options.otherFeatures = [{
                    featureData: labelFeature,
                    sourceData: {source: labelSource},
                    options: {
                        geometry: {type: Node.POINT, coordinates: coordinates[0]},
                        properties: {...labelFeature.properties}
                    }
                }];
            }
        }
        this.update({source: parentSource, options});
        // 更新point元素
        let {feature: pointFeature} = this._layer.getFeatureById(
            `${this.id}-point-${index}`,
            Node.POINT
        );
        if (pointFeature) {
            pointFeature.update({source, options: {
                geometry: {type: Node.POINT, coordinates: position},
                properties: {...pointFeature.properties}
            }});
        }
    }
    // 删除点
    deletePoint(index) {
        this.removePoint();
        const coordinates = this.geometry.coordinates;
        coordinates.splice(index, 1);
        // 更新父级元素
        let {source: parentSource} = this._baseLayer.getFeatureById(this.id, Node.LINE);
        let options = {
            geometry: {type: Node.LINE, coordinates: coordinates},
            properties: {...this.properties}
        };
        // 判断父级元素是否有symbol特征
        if (this.otherFeature && this.otherFeature.symbol) {
            let {source: labelSource, feature: labelFeature} = this._baseLayer.getFeatureById(
                `${this.id}-symbol`,
                Node.POINT
            );
            if (labelFeature) {
                options.otherFeatures = [{
                    featureData: labelFeature,
                    sourceData: {source: labelSource},
                    options: {
                        geometry: {type: Node.POINT, coordinates: coordinates[0]},
                        properties: {...labelFeature.properties}
                    }
                }];
            }
        }
        this.update({source: parentSource, options});
        this.onSelect();
    }
    // 插入点完成后
    insertCompleted(index, position) {
        this.removePoint();
        const coordinates = this.geometry.coordinates;
        coordinates.splice(index + 1, 0, position);
        // 更新父级元素
        let {source: parentSource} = this._baseLayer.getFeatureById(this.id, Node.LINE);
        let options = {
            geometry: {type: Node.LINE, coordinates: coordinates},
            properties: {...this.properties}
        };
        // 判断父级元素是否有symbol特征
        if (this.otherFeature && this.otherFeature.symbol) {
            let {source: labelSource, feature: labelFeature} = this._baseLayer.getFeatureById(
                `${this.id}-symbol`,
                Node.POINT
            );
            if (labelFeature) {
                options.otherFeatures = [{
                    featureData: labelFeature,
                    sourceData: {source: labelSource},
                    options: {
                        geometry: {type: Node.POINT, coordinates: coordinates[0]},
                        properties: {...labelFeature.properties}
                    }
                }];
            }
        }
        this.update({source: parentSource, options});
        this.onSelect();
    }
    // 销毁
    destroyClass() {
        this._layer && this._layer.destroy();
    }
}

class EditableLinePoint extends Point {
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