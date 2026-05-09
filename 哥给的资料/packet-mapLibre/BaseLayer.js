import NodeMap from './node/index';

class BaseLayer {
    constructor(props) {
        this._map = props.map;
        this._id = props.id;
        this._symbolLayerId = `${props.id}-symbol-layer`;
        this._circleLayerId = `${props.id}-circle-layer`;
        this._lineLayerId = `${props.id}-line-layer`;
        this._fillLayerId = `${props.id}-fill-layer`;
        this._layerTypes = ['symbol', 'circle', 'line', 'fill'];
        // symbol/circle/line/fill
        this._status = 'normal'; // normal和destroy
        this._layerConfig = props.layerConfig || {};
        this._otherConfig = props.otherConfig || {};
    }
    get id() {
        return this._id;
    }
    get symbolLayerId() {
        return this._symbolLayerId;
    }
    get circleLayerId() {
        return this._circleLayerId;
    }
    get lineLayerId() {
        return this._lineLayerId;
    }
    get fillLayerId() {
        return this._fillLayerId;
    }

    // 获取默认Layout(根据类型)
    _getDefaultLayout(layerType) {
        const defaults = {
            symbol: {
                'icon-image': 'marker-15',
                'icon-size': 1,
                'icon-anchor': 'bottom',
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': 12,
                'text-offset': [0, -1.5]
            },
            circle: {
                'circle-sort-key': ['get', 'sortKey']
            },
            line: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            fill: {
                'fill-antialias': true
            }
        };
        return defaults[layerType] || {};
    }
    // 获取默认Paint(根据类型)
    _getDefaultPaint(layerType) {
        const defaults = {
            symbol: {},
            circle: {
                'circle-radius': 8,
                'circle-color': '#3498db',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff'
            },
            line: {
                'line-width': 3,
                'line-color': '#e74c3c'
            },
            fill: {
                'fill-color': '#2ecc71',
                'fill-opacity': 0.6,
                'fill-outline-color': '#27ae60'
            }
        };
        return defaults[layerType] || {};
    }
    // 查找是否已经添加了指定类型的layer到map中
    _isLayerExist(layerType) {
        const layerId = `${this._id}-${layerType}-layer`;
        return this._map.style ? this._map.getLayer(layerId) : null;
    }
    // 初始化symbolLayer图层
    INITsymbolLayer() {
        let symbolLayerConfig = {
            id: this.symbolLayerId,
            type: 'symbol',
            filter: ['in', ['get', 'visibility'], ['literal', ['visible', '', 'show', true, null]]],
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            },
            layout: {...this._getDefaultLayout('symbol')},
            paint: {...this._getDefaultPaint('symbol')}
        };
        if (this._otherConfig && this._otherConfig['symbol']) {
            symbolLayerConfig = {...symbolLayerConfig, ...this._otherConfig['symbol']};
        }
        if (this._layerConfig.layout && this._layerConfig.layout['symbol']) {
            symbolLayerConfig.layout = {...this._layerConfig.layout['symbol']};
        }
        if (this._layerConfig.paint && this._layerConfig.paint['symbol']) {
            symbolLayerConfig.paint = {...this._layerConfig.paint['symbol']};
        }
        this._map.addLayer(symbolLayerConfig);
    }
    // 初始化circleLayer图层
    INITcircleLayer() {
        let circleLayerConfig = {
            id: this.circleLayerId,
            type: 'circle',
            filter: ['in', ['get', 'visibility'], ['literal', ['visible', '', 'show', true, null]]],
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            },
            layout: {...this._getDefaultLayout('circle')},
            paint: {...this._getDefaultPaint('circle')}
        };
        if (this._otherConfig && this._otherConfig['circle']) {
            circleLayerConfig = {...circleLayerConfig, ...this._otherConfig['circle']};
        }
        if (this._layerConfig.layout && this._layerConfig.layout['circle']) {
            circleLayerConfig.layout = {...this._layerConfig.layout['circle']};
        }
        if (this._layerConfig.paint && this._layerConfig.paint['circle']) {
            circleLayerConfig.paint = {...this._layerConfig.paint['circle']};
        }
        this._map.addLayer(circleLayerConfig);
    }
    // 初始化LineLayer图层
    INITlineLayer() {
        let lineLayerConfig = {
            id: this.lineLayerId,
            type: 'line',
            filter: ['in', ['get', 'visibility'], ['literal', ['visible', '', 'show', true, null]]],
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            },
            layout: {...this._getDefaultLayout('line')},
            paint: {...this._getDefaultPaint('line')}
        };
        if (this._otherConfig && this._otherConfig['line']) {
            lineLayerConfig = {...lineLayerConfig, ...this._otherConfig['line']};
        }
        if (this._layerConfig.layout && this._layerConfig.layout['line']) {
            lineLayerConfig.layout = {...this._layerConfig.layout['line']};
        }
        if (this._layerConfig.paint && this._layerConfig.paint['line']) {
            lineLayerConfig.paint = {...this._layerConfig.paint['line']};
        }
        this._map.addLayer(lineLayerConfig);
    }
    // 初始化FillLayer图层
    INITfillLayer() {
        let fillLayerConfig = {
            id: this.fillLayerId,
            type: 'fill',
            filter: ['in', ['get', 'visibility'], ['literal', ['visible', '', 'show', true, null]]],
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                },
                tolerance: 0,
                lineMetrics: true
            },
            layout: {...this._getDefaultLayout('fill')},
            paint: {...this._getDefaultPaint('fill')}
        };
        if (this._otherConfig && this._otherConfig['fill']) {
            fillLayerConfig = {...fillLayerConfig, ...this._otherConfig['fill']};
        }
        if (this._layerConfig.layout && this._layerConfig.layout['fill']) {
            fillLayerConfig.layout = {...this._layerConfig.layout['fill']};
        }
        if (this._layerConfig.paint && this._layerConfig.paint['fill']) {
            fillLayerConfig.paint = {...this._layerConfig.paint['fill']};
        }
        this._map.addLayer(fillLayerConfig);
    }

    // 添加单个要素到指定的layer中
    async addFeature(feature) {
        if (this._status == 'destroy' || !feature) return;
        let layerType = '';
        if (feature.geometry.type == NodeMap.Node.POINT) {
            layerType = 'symbol';
        } else if (feature.geometry.type == NodeMap.Node.CIRCLE) {
            layerType = 'circle';
        } else if (feature.geometry.type == NodeMap.Node.LINE) {
            layerType = 'line';
        } else if (feature.geometry.type == NodeMap.Node.POLYGON) {
            layerType = 'fill';
        }
        if (!layerType) return;
        if (!this._isLayerExist(layerType)) {
            this[`INIT${layerType}Layer`]();
        }
        const layerId = `${this._id}-${layerType}-layer`;
        await this._map.ensureAllImages(feature.properties.icons);
        let featureData = JSON.parse(JSON.stringify(feature.feature));
        if (layerType == 'circle') {
            // 数据为circle时需要把feature.geometry.type给重置为NodeMap.Node.POINT
            featureData.geometry.type = NodeMap.Node.POINT;
        }
        this._map.getSource(layerId).updateData({add: [featureData]});
        this._map.featuresCache.addCache(feature);
        // 如果添加的当前要素中有otherFeature的symbol属性，需要添加symbol要素
        if (feature.otherFeature.symbol) {
            if (!this._isLayerExist('symbol')) {
                this.INITsymbolLayer();
            }
            const layerId = `${this._id}-symbol-layer`;
            // 这里手动修改symbol要素的id
            const symbolId = `${feature.id}-symbol`;
            feature.otherFeature.symbol._id = symbolId;
            feature.otherFeature.symbol._feature.id = symbolId;
            feature.otherFeature.symbol._feature.properties.id = symbolId;
            feature.otherFeature.symbol._properties.id = symbolId;
            this._map.getSource(layerId).updateData({add: [feature.otherFeature.symbol.feature]});
            this._map.featuresCache.addCache(feature.otherFeature.symbol);
        }
        // 如果添加的当前要素中有otherFeature的line属性，需要添加line要素
        if (feature.otherFeature.line) {
            if (!this._isLayerExist('line')) {
                this.INITlineLayer();
            }
            const layerId = `${this._id}-line-layer`;
            // 这里手动修改line要素的id
            const lineId = `${feature.id}-line`;
            feature.otherFeature.line._id = lineId;
            feature.otherFeature.line._feature.id = lineId;
            feature.otherFeature.line._feature.properties.id = lineId;
            feature.otherFeature.line._properties.id = lineId;
            this._map.getSource(layerId).updateData({add: [feature.otherFeature.line.feature]});
            this._map.featuresCache.addCache(feature.otherFeature.line);
        }
    }
    // 批量添加要素到指定的layer中
    async addFeatures(features) {
        if (this._status == 'destroy' || !features || !features.length) return;
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            let layerType = '';
            if (feature.geometry.type == NodeMap.Node.POINT) {
                layerType = 'symbol';
            } else if (feature.geometry.type == NodeMap.Node.CIRCLE) {
                layerType = 'circle';
            } else if (feature.geometry.type == NodeMap.Node.LINE) {
                layerType = 'line';
            } else if (feature.geometry.type == NodeMap.Node.POLYGON) {
                layerType = 'fill';
            }
            if (layerType) {
                if (!this._isLayerExist(layerType)) {
                    this[`INIT${layerType}Layer`]();
                }
                const layerId = `${this._id}-${layerType}-layer`;
                await this._map.ensureAllImages(feature.properties.icons);
                let featureData = JSON.parse(JSON.stringify(feature.feature));
                if (layerType == 'circle') {
                    // 数据为circle时需要把feature.geometry.type给重置为NodeMap.Node.POINT
                    featureData.geometry.type = NodeMap.Node.POINT;
                }
                this._map.getSource(layerId).updateData({add: [featureData]});
                this._map.featuresCache.addCache(feature);
                // 如果添加的当前要素中有otherFeature的symbol属性，需要添加symbol要素
                if (feature.otherFeature.symbol) {
                    if (!this._isLayerExist('symbol')) {
                        this.INITsymbolLayer();
                    }
                    const layerId = `${this._id}-symbol-layer`;
                    // 这里手动修改symbol要素的id
                    const symbolId = `${feature.id}-symbol`;
                    feature.otherFeature.symbol._id = symbolId;
                    feature.otherFeature.symbol._feature.id = symbolId;
                    feature.otherFeature.symbol._feature.properties.id = symbolId;
                    feature.otherFeature.symbol._properties.id = symbolId;
                    this._map.getSource(layerId).updateData({add: [feature.otherFeature.symbol.feature]});
                    this._map.featuresCache.addCache(feature.otherFeature.symbol);
                }
                // 如果添加的当前要素中有otherFeature的line属性，需要添加line要素
                if (feature.otherFeature.line) {
                    if (!this._isLayerExist('line')) {
                        this.INITlineLayer();
                    }
                    const layerId = `${this._id}-line-layer`;
                    // 这里手动修改line要素的id
                    const lineId = `${feature.id}-line`;
                    feature.otherFeature.line._id = lineId;
                    feature.otherFeature.line._feature.id = lineId;
                    feature.otherFeature.line._feature.properties.id = lineId;
                    feature.otherFeature.line._properties.id = lineId;
                    this._map.getSource(layerId).updateData({add: [feature.otherFeature.line.feature]});
                    this._map.featuresCache.addCache(feature.otherFeature.line);
                }
            };
        }
    }
    // 提升指定图层到顶层
    moveLayerToTop(featureType) {
        if (!featureType) return;
        let layerType = '';
        if (featureType == NodeMap.Node.POINT) {
            layerType = 'symbol';
        } else if (featureType == NodeMap.Node.CIRCLE) {
            layerType = 'circle';
        } else if (featureType == NodeMap.Node.LINE) {
            layerType = 'line';
        } else if (featureType == NodeMap.Node.POLYGON) {
            layerType = 'fill';
        }
        if (!layerType) return;
        const layerId = `${this._id}-${layerType}-layer`;
        if (this._isLayerExist(layerType)) {
            this._map.moveLayer(layerId); // 将指定图层提升到最顶层
        }
    }
    // 将指定图层到移动到指定位置的上方还是下方
    moveLayerToBLayerId(insertFeatureType, referenceFeatureType, type = 'above') {
        if (!insertFeatureType || !referenceFeatureType) return;
        let insert = '';
        let reference = '';
        if (insertFeatureType == NodeMap.Node.POINT) {
            insert = 'symbol';
        } else if (insertFeatureType == NodeMap.Node.CIRCLE) {
            insert = 'circle';
        } else if (insertFeatureType == NodeMap.Node.LINE) {
            insert = 'line';
        } else if (insertFeatureType == NodeMap.Node.POLYGON) {
            insert = 'fill';
        }
        if (referenceFeatureType == NodeMap.Node.POINT) {
            reference = 'symbol';
        } else if (referenceFeatureType == NodeMap.Node.CIRCLE) {
            reference = 'circle';
        } else if (referenceFeatureType == NodeMap.Node.LINE) {
            reference = 'line';
        } else if (referenceFeatureType == NodeMap.Node.POLYGON) {
            reference = 'fill';
        }
        if (!insert || !reference) return;
        const insertLayerId = `${this._id}-${insert}-layer`;
        const referenceLayerId = `${this._id}-${reference}-layer`;
        if (this._isLayerExist(insert) && this._isLayerExist(reference)) {
            if (type == 'above') {
                this._map.moveLayer(referenceLayerId, insertLayerId); // 将指定图层到移动到指定位置的上方
            } else {
                this._map.moveLayer(insertLayerId, referenceLayerId); // 将指定图层到移动到指定位置的下方
            }
        }
    }
    // 删除指定的id要素
    removeFeatureById(featureId) {
        if (!featureId) return;
        const layerTypes = this._layerTypes;
        for (let i = 0; i < layerTypes.length; i++) {
            const layerType = layerTypes[i];
            const layerId = `${this._id}-${layerType}-layer`;
            if (this._map.style) {
                const source = this._map.getSource(layerId);
                if (source) {
                    source.updateData({remove: [featureId, `${featureId}-symbol`, `${featureId}-line`]});
                    this._map.featuresCache.removeBatchCache([featureId, `${featureId}-symbol`, `${featureId}-line`]);
                }
            }
        }
    }
    // 清空所有layer中的要素
    clearFeatures() {
        const layerTypes = this._layerTypes;
        for (let i = 0; i < layerTypes.length; i++) {
            const layerType = layerTypes[i];
            const layerId = `${this._id}-${layerType}-layer`;
            if (this._isLayerExist(layerType)) {
                const source = this._map.getSource(layerId);
                if (source) {
                    let removeFeatureIds = source.serialize().data.features.map(ele => ele.id);
                    source.updateData({removeAll: true});
                    (removeFeatureIds || []).map(id => {
                        this._map.featuresCache.removeBatchCache([id, `${id}-symbol`, `${id}-line`]);
                    });
                }
            }
        }
    }
    // 获取指定layer中的指定要素
    getFeatureById(featureId, featureType) {
        if (!featureId || !featureType) return {};
        let layerType = '';
        if (featureType == NodeMap.Node.POINT) {
            layerType = 'symbol';
        } else if (featureType == NodeMap.Node.CIRCLE) {
            layerType = 'circle';
        } else if (featureType == NodeMap.Node.LINE) {
            layerType = 'line';
        } else if (featureType == NodeMap.Node.POLYGON) {
            layerType = 'fill';
        }
        if (!layerType) return {};
        const layerId = `${this._id}-${layerType}-layer`;
        const source = this._map.getSource(layerId);
        if (!source) return {};
        const mapFeature = source.serialize().data.features.find(ele => ele.id === featureId);
        // if (!mapFeature) return {};
        const feature = this._map.featuresCache.getCacheById(featureId);
        return {source, mapFeature, feature, sourceId: layerId};
    }
    // 获取指定layer中的所有mapFeatures
    getAllMapFeaturesByType(featureType) {
        if (!featureType) return {};
        let layerType = '';
        if (featureType == NodeMap.Node.POINT) {
            layerType = 'symbol';
        } else if (featureType == NodeMap.Node.CIRCLE) {
            layerType = 'circle';
        } else if (featureType == NodeMap.Node.LINE) {
            layerType = 'line';
        } else if (featureType == NodeMap.Node.POLYGON) {
            layerType = 'fill';
        }
        if (!layerType) return {};
        const layerId = `${this._id}-${layerType}-layer`;
        const source = this._map.getSource(layerId);
        if (!source) return {};
        const mapFeatures = source.serialize().data.features;
        return mapFeatures;
    }
    // 根据featureId获取featuresCache中的要素
    getFeatureCacheById(featureId) {
        let cache = this._map.featuresCache.getCacheById(featureId);
        if (!cache) return null;
        let {source} = this.getFeatureById(featureId, cache.geometry.type);
        return source ? cache : null;
    }
    // 清除所有layer
    clearAllLayers() {
        this.clearFeatures();
        const layerTypes = this._layerTypes;
        for (let i = 0; i < layerTypes.length; i++) {
            const layerType = layerTypes[i];
            const layerId = `${this._id}-${layerType}-layer`;
            if (this._isLayerExist(layerType)) {
                this._map.removeLayer(layerId);
                const source = this._map.getSource(layerId);
                source && this._map.removeSource(layerId);
            }
        }
    }
    // 销毁
    destroy() {
        this._status = 'destroy';
        this.clearAllLayers();
    }
}

export default BaseLayer;