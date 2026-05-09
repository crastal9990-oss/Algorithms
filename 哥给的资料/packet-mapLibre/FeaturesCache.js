class FeaturesCache {
    // 缓存管理每个图层的feature
    constructor(options) {
        this._map = options.map;
        this._cache = new Map();
    }
    // 添加缓存
    addCache(feature) {
        const item = this._cache.get(feature.id);
        if (!item) {
            feature.initClass && feature.initClass();
        }
        this._cache.set(feature.id, feature);
    }
    // 批量添加缓存
    addBatchCache(features) {
        features.forEach(feature => {
            this.addCache(feature);
        });
    }
    // 删除缓存
    removeCacheById(featureId) {
        const feature = this._cache.get(featureId);
        if (feature) {
            feature.destroyClass && feature.destroyClass();
            this._cache.delete(featureId);
        }
    }
    // 批量删除缓存
    removeBatchCache(featureIds) {
        featureIds.forEach(featureId => {
            this.removeCacheById(featureId);
        });
    }
    // 清空缓存(为避免缓存映射不对应，尽量不要调用此方法)
    clearCache() {
        this._cache.clear();
    }
    // 修改缓存中的一项
    updateCacheById(feature) {
        if (this._cache.get(feature.id)) {
            this._cache.set(feature.id, feature);
        }
    }
    // 获取缓存
    getCacheById(featureId) {
        return this._cache.get(featureId);
    }
}

export default FeaturesCache;