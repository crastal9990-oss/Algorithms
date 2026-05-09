import NormalOperation from "./interactive/NormalOperation";

class Interactive {
    constructor(options) {
        options = Object.assign({}, options);
        this._map = options.map;
        this._current = {};
        this.init();
    }
    // 初始化
    init() {
        this.setInteractive(new NormalOperation({map: this._map}));
    }
    // 设置事件
    setInteractive(operation) {
        this.removeInteractive(this._current);
        if (!operation) {
            operation = new NormalOperation({map: this._map});
        }
        this._current = operation;
        this._registerOperation();
    }
    // 移除所有缓存事件
    removeInteractive() {
        this.clearOperation();
        if (this._current.name) {
            this._current.eventMap.forEach(handler => {
                this._map.off(handler.type, handler.callback);
            });
        }
    }
    // 移除指定事件
    removeHandler(handlerType) {
        if (this._current.name) {
            this._current.eventMap.forEach(handler => {
                if (handler.type === handlerType) {
                    this._map.off(handler.type, handler.callback);
                }
            });
        }
    }
    // 销毁当前事件内部属性
    clearOperation() {
        if (this._current && this._current.destroy) {
            this._current.destroy();
        }
    }
    // 注册事件
    _registerOperation() {
        this._current.eventMap.forEach(handler => {
            this._map.on(handler.type, handler.callback);
        });
    }
    // 触发编辑模型
    triggerEditModel(operation, params) {
        if (typeof operation == 'boolean') {
            this.setInteractive(new NormalOperation(params));
        } else {
            this.setInteractive(operation);
        }
    }
}

export default Interactive;