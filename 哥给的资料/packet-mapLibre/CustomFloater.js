export default class CustomFloater {
    constructor(options) {
        this._id = options.id;
        this._map = options.map;
        this._element = typeof options.element === 'string' 
            ? document.getElementById(options.element) : options.element;
        // 父容器（必须传入，用于相对定位）
        this._parentElement = options.parentElement || document.body;
        if (typeof this._parentElement === 'string') {
            this._parentElement = document.getElementById(this._parentElement);
        }
        this._positionDirection = options.positionDirection || 'right';
        this._lngLat = options.positions || null;
        this._featureId = options.featureId || null;
        this._feature = options.feature || null;
        this._offset = options.offset || [0, 0];
        this._isControlFps = options.isControlFps || false;
        this._fps = options.fps || 60;
        // 帧率控制相关
        this._rafId = null;
        this._lastTimestamp = 0;
        this._frameInterval = 1000 / this._fps;
        this._updatePosition(); // 初始更新一次位置
        this._startAnimation(); // 启动动画循环
    }
    // 启动 requestAnimationFrame 循环（带帧率控制）
    _startAnimation() {
        const animate = (timestamp) => {
            if (!this._map || !this._element) return;
            if (this._isControlFps) {
                // 帧率控制：检查是否到达更新时间
                const elapsed = timestamp - this._lastTimestamp;
                if (elapsed >= this._frameInterval) {
                    this._updatePosition();
                    this._lastTimestamp = timestamp;
                }
            } else {
                this._updatePosition();
            }
            // 继续下一帧
            this._rafId = requestAnimationFrame(animate);
        };
        this._lastTimestamp = performance.now();
        this._rafId = requestAnimationFrame(animate);
    }
    // 停止动画循环
    _stopAnimation() {
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }
    // 更新浮窗位置
    _updatePosition() {
        if (!this._map || !this._element) return;
        let feature = this._feature;
        if (!feature && this._featureId) {
            feature = this._map.featuresCache.getCacheById(this._featureId);
        }
        let lngLat = this._lngLat;
        if (feature && feature.geometry) {
            lngLat = feature.geometry.coordinates;
        }
        // 将经纬度转换为屏幕坐标
        const screenPoint = this._map.project(lngLat);
        if (!screenPoint) return;
        const x = this._offset[0] || 0;
        const y = this._offset[1] || 0;
        if (this._positionDirection == 'right') {
            if (!this._parentElement) return;
            const parentElementWidth = this._parentElement.offsetWidth;
            const parentElementHeight = this._parentElement.offsetHeight;
            const right = parentElementWidth - screenPoint.x - x - this._element.offsetWidth * 0.5;
            const bottom = parentElementHeight - screenPoint.y + y;
            // 应用位置样式
            this._element.style.right = `${right}px`;
            this._element.style.bottom = `${bottom}px`;
        } else {
            const left = screenPoint.x - x - this._element.offsetWidth * 0.5;
            const top = screenPoint.y - y - this._element.offsetHeight;
            // 应用位置样式
            this._element.style.left = `${left}px`;
            this._element.style.top = `${top}px`;
        }
    }
    // 设置新位置
    setPosition(lngLat) {
        this._lngLat = lngLat;
        return this;
    }
    // 设置偏移量
    setOffset(offset) {
        this._offset = offset;
        return this;
    }
    // 设置帧率
    setFps(fps) {
        fps = Math.max(1, Math.min(120, fps));
        this._fps = fps;
        this._frameInterval = 1000 / fps;
        return this;
    }
    // 获取当前帧率
    getFps() {
        return this._fps;
    }
    // 移除浮窗（停止动画）
    remove() {
        this._stopAnimation();
        this._map = null;
        this._element = null;
        this._parentElement = null;
    }
}