import Point from '../base/Point';
import MarkIcon from '../../canvas/MarkIcon';

export default class EditablePoint extends Point {
    constructor(options) {
        let _iconColor = options.properties.iconColor;
        if (!options.properties.useIcon && _iconColor) {
            let useIcon = MarkIcon.getIcon(_iconColor).src;
            let selectedIcon = MarkIcon.getSelecteIcon(_iconColor).src;
            const useIconId = `${options.properties.id}-markIcon-${_iconColor}`;
            const selectedIconId = `${options.properties.id}-markSelectedIcon-${_iconColor}`;
            options.properties = {
                ...options.properties,
                useIcon: useIconId,
                normalIcon: useIconId,
                selectedIcon: selectedIconId,
                icons: [
                    {id: useIconId, url: useIcon},
                    {id: selectedIconId, url: selectedIcon}
                ]
            };
        }
        super(options);
        this._options = options;
        this._map = options.map;
        this._baseLayer = options.baseLayer;
        this._iconColor = _iconColor;
        this._canEdit = options.canEdit === false ? false : true;
    }
    get canEdit() {
        return this._canEdit;
    }

    // 上层更新
    upperUpdate(updateData) {
        let iconColor = updateData.options.properties.iconColor;
        if (this.useIcon && iconColor && iconColor !== this._iconColor) {
            this._iconColor = iconColor;
            let useIcon = MarkIcon.getIcon(this._iconColor).src;
            let selectedIcon = MarkIcon.getSelecteIcon(this._iconColor).src;
            const useIconId = `${this.id}-markIcon-${this._iconColor}`;
            const selectedIconId = `${this.id}-markSelectedIcon-${this._iconColor}`;
            updateData.options.properties = {
                ...updateData.options.properties,
                useIcon: this.selected ? selectedIconId : useIconId,
                normalIcon: useIconId,
                selectedIcon: selectedIconId,
                icons: [
                    {id: useIconId, url: useIcon},
                    {id: selectedIconId, url: selectedIcon}
                ]
            };
        }
        this._options = updateData.options;
        this.update(updateData);
    }
    // 选中
    onSelect(props) {
        this.selected = true;
        if (!this._baseLayer) return;
        let {source} = this._baseLayer.getFeatureById(this.id, this.geometry.type);
        if (!source) return;
        let options = {
            geometry: this.geometry,
            properties: {...this.properties, useIcon: this.selectedIcon}
        }
        this.update({source, options});
    }
    // 取消选中
    unSelect(props) {
        this.selected = false;
        if (!this._baseLayer) return;
        let {source} = this._baseLayer.getFeatureById(this.id, this.geometry.type);
        if (!source) return;
        let options = {
            geometry: this.geometry,
            properties: {...this.properties, useIcon: this.normalIcon}
        }
        this.update({source, options});
    }
    // 悬停
    // hover(props) {
    //     this.hovering = true;
    //     if (!this._baseLayer) return;
    //     let {source} = this._baseLayer.getFeatureById(this.id, this.geometry.type);
    //     if (!source) return;
    //     let options = {
    //         geometry: this.geometry,
    //         properties: {...this.properties, useIcon: this.selectedIcon}
    //     }
    //     this.update({source, options});
    // }
    // 离开
    // leave(props) {
    //     this.hovering = false;
    //     if (!this.selected || !this._baseLayer) return;
    //     let {source} = this._baseLayer.getFeatureById(this.id, this.geometry.type);
    //     if (!source) return;
    //     let options = {
    //         geometry: this.geometry,
    //         properties: {...this.properties, useIcon: this.normalIcon}
    //     }
    //     this.update({source, options});
    // }
    // 移动点
    move(map, args) {
        if (!this.selected) return;
        const {source, position} = args;
        if (!source) return;
        let options = {
            geometry: {...this.geometry, coordinates: position},
            properties: this.properties
        }
        this.update({source, options});
    }
    // 销毁
    destroyClass() {}
}