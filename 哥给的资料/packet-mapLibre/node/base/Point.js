import Node from './Node';

class Point extends Node {
    constructor(options) {
        super(options);
        this._id = options.properties.id;
        this._feature = null;
        this._geometry = options.geometry;
        this._properties = {};
        this._otherFeature = options.otherFeature || {};
        // 使用的图标
        this._useIcon = options.properties.useIcon || null;
        // 配置的正常图标
        this._normalIcon = options.properties.normalIcon || null;
        // 配置的选中图标
        this._selectedIcon = options.properties.selectedIcon || null;
        // this._show = options.show === false ? false: options.show;
        this.init(options);
    }
    get id() {
        return this._id;
    }
    get feature() {
        return this._feature;
    }
    get geometry() {
        return this._geometry;
    }
    set geometry(val) {
        this._geometry = val;
    }
    get properties() {
        return this._properties;
    }
    set properties(val) {
        this._properties = val;
    }
    get otherFeature() {
        return this._otherFeature;
    }
    get useIcon() {
        return this._useIcon;
    }
    set useIcon(value) {
        this._useIcon = value;
    }
    get normalIcon() {
        return this._normalIcon;
    }
    set normalIcon(value) {
        this._normalIcon = value;
    }
    get selectedIcon() {
        return this._selectedIcon;
    }
    set selectedIcon(value) {
        this._selectedIcon = value;
    }

    init(options) {
        this._feature = {
            type: 'Feature',
            id: this.id,
            geometry: this.geometry,
            properties: Object.assign({drawType: Node.POINT}, options.properties)
        };
        this.properties = this._feature.properties;
        this.useIcon = this.properties.useIcon || this.useIcon;
        this.normalIcon = this.properties.normalIcon || this.useIcon;
        this.selectedIcon = this.properties.selectedIcon || this.useIcon;
    }
    async update(updateData) {
        const {source, sourceId, map, options} = updateData;
        // 更新source._data
        options.properties = Object.assign({drawType: Node.POINT}, options.properties);
        this.geometry = options.geometry;
        this.properties = options.properties;
        this.useIcon = this.properties.useIcon || this.useIcon;
        this.normalIcon = this.properties.normalIcon || this.useIcon;
        this.selectedIcon = this.properties.selectedIcon || this.useIcon;
        this._feature = Object.assign(
            this._feature,
            {geometry: this.geometry, properties: this.properties}
        );
        let sourceLayer = '';
        if (source) {
            sourceLayer = source;
        } else if (map && sourceId) {
            sourceLayer = map.getSource(sourceId);
        }
        if (sourceLayer) {
            sourceLayer.map.featuresCache.updateCacheById(this); // 更新缓存
            await sourceLayer.map.ensureAllImages(this.properties.icons);
            // 更新数据
            let newProperties = [];
            Object.keys(this.properties).forEach(key => {
                newProperties.push({key, value: this.properties[key]});
            });
            sourceLayer.updateData({
                update: [{
                    ...this._feature,
                    newGeometry: {...this.geometry, type: Node.POINT},
                    addOrUpdateProperties: newProperties
                }]
            });
            // 更新其他Feature元素特征
            if (options.otherFeatures) {
                options.otherFeatures.map(item => {
                    const {featureData, sourceData, options} = item;
                    featureData && featureData.update({...sourceData, options});
                });
            }
        }
    }
}

export default Point;