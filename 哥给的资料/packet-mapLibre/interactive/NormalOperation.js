export default class NormalOperation {
    static NAME = "NormalOperation";
    constructor(props) {
        this._map = props.map;
        let defaultParam = Object.assign(
            {
                name: NormalOperation.NAME,
                eventMap: [
                    {
                        type: "mousemove",
                        callback: (event) => {
                            this.mousemove(this._map, event);
                        }
                    }
                ]
            },
            props
        );
        this._name = defaultParam.name;
        this._eventMap = defaultParam.eventMap ? defaultParam.eventMap: [];
        this._hoverFeature = null;
        this._vueHandler = defaultParam.vueHandler;
    }
    get name() {
        return this._name;
    }
    get eventMap() {
        return this._eventMap;
    }
    // 当前悬停的特征
    get hoverFeature() {
        return this._hoverFeature;
    }
    set hoverFeature(value) {
        if (value) {
            if (this._hoverFeature) {
                if (this._hoverFeature.properties.id !== value.properties.id) {
                    let oldCacheFeature = this._map.featuresCache.getCacheById(this._hoverFeature.properties.id);
                    oldCacheFeature && oldCacheFeature.leave({map: this._map});
                }
            }
            let newCacheFeature = this._map.featuresCache.getCacheById(value.properties.id);
            newCacheFeature && newCacheFeature.hover({map: this._map});
        } else {
            if (this._hoverFeature) {
                let oldCacheFeature = this._map.featuresCache.getCacheById(this._hoverFeature.properties.id);
                oldCacheFeature && oldCacheFeature.leave({map: this._map});
            }
        }
        this._hoverFeature = value;
    }

    // 悬停事件
    _hover(map, event) {
        const features = map.queryRenderedFeatures(event.point);
        if (features && features.length) {
            map.getCanvas().style.cursor = "pointer";
            const feature = features[0];
            if (this.hoverFeature) {
                if (this.hoverFeature.properties.id !== feature.properties.id) {
                    if (this._vueHandler && this._vueHandler.closeHovertip) {
                        this._vueHandler.closeHovertip();
                    }
                }
                const {lng, lat} = event.lngLat;
                // let position = model.getHovertipPosition(event)
                // if (this._vueHandler && this._vueHandler.openHovertip) {
                //     this._vueHandler.openHovertip({
                //     id: model.id,
                //     left: position.x,
                //     top: position.y,
                //     type: model.type,
                //     drawType: model.entity.drawType
                //     })
                // }
            }
            this.hoverFeature = feature;
        } else {
            map.getCanvas().style.cursor = "default";
            if (this.hoverFeature) {
                if (this._vueHandler && this._vueHandler.closeHovertip) {
                    this._vueHandler.closeHovertip();
                }
            }
            this.hoverFeature = null;
        }
    }
    // 鼠标移动事件
    mousemove(map, event) {
        this._hover(map, event);
    }
    destroy() {
        this.hoverFeature = null;
    }
}