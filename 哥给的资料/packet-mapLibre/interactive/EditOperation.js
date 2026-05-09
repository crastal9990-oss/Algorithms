import NodeMap from "../node/index";

export default class EditOperation {
    static NAME = "EDIT";
    constructor(props) {
        this._map = props.map;
        let defaultParam = Object.assign(
            {
                name: EditOperation.NAME,
                canEdit: true,
                eventMap: [
                    {
                        type: "click",
                        callback: (event) => {
                            this.click(this._map, event);
                        }
                    },
                    {
                        type: "dblclick",
                        callback: (event) => {
                            this.dblclick(this._map, event);
                        }
                    },
                    {
                        type: "mousedown",
                        callback: (event) => {
                            this.mousedown(this._map, event);
                        }
                    },
                    {
                        type: "mousemove",
                        callback: (event) => {
                            this.mousemove(this._map, event);
                        }
                    },
                    {
                        type: "mouseup",
                        callback: (event) => {
                            this.mouseup(this._map, event);
                        }
                    },
                    {
                        type: "contextmenu",
                        callback: (event) => {
                            this.contextmenu(this._map, event);
                        }
                    }
                ]
            },
            props
        );
        this._canEdit = defaultParam.canEdit;
        this._name = defaultParam.name;
        this._eventMap = defaultParam.eventMap ? defaultParam.eventMap: [];
        this._selectFeature = null;
        this._hoverFeature = null;
        this._dragFeature = null;
        this._vueHandler = defaultParam.vueHandler;
        this._mouseLeftDown = false;
        this._updated = false;
        this._isDragCircle = false; // 是否拖动圆
        this._isChangeRadius = false; // 是否改变圆半径
        this._afterFinish = defaultParam.afterFinish;
        this._updating = defaultParam.updating;
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
    // 当前选中的特征
    get selectFeature() {
        return this._selectFeature;
    }
    set selectFeature(value) {
        if (value) {
            if (this._selectFeature && this._selectFeature.properties.id !== value.properties.id) {
                let oldCacheFeature = this._map.featuresCache.getCacheById(this._selectFeature.properties.id);
                oldCacheFeature && oldCacheFeature.unSelect({map: this._map});
            }
            let newCacheFeature = this._map.featuresCache.getCacheById(value.properties.id);
            newCacheFeature && newCacheFeature.onSelect({map: this._map});
        } else {
            if (this._selectFeature) {
                let oldCacheFeature = this._map.featuresCache.getCacheById(this._selectFeature.properties.id);
                oldCacheFeature && oldCacheFeature.unSelect({map: this._map});
            }
        }
        this._selectFeature = value;
    }
    // 当前拖动的特征
    get dragFeature() {
        return this._dragFeature;
    }
    set dragFeature(value) {
        this._dragFeature = value;
    }

    // 悬停事件
    _hover(map, event) {
        if (this._mouseLeftDown) {
            if (this._vueHandler && this._vueHandler.closeHovertip) {
                this._vueHandler.closeHovertip();
            }
            return;
        }
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
    // 处理事件
    doHandle(map, event) {
        if (this._canEdit && this._mouseLeftDown && this.dragFeature) {
            let cacheFeature = map.featuresCache.getCacheById(this.dragFeature.properties.id);
            if (cacheFeature && cacheFeature.canEdit) {
                const layerInfo = {
                    featureId: cacheFeature.id,
                    source: this.dragFeature.layer.source, // 源 ID
                };
                const source = map.getSource(layerInfo.source);
                if (cacheFeature.properties.sourceType === NodeMap.Node.POINT) {
                    const position = [event.lngLat.lng, event.lngLat.lat];
                    this._updated = true;
                    cacheFeature.move(map, {source, position});
                } else if (cacheFeature.properties.sourceType === NodeMap.Node.CIRCLE) {
                    // 拖动圆心点
                    let moveFeature = () => {
                        // 正在开始拖动点
                        const position = [event.lngLat.lng, event.lngLat.lat];
                        this._updated = true;
                        cacheFeature.move(map, {source, position});
                    }
                    // 拖动圆半径
                    let moveRadius = () => {
                        // 正在开始拖动半径
                        // var centerPosition = cacheFeature.position;
                        // var startRadius = cacheFeature.entity.ellipse.semiMajorAxis.getValue();
                        // var endPosition = screen2cartesian3(map, event.endPosition);
                        // var endRadius = Cesium.Cartesian3.distance(centerPosition, endPosition);
                        // var finalRadius = startRadius + (endRadius - startRadius);
                        // finalRadius = finalRadius.toFixed(1) * 1;
                        // this._updated = true;
                        // cacheFeature.moveRadius(map, {source, radius: finalRadius});
                    }
                    if (this._isDragCircle) moveFeature();
                    if (this._isChangeRadius) moveRadius();
                } else if (cacheFeature.properties.sourceType === NodeMap.Node.LINE) {
                    if (cacheFeature.properties.drawType === NodeMap.Node.POINT) {
                        const position = [event.lngLat.lng, event.lngLat.lat];
                        this._updated = true;
                        cacheFeature.move(map, {index: cacheFeature.properties.index, source, position});
                    }
                } else if (cacheFeature.properties.sourceType === NodeMap.Node.POLYGON) {
                    if (cacheFeature.properties.drawType === NodeMap.Node.POINT) {
                        const position = [event.lngLat.lng, event.lngLat.lat];
                        this._updated = true;
                        cacheFeature.move(map, {index: cacheFeature.properties.index, source, position});
                    }
                }
            }
        }
    }
    // 点击事件
    click(map, event) {
        const features = map.queryRenderedFeatures(event.point);
        if (features && features.length) {
            const feature = features[0];
            if (!this.selectFeature || this.selectFeature.properties.id != feature.properties.id) {
                this.selectFeature = feature;
            }
        } else {
            this.selectFeature = null;
        }
        if (this._afterFinish) {
            let cacheFeature = null;
            if (this.selectFeature) {
                cacheFeature = this._map.featuresCache.getCacheById(this.selectFeature.properties.id);
            }
            this._afterFinish(cacheFeature, event);
        }
    }
    // 双击事件
    dblclick(map, event) {
        // const features = map.queryRenderedFeatures(event.point);
        // if (features && features.length) {
        //     const feature = features[0];
        //     if (!this.selectFeature || this.selectFeature.properties.id != feature.properties.id) {
        //         this.selectFeature = feature;
        //     }
        // } else {
        //     this.selectFeature = null;
        // }
        // if (this._afterFinish) {
        //     let cacheFeature = {};
        //     if (this.selectFeature) {
        //         cacheFeature = this._map.featuresCache.getCacheById(this.selectFeature.properties.id);
        //     }
        //     this._afterFinish(cacheFeature, event);
        // }
    }
    // 鼠标按下事件
    mousedown(map, event) {
        this._mouseLeftDown = true;
        const features = map.queryRenderedFeatures(event.point);
        if (features && features.length) {
            const feature = features[0];
            if (!this.dragFeature || this.dragFeature.properties.id != feature.properties.id) {
                this.dragFeature = feature;
            }
            if (this.dragFeature.properties.sourceType === NodeMap.Node.CIRCLE) {
                if (this.dragFeature.properties.drawType === NodeMap.Node.POINT) {
                    // 圆心点
                    this._isDragCircle = true;
                    this._isChangeRadius = false;
                } else if (this.dragFeature.properties.drawType === NodeMap.Node.LINE) {
                    // 圆边线
                    this._isDragCircle = false;
                    this._isChangeRadius = true;
                }
            }
            let cacheFeature = this._map.featuresCache.getCacheById(feature.properties.id);
            if (cacheFeature && cacheFeature.canEdit) {
                if (cacheFeature instanceof NodeMap.EditablePoint) {
                    if (cacheFeature.selected) {
                        event.preventDefault();
                    }
                } else {
                    event.preventDefault();
                }
            }
        }
    }
    // 鼠标移动事件
    mousemove(map, event) {
        // 延迟10ms后，再执行防止跟点击事件冲突
        setTimeout(() => {
            this._hover(map, event);
            this.doHandle(map, event);
        }, 10);
    }
    // 鼠标松开事件
    mouseup(map, event) {
        this._mouseLeftDown = false;
        if (this._updated) {
            this._updated = false;
            if (this._updating) {
                let cacheFeature = null;
                if (this.dragFeature && (this.dragFeature.properties.parentId || this.dragFeature.properties.id)) {
                    const id = this.dragFeature.properties.parentId || this.dragFeature.properties.id;
                    cacheFeature = this._map.featuresCache.getCacheById(id);
                }
                this._updating(cacheFeature, event);
            }
        }
        this.dragFeature = null;
        this._isDragCircle = false;
        this._isChangeRadius = false;
    }
    // 上下文右键菜单事件
    contextmenu(map, event) {
        // const features = map.queryRenderedFeatures(event.point);
        // if (features && features.length) {
        //     const feature = features[0];
        //     if (!this.selectFeature || this.selectFeature.properties.id != feature.properties.id) {
        //         this.selectFeature = feature;
        //     }
        // } else {
        //     this.selectFeature = null;
        // }
        // if (this._afterFinish) {
        //     let cacheFeature = {};
        //     if (this.selectFeature) {
        //         cacheFeature = this._map.featuresCache.getCacheById(this.selectFeature.properties.id);
        //     }
        //     this._afterFinish(cacheFeature, event);
        // }
    }
    // 选择特征
    selectFeatureByEntity(feature) {
        this.selectFeature = feature;
        if (this._afterFinish) {
            let cacheFeature = {};
            if (this.selectFeature) {
                cacheFeature = this._map.featuresCache.getCacheById(this.selectFeature.properties.id);
            }
            this._afterFinish(cacheFeature);
        }
    }
    // 取消选择特征
    cancelSelectFeature() {
        this.selectFeature = null;
    }
    destroy() {
        this.selectFeature = null;
        this.hoverFeature = null;
        this.dragFeature = null;
    }
}
