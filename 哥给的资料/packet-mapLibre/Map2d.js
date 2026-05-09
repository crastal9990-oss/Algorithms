import {tdtUrl} from "../packet-cesium/mapConfig";
import FeaturesCache from "./FeaturesCache";
import CustomFloater from "./CustomFloater";
import Interactive from "./Interactive";

class Map2D extends maplibregl.Map {
    static MIN_ZOOM = 0;
    static MAX_ZOOM = 24;
    static homeLongitude = 103.59328136622959;
    static homeLatitude = 35.06422583115814;
    static homeZoom = 6;
    constructor(id, props) {
        const envMapURL = window.global.VUE_APP_MAP_LOCAL_SATELLITE;
        const hasLocal = !!envMapURL;
        let sources = {
            'base-map-layer': {
                type: 'raster',
                tiles: [envMapURL],
                tileSize: 256,
                minzoom: Map2D.MIN_ZOOM,
                maxzoom: Map2D.MAX_ZOOM
            }
        };
        if (!hasLocal) {
            const url = `${tdtUrl}/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=7f3a6463a4e8b66fbfb22a3b78a9c710`;
            sources['base-map-layer'].tiles = [url.replace('{s}', '0')];
            sources['base-map-layer'].subdomains = ["0", "1", "2", "3", "4", "5", "6", "7"];
        } else if (hasLocal && props.isGoogleMapCorrect) {
            // 目前暂时没方案去处理国内瓦片的偏移问题
        }
        let params = {
            container: id,
            style: {
                version: 8,
                sources,
                layers: [
                    {
                        id: 'base-map-layer',
                        type: 'raster',
                        source: 'base-map-layer',
                        minzoom: Map2D.MIN_ZOOM,
                        maxzoom: Map2D.MAX_ZOOM
                    }
                ]
            },
            minZoom: Map2D.MIN_ZOOM,
		    maxZoom: Map2D.MAX_ZOOM,
            // transformRequest: (url, resourceType) => {
            //     if (props.isGoogleMapCorrect && resourceType === 'Tile' && url.includes('tactical.aossci.com')) {
            //         const pattern = /(\/google\/)(\d+)\/(\d+)\/(\d+)(\?[^#]*)?/;
            //         const match = url.match(pattern);
            //         if (match) {
            //             const prefix = match[1]; // "/google/"
            //             const z = parseInt(match[2]);
            //             const x = parseInt(match[3]);
            //             const y = parseInt(match[4]);
            //             const queryString = match[5] || ''; // 可能是 "?languageType=en-US" 或空字符串
            //             const corrected = correctTileCoords(x, y, z);
            //             const newUrl = url.substring(0, match.index) 
            //                 + `${prefix}${corrected.z}/${corrected.x}/${corrected.y}` 
            //                 + queryString;
            //             // 添加缓存控制，避免浏览器缓存错误的瓦片
            //             const separator = newUrl.includes('?') ? '&' : '?';
            //             const finalUrl = `${newUrl}${separator}_t=${Date.now()}`;
            //             return {url: finalUrl};
            //         }
            //     } else {
            //         return {url};
            //     }
            // }
        }
        super(params);
        this.doubleClickZoom.disable();
        this._layerType = "satellite"; // 默认卫星影像图层
        // 缓存管理每个图层的feature
        this.featuresCache = new FeaturesCache({map: this});
        // 交互管理
        this._interactive = new Interactive({map: this});
        // 缓存已创建的浮窗实例
        this._floaters = new Map();
        this.on('load', () => {
            if (props.isGoogleMapCorrect) {}
            // 是否加载注记图层
            if (!hasLocal) {
                // 添加天地图道路等信息
                this.loadTDAnnotationMap();
            }
        });
        this.init();
    }
    get interactive() {
        return this._interactive;
    }

    // 加载天地图道路标注信息图层
    loadTDAnnotationMap() {
        const url = `${tdtUrl}/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=7f3a6463a4e8b66fbfb22a3b78a9c710`;
        this.addLayer({
            id: 'annotation-map-layer',
            type: 'raster',
            source: {
                type: 'raster',
                tiles: [url.replace('{s}', '0')],
                tileSize: 256,
                minzoom: Map2D.MIN_ZOOM,
                maxzoom: Map2D.MAX_ZOOM,
                subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"]
            },
            minzoom: Map2D.MIN_ZOOM,
            maxzoom: Map2D.MAX_ZOOM
        });
    }
    // 初始化一些展示等
    init() {
        let lon = Map2D.homeLongitude;
        let lat = Map2D.homeLatitude;
        let zoom = Map2D.homeZoom;
        if (!!window.global.VUE_APP_HOME_LOCATION) {
            let arr =  window.global.VUE_APP_HOME_LOCATION.split(',')
            lon = arr[0] && !isNaN(Number(arr[0]))? Number(arr[0]) : lon;
            lat = arr[1] && !isNaN(Number(arr[1]))? Number(arr[1]): lat;
            zoom = arr[3] && !isNaN(Number(arr[3]))? Number(arr[3]): zoom;
        }
        this.jumpTo({
            center: [lon, lat],
            zoom: zoom
        });
    }
    // 获取相机信息，包含中心坐标、缩放级别、旋转角度、俯仰角度、边界信息、视口尺寸、像素比、时间戳
    getCameraInfo() {
        const center = this.getCenter();
        const bounds = this.getBounds();
        return {
            center: {lng: center.lng, lat: center.lat},
            zoom: this.getZoom(),
            bearing: this.getBearing(),
            pitch: this.getPitch(),
            // 边界信息
            bounds: [
                bounds._sw.lng,
                bounds._sw.lat,
                bounds._ne.lng,
                bounds._ne.lat
            ],
            // 视口尺寸
            viewport: {width: this.getContainer().clientWidth, height: this.getContainer().clientHeight},
            // 像素比
            pixelRatio: this.getPixelRatio(),
            // 时间戳（用于记录状态变化）
            timestamp: Date.now()
        };
    }
    // 获取当前指南针方向
    getCompass() {
        return {
            // 指南针角度（旋转）
            compass: {bearing: this.getBearing()}
        };
    }
    // 切换图层
    switchLayer(type) {
        this._layerType = type;
        this.getLayer('annotation-map-layer') && this.removeLayer('annotation-map-layer');
        this.getSource('annotation-map-layer') && this.removeSource('annotation-map-layer');
        this.getLayer('base-map-layer') && this.removeLayer('base-map-layer');
        this.getSource('base-map-layer') && this.removeSource('base-map-layer');
        if (type == "satellite") {
            const envMapURL = window.global.VUE_APP_MAP_LOCAL_SATELLITE;
            const hasLocal = !!envMapURL;
            if (hasLocal) {
                this.addLayer({
                    id: 'base-map-layer',
                    type: 'raster',
                    source: {
                        type: 'raster',
                        tiles: [envMapURL],
                        tileSize: 256,
                        minzoom: Map2D.MIN_ZOOM,
                        maxzoom: Map2D.MAX_ZOOM
                    },
                    minzoom: Map2D.MIN_ZOOM,
                    maxzoom: Map2D.MAX_ZOOM
                }, this.getStyle().layers[0].id);
            } else {
                let anoLayer = this._getProvider("satellite", 'ano');
                this.addLayer(anoLayer, this.getStyle().layers[0].id);
                let baseLayer = this._getProvider("satellite", 'base');
                this.addLayer(baseLayer, this.getStyle().layers[0].id);
            }
        } else if (type == "satellite-terrain") {
            const envMapURL = window.global.VUE_APP_MAP_LOCAL_SATELLITE_TERRAIN;
            const hasLocal = !!envMapURL;
            if (hasLocal) {
                this.addLayer({
                    id: 'base-map-layer',
                    type: 'raster',
                    source: {
                        type: 'raster',
                        tiles: [envMapURL],
                        tileSize: 256,
                        minzoom: Map2D.MIN_ZOOM,
                        maxzoom: Map2D.MAX_ZOOM
                    },
                    minzoom: Map2D.MIN_ZOOM,
                    maxzoom: Map2D.MAX_ZOOM
                }, this.getStyle().layers[0].id);
            } else {
                let anoLayer = this._getProvider("satellite-terrain", 'ano');
                this.addLayer(anoLayer, this.getStyle().layers[0].id);
                let baseLayer = this._getProvider("satellite-terrain", 'base');
                this.addLayer(baseLayer, this.getStyle().layers[0].id);
            }
        } else if (type == "vector") {
            const envMapURL = window.global.VUE_APP_MAP_LOCAL_VECTOR;
            const hasLocal = !!envMapURL;
            if (hasLocal) {
                this.addLayer({
                    id: 'base-map-layer',
                    type: 'raster',
                    source: {
                        type: 'raster',
                        tiles: [envMapURL],
                        tileSize: 256,
                        minzoom: Map2D.MIN_ZOOM,
                        maxzoom: Map2D.MAX_ZOOM
                    },
                    minzoom: Map2D.MIN_ZOOM,
                    maxzoom: Map2D.MAX_ZOOM
                }, this.getStyle().layers[0].id);
            } else {
                let anoLayer = this._getProvider("vector", 'ano');
                this.addLayer(anoLayer, this.getStyle().layers[0].id);
                let baseLayer = this._getProvider("vector", 'base');
                this.addLayer(baseLayer, this.getStyle().layers[0].id);
            }
        }
    }
    _getProvider(mapType, layerType) {
        let base = "img_w";
        let ano = "cia_w";
        if (mapType == "satellite") {
            base = "img_w";
            if (layerType == 'ano') {
                ano = "cia_w";
            }
        } else if (mapType == "satellite-terrain") {
            base = "ter_w";
            if (layerType == 'ano') {
                ano = "cia_w";
            }
        } else if (mapType == "vector") {
            base = "vec_w";
            if (layerType == 'ano') {
                ano = "cva_w";
            }
        }
        let layerData = {};
        if (layerType == 'ano') {
            const url = `${tdtUrl}/DataServer?T=${ano}&x={x}&y={y}&l={z}&tk=7f3a6463a4e8b66fbfb22a3b78a9c710`;
            layerData = {
                id: 'annotation-map-layer',
                type: 'raster',
                source: {
                    type: 'raster',
                    tiles: [url.replace('{s}', '0')],
                    tileSize: 256,
                    minzoom: Map2D.MIN_ZOOM,
                    maxzoom: Map2D.MAX_ZOOM,
                    subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"]
                },
                minzoom: Map2D.MIN_ZOOM,
                maxzoom: Map2D.MAX_ZOOM
            };
        } else if (layerType == 'base') {
            const url = `${tdtUrl}/DataServer?T=${base}&x={x}&y={y}&l={z}&tk=7f3a6463a4e8b66fbfb22a3b78a9c710`;
            layerData = {
                id: 'base-map-layer',
                type: 'raster',
                source: {
                    type: 'raster',
                    tiles: [url.replace('{s}', '0')],
                    tileSize: 256,
                    minzoom: Map2D.MIN_ZOOM,
                    maxzoom: Map2D.MAX_ZOOM,
                    subdomains: ["0", "1", "2", "3", "4", "5", "6", "7"]
                },
                minzoom: Map2D.MIN_ZOOM,
                maxzoom: Map2D.MAX_ZOOM
            };
        }
        return layerData;
    }
    // 设置交互操作
    setOperation(operation) {
        this._interactive.setInteractive(operation);
    }
    // 触发编辑模型
    triggerEditModel(operation, params) {
        this._interactive.triggerEditModel(operation, params);
    }
    // 定位bounds到指定的范围
    fitBoundsRange(geometry, options = {}) {
        if (!geometry) return;
        const bbox = turf.bbox(geometry);
        const bounds = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
        this.fitBoundsRangeToData(bounds, options);
    }
    fitBoundsRangeToData(bounds, options = {}) {
        this.fitBounds(
            bounds,
            {padding: 80, duration: 0.1, maxZoom: 15, ...options}
        );
    }
    // 添加图片到地图中
    async ensureAllImages(images) {
        if (!images || !images.length) return;
        const promises = images.map(image => this.ensureImageLoaded(image.id, image.url));
        await Promise.all(promises);
    }
    ensureImageLoaded(imageId, imageUrl) {
        return new Promise((resolve, reject) => {
            if (!imageId || !imageUrl) {
                reject();
                return;
            }
            if (this.hasImage(imageId)) {
                resolve();
                return;
            }
            this.loadImage(imageUrl).then(({data}) => {
                if (!this.hasImage(imageId)) {
                    data && this.addImage(imageId, data);
                }
                resolve();
            }).catch(error => {
                reject(error);
            });
        });
    }
    // 添加跟随弹窗
    addFollowPop(options) {
        if (!options || !options.element) return;
        let props = options;
        props['map'] = this;
        const floater = this._floaters.get(options.id);
        if (floater) {
            floater.remove();
            this._floaters.delete(options.id);
        }
        const pop = new CustomFloater(props);
        this._floaters.set(pop._id, pop);
    }
    // 根据id获取跟随弹窗
    getFollowPop(id) {
        return this._floaters.get(id);
    }
    // 移除跟随信息弹窗
    removeFollowPop(data = []) {
        if (!data || !data.length) return;
        data.map(t => {
            const floater = this._floaters.get(t);
            if (floater) {
                floater.remove();
                this._floaters.delete(t);
            }
        });
    }
    // 移除所有跟随弹窗
    removeAllFollowPop() {
        this._floaters.forEach(floater => floater.remove());
        this._floaters.clear();
    }
    // 销毁地图
    destroy() {
        // 延迟执行
        setTimeout(() => {
            this._interactive.removeInteractive();
            this._interactive = null;
            this.featuresCache.clearCache();
            this.featuresCache = null;
            this.removeAllFollowPop();
        }, 1000 * 3);
        const mapInstance = this;
        setTimeout((map) => {
            map.remove();
            map = null;
        }, 1000 * 5, mapInstance);
    }
}

export default Map2D;

// 常量定义
const PI = 3.1415926535897932384626;
const a = 6378245.0;  // 长半轴
const ee = 0.00669342162296594323;  // 偏心率平方
const x_pi = PI * 3000.0 / 180.0;
// 核心纠偏函数
function correctTileCoords(x, y, z) {
    // 1. 计算当前瓦片的中心点经纬度 (使用 WGS84)
    const center = tileToLngLat(x + 0.5, y + 0.5, z);
    // 2. 将中心点转换为 GCJ02 坐标系
    const gcj02 = wgs84ToGcj02(center.lat, center.lng);
    // 3. 将 GCJ02 坐标转回瓦片坐标
    const newTile = lngLatToTile(gcj02[1], gcj02[0], z);
    // 返回新的瓦片坐标
    return {
        x: newTile.x,
        y: newTile.y,
        z: z  // 缩放级别通常不变
    };
}
// 瓦片坐标转经纬度
function tileToLngLat(x, y, z) {
    const n = Math.PI - 2.0 * Math.PI * y / Math.pow(2.0, z);
    const lng = x / Math.pow(2.0, z) * 360.0 - 180.0;
    const lat = 180.0 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
    return { lng, lat };
}
// 经纬度转瓦片坐标
function lngLatToTile(lng, lat, z) {
    const x = Math.floor((lng + 180.0) / 360.0 * Math.pow(2.0, z));
    const latRad = lat * PI / 180.0;
    const y = Math.floor((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / PI) / 2.0 * Math.pow(2.0, z));
    return { 
        x: Math.max(0, Math.min(Math.pow(2, z) - 1, x)), 
        y: Math.max(0, Math.min(Math.pow(2, z) - 1, y))
    };
}
/**
 * 判断是否在中国境内
 */
function outOfChina(lat, lon) {
    if (lon < 72.004 || lon > 137.8347) return true;
    if (lat < 0.8293 || lat > 55.8271) return true;
    return false;
}
/**
 * 纬度转换
 */
function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
}
/**
 * 经度转换
 */
function transformLon(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
}
/**
 * WGS84 转 GCJ02 (火星坐标系)
 * @param {number} lat - 纬度
 * @param {number} lon - 经度
 * @returns {Array} [纬度, 经度]
 */
function wgs84ToGcj02(lat, lon) {
    if (outOfChina(lat, lon)) {
        return [lat, lon];
    }
    
    let dLat = transformLat(lon - 105.0, lat - 35.0);
    let dLon = transformLon(lon - 105.0, lat - 35.0);
    let radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - ee * magic * magic;
    let sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * PI);
    dLon = (dLon * 180.0) / (a / sqrtMagic * Math.cos(radLat) * PI);
    
    let mgLat = lat + dLat;
    let mgLon = lon + dLon;
    
    return [mgLat, mgLon];
}