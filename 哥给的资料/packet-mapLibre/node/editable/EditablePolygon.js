import {generateUUID} from "@/util/util";
import Node from "../base/Node";
import BaseLayer from "../../BaseLayer";
import InflectionPoint from "./InflectionPoint";
import Point from "../base/Point";
import Line from "../base/Line";
import Polygon from "../base/Polygon";

export default class EditablePolygon extends Polygon {
    constructor(options) {
        super(options);
        this._options = options;
        this._map = options.map;
        this._lineColor = options.properties.areaColor || options.properties.lineColor || "#1164FF";
        this._lineWidth = options.properties.lineWidth || 4;
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
                paint: {
                    line: {
                        'line-color': ['coalesce', ['get', 'lineColor'], '#1164FF'],
                        'line-width': ['coalesce', ['get', 'lineWidth'], 4]
                    }
                }
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
        let lineColor = this._options.properties.areaColor || this._options.properties.lineColor;
        let lineWidth = this._options.properties.lineWidth;
        if (lineColor != this._lineColor || lineWidth != this._lineWidth) {
            this._lineColor = lineColor;
            this._lineWidth = lineWidth;
            this.selected && this.onSelect();
        }
        this.initLine(updateData.options);
    }
    // 初始化
    initClass() {
        this.initLine(this._options);
    }
    // 初始化线
    initLine(options) {
        let {source, feature} = this._layer.getFeatureById(
            `${this.id}-line`,
            Node.LINE
        );
        if (feature) {
            feature.update({source, options: {
                geometry: {type: Node.LINE, coordinates: options.geometry.coordinates[0]},
                properties: {
                    ...feature.properties,
                    lineColor: this._lineColor,
                    lineWidth: this._lineWidth,
                    visibility: options.properties.visibility
                }
            }});
        } else {
            feature = new EditablePolygonLine({
                geometry: {type: Node.LINE, coordinates: this.geometry.coordinates[0]},
                properties: {
                    id: `${this.id}-line`,
                    parentId: this.id,
                    sourceType: Node.POLYGON,
                    drawType: Node.LINE,
                    lineColor: this._lineColor,
                    lineWidth: this._lineWidth,
                    visibility: options.properties.visibility
                }
            });
            this._layer.addFeature(feature);
            this._baseLayer.moveLayerToTop(Node.LINE);
            this._baseLayer.moveLayerToTop(Node.POINT);
        }
    }
    // 初始化点
    initPoint() {
        const coordinates = this.geometry.coordinates[0];
        for (let i = 0; i < coordinates.length - 1; i++) {
            const item = coordinates[i];
            const id = `${this.id}-point-${i + 1}`;
            let iconImg = new InflectionPoint({index: i + 1, color: this._lineColor});
            if (iconImg) {
                const iconId = `InflectionPoint-${this._lineColor}-${i + 1}`;
                let point = new EditablePolygonPoint({
                    geometry: {type: Node.POINT, coordinates: item},
                    properties: {
                        index: i + 1,
                        id,
                        parentId: this.id,
                        sourceType: Node.POLYGON,
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
        this.geometry.coordinates[0].map((item, index) => {
            const id = `${this.id}-point-${index + 1}`;
            this._layer.removeFeatureById(id);
        });
    }
    // 获取点
    getInflectionPoint() {
        let points = [];
        const coordinates = this.geometry.coordinates[0];
        for (let i = 0; i < coordinates.length - 1; i++) {
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
        let coordinates = this.geometry.coordinates[0];
        coordinates[index - 1] = position;
        if (index === 1) {
            coordinates[coordinates.length - 1] = position;
        }
        // 更新父级元素
        let {source: parentSource} = this._baseLayer.getFeatureById(this.id, Node.POLYGON);
        let options = {
            geometry: {type: Node.POLYGON, coordinates: [coordinates]},
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
        // 更新line元素
        let {source: lineSource, feature: lineFeature} = this._layer.getFeatureById(
            `${this.id}-line`,
            Node.LINE
        );
        if (lineFeature) {
            lineFeature.update({source: lineSource, options: {
                geometry: {type: Node.LINE, coordinates: coordinates},
                properties: {...lineFeature.properties}
            }});
        }
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
        const coordinates = this.geometry.coordinates[0];
        coordinates.splice(index, 1);
        if (index + 1 == 1) {
            coordinates[coordinates.length - 1] = coordinates[0];
        }
        // 更新父级元素
        let {source: parentSource} = this._baseLayer.getFeatureById(this.id, Node.POLYGON);
        let options = {
            geometry: {type: Node.POLYGON, coordinates: [coordinates]},
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
        // 更新line元素
        let {source: lineSource, feature: lineFeature} = this._layer.getFeatureById(
            `${this.id}-line`,
            Node.LINE
        );
        if (lineFeature) {
            lineFeature.update({source: lineSource, options: {
                geometry: {type: Node.LINE, coordinates: coordinates},
                properties: {...lineFeature.properties}
            }});
        }
        this.onSelect();
    }
    // 插入点完成后
    insertCompleted(index, position) {
        this.removePoint();
        const coordinates = this.geometry.coordinates[0];
        coordinates.splice(index + 1, 0, position);
        // 更新父级元素
        let {source: parentSource} = this._baseLayer.getFeatureById(this.id, Node.POLYGON);
        let options = {
            geometry: {type: Node.POLYGON, coordinates: [coordinates]},
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
        // 更新line元素
        let {source: lineSource, feature: lineFeature} = this._layer.getFeatureById(
            `${this.id}-line`,
            Node.LINE
        );
        if (lineFeature) {
            lineFeature.update({source: lineSource, options: {
                geometry: {type: Node.LINE, coordinates: coordinates},
                properties: {...lineFeature.properties}
            }});
        }
        this.onSelect();
    }
    // 销毁
    destroyClass() {
        this._layer && this._layer.destroy();
    }
}

class EditablePolygonLine extends Line {
    constructor(options) {
        super(options);
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

class EditablePolygonPoint extends Point {
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