import Node from "../../base/Node";
import Point from '../../base/Point';
import Polygon from '../../base/Polygon';
// 以某点建立东北天局部坐标系
function createENUFrame(centerPoint) {
    // 创建ENU到世界坐标的变换矩阵
    const enuToWorldMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(centerPoint);
    // 计算世界坐标到ENU的逆矩阵
    const worldToEnuMatrix = Cesium.Matrix4.inverse(enuToWorldMatrix, new Cesium.Matrix4());
    return {
        enuToWorld: enuToWorldMatrix,
        worldToEnu: worldToEnuMatrix,
        // 实用方法：坐标转换
        worldToEnu: function(position) {
            const result = new Cesium.Cartesian3();
            Cesium.Matrix4.multiplyByPoint(worldToEnuMatrix, position, result);
            return result;
        },
        enuToWorld: function(enuPosition) {
            const result = new Cesium.Cartesian3();
            Cesium.Matrix4.multiplyByPoint(enuToWorldMatrix, enuPosition, result);
            return result;
        }
    };
}
// 以Z轴旋转固定角度坐标点
function rotatePointsAroundZAxis(points, center, angleDegrees) {
    const angle = Cesium.Math.toRadians(angleDegrees); // 转换为弧度
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    return points.map(point => {
        // 步骤1:计算相对于中心点的坐标
        const relative = Cesium.Cartesian3.subtract(point, center, new Cesium.Cartesian3());
        // 步骤2:应用旋转矩阵
        const x = relative.x * cos - relative.y * sin;
        const y = relative.x * sin + relative.y * cos;
        const z = relative.z;
        // 步骤3:将旋转后的坐标转换回世界坐标
        const rotated = new Cesium.Cartesian3(x, y, z);
        return Cesium.Cartesian3.add(rotated, center, new Cesium.Cartesian3());
    });
}
let defaultRotationAngle = 1; // 扇形每次旋转的角度(默认每次旋转1度)
let defaultRotationTime = 1000; // 扇形旋转的速度时间(默认1000ms一次)

export class InfoDeployPoint extends Point {
    static BUSINESSTYPE = "InfoDeploy";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || InfoDeployPoint.BUSINESSTYPE;
        this.scan360Timer = null;
        this.scanFixedRangeTimer = null;
        this._showScope = false;
        this._drawTypeDeployType = options.infoDeployType;
    }
    // 绘制无动态扫描范围的固定侦察范围
    drawFixedReconnaissanceArea(data, layer) {
        if (data && data.scopeSf && data.scopeSf.polygonGeom && data.scopeSf.polygonGeom.coordinates) {
            const coordinates = data.scopeSf.polygonGeom.coordinates;
            let positions = coordinates;
            const id = `${data.id}-fixedArea`;
            let {source, feature} = layer.getFeatureById(id, Node.POLYGON);
            if (!feature) {
                feature = new Polygon({
                    geometry: {type: Node.POLYGON, coordinates: positions},
                    properties: {
                        id,
                        sourceType: Node.POLYGON,
                        drawType: Node.POLYGON,
                        areaColor: '#81D3F8',
                        areaOpacity: 0.45
                    },
                    otherFeature: {
                        symbol: new Point({
                            geometry: {type: Node.POINT, coordinates: positions[0][1]},
                            properties: {
                                id: `${id}-symbol`,
                                sourceType: Node.POLYGON,
                                drawType: Node.POINT,
                                name: `${data.scopeSf.radiusKm} km`
                            }
                        })
                    }
                });
                feature && layer.addFeature(feature);
            } else {
                feature.update({source, options: {
                    geometry: {type: Node.POLYGON, coordinates: positions},
                    properties: {...feature.properties}
                }});
            }
            this._showScope = true;
            layer._map.featuresCache.updateCacheById(this); // 更新缓存
            layer.moveLayerToBLayerId(Node.POINT, Node.POLYGON);
            return feature;
        }
    }
    // 关闭无动态扫描范围的固定侦察范围
    closeFixedReconnaissanceArea(id, layer) {
        if (!id || !layer) return;
        layer.removeFeatureById(`${id}-fixedArea`);
    }
    // 绘制有动态扫描范围的动态侦察范围
    drawDynamicReconnaissanceArea(data, layer) {
        // 固定面
        let fixedAreaEntity = this.drawFixedReconnaissanceArea(data, layer);
        // 动态面
        let dynamicAreaEntity = '';
        if (data && data.scanArea && data.scanArea.coordinates) {
            const coordinates = data.scanArea.coordinates;
            let positions = coordinates;
            const id = `${data.id}-dynamicArea`;
            let {source, feature} = layer.getFeatureById(id, Node.POLYGON);
            if (!feature) {
                feature = new Polygon({
                    geometry: {type: Node.POLYGON, coordinates: positions},
                    properties: {
                        id,
                        sourceType: Node.POLYGON,
                        drawType: Node.POLYGON,
                        areaColor: '#016FA0',
                        areaOpacity: 0.45
                    }
                });
                feature && layer.addFeature(feature);
            } else {
                feature.update({source, options: {
                    geometry: {type: Node.POLYGON, coordinates: positions},
                    properties: {...feature.properties}
                }});
            }
            dynamicAreaEntity = feature;
            this._showScope = true;
            layer._map.featuresCache.updateCacheById(this); // 更新缓存
            layer.moveLayerToBLayerId(Node.POINT, Node.POLYGON);
        }
        // 开始扫描区域旋转
        setTimeout(() => {
            if (fixedAreaEntity && dynamicAreaEntity) {
                let {source} = layer.getFeatureById(dynamicAreaEntity.id, Node.POLYGON);
                if (data && data.positionSf && data.positionSf.pointGeom && data.positionSf.pointGeom.coordinates) {
                    if (!data.horizontalAngleTo || (data.horizontalAngleTo - data.horizontalAngleFrom) >= 360) {
                        // 圆形
                        this.degreeAreaRotationScan360(data, dynamicAreaEntity, source);
                    } else {
                        // 扇形
                        this.fixedRangeScanning(data, dynamicAreaEntity, source);
                    }
                }
            }
        });
    }
    // 关闭有动态扫描范围的动态侦察范围
    closeDynamicReconnaissanceArea(id, layer) {
        if (!id || !layer) return;
        if (this.scan360Timer) {
            clearTimeout(this.scan360Timer);
            this.scan360Timer = null;
        }
        if (this.scanFixedRangeTimer) {
            clearTimeout(this.scanFixedRangeTimer);
            this.scanFixedRangeTimer = null;
        }
        this.closeFixedReconnaissanceArea(id, layer);
        layer.removeFeatureById(`${id}-dynamicArea`);
    }
    // 360度区域旋转扫描
    degreeAreaRotationScan360(data, dynamicAreaEntity, source) {
        let centerPoint = data.positionSf.pointGeom.coordinates; // 中心点
        let centerPosition = Cesium.Cartesian3.fromDegrees(...centerPoint); // 中心点的Cartesian3 坐标
        let enuFrame = createENUFrame(centerPosition); // 以中心点建立东北天局部坐标系
        let enuCenterPosition = enuFrame.worldToEnu(centerPosition); // 中心点的东北天坐标
        // 扇形的Cartesian3 坐标
        let vertices = [];
        dynamicAreaEntity.geometry.coordinates[0].map(item => {
            vertices.push(Cesium.Cartesian3.fromDegrees(...item));
        });
        let rotationFunc = () => {
            this.scan360Timer = setTimeout(() => {
                // 将扇形的世界坐标系转换成本地东北天坐标
                let enuVertices = [];
                vertices.map(item => {
                    let itemEnuPoint = enuFrame.worldToEnu(item);
                    enuVertices.push(itemEnuPoint);
                });
                // 旋转坐标
                let aroundPoints = rotatePointsAroundZAxis(
                    enuVertices,
                    enuCenterPosition,
                    -defaultRotationAngle
                );
                // 将本地东北天坐标转换成扇形的世界坐标系
                let worldVertices = [];
                aroundPoints.map(item => {
                    let itemWorldPoint = enuFrame.enuToWorld(item);
                    worldVertices.push(itemWorldPoint);
                });
                vertices = worldVertices; // 重新赋值坐标集合用作下次旋转
                let positions = [];
                // 将坐标转成经纬度坐标
                worldVertices.map(item => {
                    let cartographic = Cesium.Cartographic.fromCartesian(item);
                    let position = [
                        Cesium.Math.toDegrees(cartographic.longitude), 
                        Cesium.Math.toDegrees(cartographic.latitude)
                    ];
                    positions.push(position);
                });
                dynamicAreaEntity.update({source, options: {
                    geometry: {type: Node.POLYGON, coordinates: [positions]},
                    properties: {...dynamicAreaEntity.properties}
                }});
                rotationFunc();
            }, defaultRotationTime);
        }
        rotationFunc();
    }
    // 区域固定范围来回扫描
    fixedRangeScanning(data, dynamicAreaEntity, source) {
        let isClockwise = true; // 是否顺时针旋转
        let angleDifference = data.horizontalAngleTo - data.horizontalAngleFrom;// 大扇形的角度差值
        let viewAngle = data.viewAngle; // 小扇形的视场角
        if (angleDifference - viewAngle < 0.3) return; // 如果视场角等于大扇形的角度差值或者小于0.3度时，则小扇形不需要旋转
        let rotationAddAngle = 0; // 小扇形每次旋转增加的角度(初始值为0)
        let rotationAngle = -defaultRotationAngle; // 小扇形每次的旋转角度
        let centerPoint = data.positionSf.pointGeom.coordinates; // 中心点
        let centerPosition = Cesium.Cartesian3.fromDegrees(...centerPoint); // 中心点的Cartesian3 坐标
        let enuFrame = createENUFrame(centerPosition); // 以中心点建立东北天局部坐标系
        let enuCenterPosition = enuFrame.worldToEnu(centerPosition); // 中心点的东北天坐标
        // 扇形的Cartesian3 坐标
        let vertices = [];
        dynamicAreaEntity.geometry.coordinates[0].map(item => {
            vertices.push(Cesium.Cartesian3.fromDegrees(...item));
        });
        let rotationFunc = () => {
            this.scanFixedRangeTimer = setTimeout(() => {
                if (isClockwise) {
                    // 顺时针旋转
                    if (rotationAddAngle + defaultRotationAngle >= angleDifference - viewAngle) {
                        // 大于大扇形的结束角度
                        isClockwise = false;
                        if (rotationAddAngle + defaultRotationAngle > angleDifference - viewAngle) {
                            rotationAngle = -(rotationAddAngle + defaultRotationAngle - (angleDifference - viewAngle));
                        } else {
                            rotationAngle = -defaultRotationAngle;
                        }
                        rotationAddAngle = angleDifference - viewAngle;
                    } else {
                        rotationAngle = -defaultRotationAngle;
                        rotationAddAngle = rotationAddAngle + defaultRotationAngle;
                    }
                } else {
                    // 逆时针旋转
                    if (rotationAddAngle - defaultRotationAngle <= 0) {
                        // 小于大扇形的开始角度
                        isClockwise = true;
                        if (rotationAddAngle - defaultRotationAngle < 0) {
                            rotationAngle = 0 - (rotationAddAngle - defaultRotationAngle);
                        } else {
                            rotationAngle = defaultRotationAngle;
                        }
                        rotationAddAngle = 0;
                    } else {
                        rotationAngle = defaultRotationAngle;
                        rotationAddAngle = rotationAddAngle - defaultRotationAngle;
                    }
                }
                // 将扇形的世界坐标系转换成本地东北天坐标
                let enuVertices = [];
                vertices.map(item => {
                    let itemEnuPoint = enuFrame.worldToEnu(item);
                    enuVertices.push(itemEnuPoint);
                });
                // 旋转坐标
                let aroundPoints = rotatePointsAroundZAxis(
                    enuVertices,
                    enuCenterPosition,
                    rotationAngle
                );
                // 将本地东北天坐标转换成扇形的世界坐标系
                let worldVertices = [];
                aroundPoints.map(item => {
                    let itemWorldPoint = enuFrame.enuToWorld(item);
                    worldVertices.push(itemWorldPoint);
                });
                vertices = worldVertices; // 重新赋值坐标集合用作下次旋转
                let positions = [];
                // 将坐标转成经纬度坐标
                worldVertices.map(item => {
                    let cartographic = Cesium.Cartographic.fromCartesian(item);
                    let position = [
                        Cesium.Math.toDegrees(cartographic.longitude), 
                        Cesium.Math.toDegrees(cartographic.latitude)
                    ];
                    positions.push(position);
                });
                dynamicAreaEntity.update({source, options: {
                    geometry: {type: Node.POLYGON, coordinates: [positions]},
                    properties: {...dynamicAreaEntity.properties}
                }});
                rotationFunc();
            }, defaultRotationTime);
        }
        rotationFunc();
    }
}