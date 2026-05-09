import Node from "../node/base/Node";
import {FlyPoint, FlyLine, FlyVisualPolygon, 
    FlyVisualPolygonLine, FlyHomePoint} from "../node/bussiness/LiveFlyRoute/FlyRoute";
import BaseLayer from "../BaseLayer";
import defaultPlaneIcon from "@/assets/img/map/XC_64x64_.png";
import defaultHomeIcon from "@/assets/map/homePoint.png";
function isValidPolygon(positions) {
    if (positions.length < 3) {
        // 至少需要3个点来形成一个有效的多边形
        return false;
    }
    // 检查所有顶点是否相同
    const coords = positions;
    if (coords.length === 0) return false;
    const firstCoord = coords[0];
    let isPointDegenerated =  coords.every(coord => 
        coord[0] === firstCoord[0] && coord[1] === firstCoord[1]
    );
    return !isPointDegenerated;
}

const userFlyRouteHook = () => {
    let map2dCollection, flylineLayer;
    let isShowVisualFlyPath = false; // 是否需要绘制飞行轨迹
    let isShowVisualPolygon = false; // 是否需要绘制可视区域面
    let isShowHomePoint = false; // 是否需要绘制home起点marker
    let isFlightFollowing = false; // 是否需要飞行跟随
    let flightFollowingId = ''; // 跟随的实体id
    let isDefaultZoomTo = true; // 是否需要默认定位
    let wsList = []; // 缓存WebSocket链接实例
    // 存放每个飞机跳点过远的重绘次数
    let jumpPointRedrawObj = {
        // sn表示飞机序列号，num表示重绘次数
        // sn: 0
    };
    return (function() {
        // 初始化地图图层实例
        const setMap = (options) => {
            const {map2d, flylineLayerID, defaultZoomTo, showVisualFlyPath, showVisualPolygon, 
                showHomePoint, flightFollowing, fllowingId} = options;
            map2dCollection = map2d;
            isShowVisualFlyPath = showVisualFlyPath || false;
            isShowVisualPolygon = showVisualPolygon || false;
            isShowHomePoint = showHomePoint || false;
            isFlightFollowing = flightFollowing || false;
            flightFollowingId = fllowingId || '';
            isDefaultZoomTo = defaultZoomTo !== '' && defaultZoomTo !== null && defaultZoomTo !== undefined 
                ? defaultZoomTo : true;
            // 初始化飞行绘制层
            flylineLayer = new BaseLayer({
                id: flylineLayerID || "flylineLayer",
                map: map2dCollection,
                layerConfig: {
                    layout: {
                        symbol: {
                            'icon-image': ['get', 'useIcon'],
                            'icon-size': ['coalesce', ['get', 'iconSize'], 0.5],
                            'icon-rotate': ['coalesce', ['get', 'yaw'], 0],
                            'icon-anchor': 'center',
                            'icon-allow-overlap': true,
                            'icon-ignore-placement': true,
                            'text-field': ['get', 'name'],
                            'text-size': ['coalesce', ['get', 'textSize'], 14],
                            'text-font': ['sans-serif'],
                            'text-justify': 'center',
                            'text-anchor': 'top',
                            'text-offset': ['coalesce', ['get', 'textOffset'], ['literal', [0, 3]]],
                            'text-allow-overlap': true,
                            'text-ignore-placement': true
                        },
                        fill: {}
                    },
                    paint: {
                        symbol: {
                            'icon-opacity': ['coalesce', ['get', 'colorAlpha'], 1],
                            'text-color': '#fff',
                            'text-halo-color': '#000',
                            'text-halo-width': 3
                        },
                        line: {
                            'line-color': ['coalesce', ['get', 'lineColor'], '#FFB100'],
                            'line-width': ['coalesce', ['get', 'lineWidth'], 2],
                            'line-dasharray': ['coalesce', ['get', 'lineDasharray'], ['literal', [1, 0]]],
                            'line-opacity': ['coalesce', ['get', 'colorAlpha'], 1]
                        },
                        fill: {
                            'fill-color': ['coalesce', ['get', 'fillColor'], '#FFB100'],
                            'fill-opacity': ['coalesce', ['get', 'fillOpacity'], 0.45]
                        }
                    }
                }
            });
            // 添加默认图片到地图图片集中
            map2dCollection.ensureAllImages([
                {id: defaultPlaneIcon, url: defaultPlaneIcon},
                {id: defaultHomeIcon, url: defaultHomeIcon}
            ]);
        };
        // 获取当前hooks内的图层实例
        const getFlylineLayerObj = () => {
            return flylineLayer;
        };
        // 初始化WebSocket链接
        const initWebSocket = (options) => {
            const {id, entityIcon, url, callback} = options;
            const ws = new WebSocket(url);
            wsList.push(ws);
            ws.onopen = () => {
                ws.onmessage = (evt) => {
                    const wsData = JSON.parse(evt.data);
                    callback && callback({id, entityIcon, data: wsData});
                };
            }
            return ws;
        };
        // 处理飞行路线及可视区域坐标数据
        const handlingRoutes = (options) => {
            const {id, lon, lat, homelon, homelat, yaw, pitch, roll, visualScope, flyPoint, flyLine, flyPolygon, flyPolygonLine, 
                flyHomePoint, showEntityLabel, entityLabelText, entityIcon, iconSize, homeIcon, homeIconSize, lineColor, 
                lineWidth, polygonColor, polygonAlpha, showVisibleArea, isUpDate, callback} = options;
            if (!lon || !lat) return;
            const tempLon = Number(lon) * 1;
            const tempLat = Number(lat) * 1;
            if (!tempLon || !tempLat || isNaN(tempLon) || isNaN(tempLat)) return;
            const tempYaw = Number(yaw);
            const tempPitch = Number(pitch);
            const tempRoll = Number(roll);
            const position = [tempLon, tempLat];
            let polygonPositions = []; // 可视区面经纬度数据信息
            let polygonLinePositions = []; // 可视区面连线经纬度数据信息
            if (isShowVisualPolygon && visualScope) {
                const polygonPosition = (visualScope || []).find(t => t.type === 'Polygon');
                polygonPosition && polygonPosition.coordinates[0] && polygonPosition.coordinates[0].map(item => {
                    polygonPositions.push([item[0], item[1]]);
                });
                if (isValidPolygon(polygonPositions)) {
                    if (polygonPositions && polygonPositions.length >= 3) {
                        // polygonLinePositions.push(polygonPositions[1]);
                        // polygonLinePositions.push(position);
                        // polygonLinePositions.push(polygonPositions[2]);
                        // 计算面的中心点
                        polygonLinePositions.push(position);
                        const poly = turf.polygon(polygonPosition.coordinates);
                        const cenIn = turf.centerOfMass(poly);
                        polygonLinePositions.push(
                            [cenIn.geometry.coordinates[0], cenIn.geometry.coordinates[1]]
                        );
                    }
                } else {
                    polygonPositions = [];
                }
            }
            let homePosition = "";
            if (homelon && homelat) {
                homePosition = [Number(homelon), Number(homelat)];
            }
            // callback主要为后续操作提供执行函数，可能是初始化创建实体，可能是更新实体
            let data;
            if (callback) {
                let params;
                if (!isUpDate) {
                    params = {id, position, homePosition, yaw: tempYaw, pitch: tempPitch, roll: tempRoll, polygonPositions, 
                        polygonLinePositions, icon: entityIcon, iconSize, showLabel: showEntityLabel, labelText: entityLabelText, 
                        homeIcon, homeIconSize, lineColor, lineWidth, polygonColor, polygonAlpha, showVisibleArea};
                } else {
                    params = {id, flyPoint, flyLine, flyPolygon, flyPolygonLine, flyHomePoint, position, homePosition, 
                        yaw: tempYaw, pitch: tempPitch, roll: tempRoll, polygonPositions, polygonLinePositions, icon: entityIcon, 
                        iconSize, showLabel: showEntityLabel, labelText: entityLabelText, homeIcon, homeIconSize, lineColor, 
                        lineWidth, polygonColor, polygonAlpha, showVisibleArea};
                }
                data = callback(params);
            }
            return {...data, lonArr: [tempLon, tempLat], isUpDate};
        };
        // 查找当前飞行路线是否已存在实体
        const findEntityById = (options) => {
            const {id, data} = options;
            if (data && data.hasOwnProperty("id")) delete data.id;
            if (!flylineLayer) return;
            let flyPoint = getEntityById(id);
            let flyLine, flyPolygon, flyPolygonLine, flyHomePoint;
            if (isShowVisualFlyPath) {
                flyLine = getEntityById(`${id}-line`);
            }
            if (isShowVisualPolygon) {
                flyPolygon = getEntityById(`${id}-polygon`);
                flyPolygonLine = getEntityById(`${id}-polygonLine`);
            }
            if (isShowHomePoint) {
                flyHomePoint = getEntityById(`${id}-HomePoint`);
            }
            if (!flyPoint) {
                // 初始化实体数据创建实体
                return handlingRoutes({...options, ...data, isUpDate: false, callback: initFlyRoute});
            } else {
                // 更新实体
                return handlingRoutes({...options, ...data, flyPoint, flyLine, flyPolygon, flyPolygonLine, 
                    flyHomePoint, isUpDate: true, callback: changeFlyRoute});
            }
        };
        // 渲染飞行路线以及可视区域
        const initFlyRoute = (options) => {
            let sn = options.id;
            let flyPoint = new FlyPoint({
                geometry: {type: Node.POINT, coordinates: options.position},
                properties: {
                    id: sn,
                    sourceType: Node.POINT,
                    drawType: Node.POINT,
                    yaw: Number(options.yaw) || 0,
                    name: options.labelText,
                    useIcon: options.icon,
                    icons: [{id: options.icon, url: options.icon}],
                    iconSize: options.iconSize
                }
            });
            flylineLayer && flylineLayer.addFeature(flyPoint);
            if (isDefaultZoomTo) {
                map2dCollection.fitBoundsRange(flyPoint.geometry);
            }
            let flyLine, flyPolygon, flyPolygonLine, flyHomePoint;
            if (isShowVisualFlyPath) {
                let id = `${sn}-line`;
                flyLine = new FlyLine({
                    geometry: {type: Node.LINE, coordinates: [options.position]},
                    properties: {
                        id,
                        sourceType: Node.LINE,
                        drawType: Node.LINE,
                        lineColor: options.lineColor,
                        lineWidth: options.lineWidth
                    }
                });
                flylineLayer && flylineLayer.addFeature(flyLine);
            }
            if (isShowVisualPolygon && options.showVisibleArea && options.polygonPositions && options.polygonPositions.length) {
                let id = `${sn}-polygon`;
                flyPolygon = new FlyVisualPolygon({
                    geometry: {type: Node.POLYGON, coordinates: [options.polygonPositions]},
                    properties: {
                        id,
                        sourceType: Node.POLYGON,
                        drawType: Node.POLYGON,
                        fillColor: options.polygonColor,
                        fillOpacity: options.polygonAlpha
                    }
                });
                flylineLayer && flylineLayer.addFeature(flyPolygon);
            } else {
                clearUavPolygonEntity(sn);
            }
            if (isShowVisualPolygon && options.showVisibleArea && options.polygonLinePositions && options.polygonLinePositions.length) {
                let id = `${sn}-polygonLine`;
                flyPolygonLine = new FlyVisualPolygonLine({
                    geometry: {type: Node.LINE, coordinates: options.polygonLinePositions},
                    properties: {
                        id,
                        sourceType: Node.LINE,
                        drawType: Node.LINE,
                        lineWidth: 1,
                        lineDasharray: [5, 6]
                    }
                });
                flylineLayer && flylineLayer.addFeature(flyPolygonLine);
            } else {
                clearUavPolygonEntity(sn);
            }
            if (isShowHomePoint && options.homePosition) {
                let id = `${options.id}-HomePoint`;
                flyHomePoint = new FlyHomePoint({
                    geometry: {type: Node.POINT, coordinates: options.homePosition},
                    properties: {
                        id,
                        sourceType: Node.POINT,
                        drawType: Node.POINT,
                        useIcon: options.homeIcon,
                        icons: [{id: options.homeIcon, url: options.homeIcon}],
                        iconSize: options.homeIconSize
                    }
                });
                flylineLayer && flylineLayer.addFeature(flyHomePoint);
            }
            return {flyPoint, flyLine: flyLine || null, flyPolygon: flyPolygon || null, 
                flyPolygonLine: flyPolygonLine || null, flyHomePoint: flyHomePoint || null, options};
        };
        // 改变飞行路线以及可视区域
        const changeFlyRoute = (options) => {
            let sn = options.id;
            let {flyPoint, flyLine, flyPolygon, flyPolygonLine, flyHomePoint, icon, position, yaw, 
                pitch, roll, lineWidth, polygonPositions, polygonLinePositions, showVisibleArea} = options;
            let {source} = flylineLayer.getFeatureById(flyPoint.id, Node.POINT);
            flyPoint.update({source, options: {
                geometry: {type: Node.POINT, coordinates: position},
                properties: {
                    ...flyPoint.properties,
                    useIcon: icon,
                    icons: [{id: icon, url: icon}],
                    yaw: Number(yaw) || 0
                }
            }});
            flylineLayer.moveLayerToTop(Node.POINT); // 将飞机图层提升到最顶层
            flightFollowing(flyPoint);
            if (isShowVisualFlyPath && flyLine) {
                let old = flyLine.geometry.coordinates;
                let now = old.concat([]);
                let last = now[now.length - 1];
                now.push(position);
                // 计算两点之间的距离(单位：m)
                const point1 = turf.point(last);
                const point2 = turf.point(position);
                let distance = turf.distance(point1, point2, {units: 'meters'});
                if (distance > (window.global.VUE_APP_JUMP_POINT_DISTANCE_THRESHOLD || 80)) {
                    /**
                     * 两点之间的距离大于config中定义的阈值，先删除之前实体的id
                     * 先删除之前实体的id，并记录跳点次数
                     * 用新的id重新绘制旧轨迹线，再用旧id重新绘制新轨迹线
                     */
                    let gjLineStaus = flyLine.properties.visibility || false;
                    let gjLineColor = flyLine.properties.lineColor;
                    let id = `${sn}-line`;
                    let num = jumpPointRedrawObj[sn];
                    num = !num ? 1 : num + 1;
                    jumpPointRedrawObj[sn] = num;
                    // 先操作旧轨迹
                    flylineLayer.removeFeatureById(id);
                    let oldFlyLine = new FlyLine({
                        geometry: {type: Node.LINE, coordinates: old},
                        properties: {
                            id: `${id}-${num}`,
                            sourceType: Node.LINE,
                            drawType: Node.LINE,
                            lineColor: gjLineColor,
                            lineWidth: lineWidth,
                            visibility: gjLineStaus
                        }
                    });
                    flylineLayer && flylineLayer.addFeature(oldFlyLine);
                    // 再重新绘制新的轨迹线
                    let newFlyLine = new FlyLine({
                        geometry: {type: Node.LINE, coordinates: [position]},
                        properties: {
                            id,
                            sourceType: Node.LINE,
                            drawType: Node.LINE,
                            lineColor: gjLineColor,
                            lineWidth: lineWidth,
                            visibility: gjLineStaus
                        }
                    });
                    flylineLayer && flylineLayer.addFeature(newFlyLine);
                    flyLine = newFlyLine;
                } else {
                    let {source} = flylineLayer.getFeatureById(flyLine.id, Node.LINE);
                    flyLine.update({source, options: {
                        geometry: {type: Node.LINE, coordinates: now},
                        properties: {...flyLine.properties}
                    }});
                }
            }
            if (isShowVisualPolygon && showVisibleArea && polygonPositions && polygonPositions.length) {
                if (flyPolygon) {
                    let {source} = flylineLayer.getFeatureById(flyPolygon.id, Node.POLYGON);
                    flyPolygon.update({source, options: {
                        geometry: {type: Node.POLYGON, coordinates: [polygonPositions]},
                        properties: {...flyPolygon.properties}
                    }});
                } else {
                    let id = `${sn}-polygon`;
                    flyPolygon = new FlyVisualPolygon({
                        geometry: {type: Node.POLYGON, coordinates: [polygonPositions]},
                        properties: {
                            id,
                            sourceType: Node.POLYGON,
                            drawType: Node.POLYGON,
                            fillColor: options.polygonColor,
                            fillOpacity: options.polygonAlpha
                        }
                    });
                    flylineLayer && flylineLayer.addFeature(flyPolygon);
                }
            } else {
                clearUavPolygonEntity(sn);
            }
            if (isShowVisualPolygon && showVisibleArea && polygonLinePositions && polygonLinePositions.length) {
                if (flyPolygonLine) {
                    let {source} = flylineLayer.getFeatureById(flyPolygonLine.id, Node.LINE);
                    flyPolygonLine.update({source, options: {
                        geometry: {type: Node.LINE, coordinates: polygonLinePositions},
                        properties: {...flyPolygonLine.properties}
                    }});
                } else {
                    let id = `${sn}-polygonLine`;
                    flyPolygonLine = new FlyVisualPolygonLine({
                        geometry: {type: Node.LINE, coordinates: polygonLinePositions},
                        properties: {
                            id,
                            sourceType: Node.LINE,
                            drawType: Node.LINE,
                            lineWidth: 1,
                            lineDasharray: [5, 6]
                        }
                    });
                    flylineLayer && flylineLayer.addFeature(flyPolygonLine);
                }
            } else {
                clearUavPolygonEntity(sn);
            }
            if (isShowHomePoint && options.homePosition) {
                if (flyHomePoint) {
                    let {source} = flylineLayer.getFeatureById(flyHomePoint.id, Node.POINT);
                    flyHomePoint.update({source, options: {
                        geometry: {type: Node.POINT, coordinates: options.homePosition},
                        properties: {...flyHomePoint.properties}
                    }});
                } else {
                    let id = `${sn}-HomePoint`;
                    flyHomePoint = new FlyHomePoint({
                        geometry: {type: Node.POINT, coordinates: options.homePosition},
                        properties: {
                            id,
                            sourceType: Node.POINT,
                            drawType: Node.POINT,
                            useIcon: options.homeIcon,
                            icons: [{id: options.homeIcon, url: options.homeIcon}],
                            iconSize: options.homeIconSize
                        }
                    });
                    flylineLayer && flylineLayer.addFeature(flyHomePoint);
                }
            }
            return {flyPoint, flyLine, flyPolygon, flyPolygonLine, flyHomePoint, options};
        };
        // 改变飞机以及路线，home点实体样式
        const changeEntityStyle = (id, entityIcon, color, homeIcon) => {
            let flyPoint = getEntityById(id);
            if (flyPoint) {
                let {source} = flylineLayer.getFeatureById(flyPoint.id, Node.POINT);
                flyPoint.update({source, options: {
                    geometry: flyPoint.geometry,
                    properties: {
                        ...flyPoint.properties,
                        useIcon: entityIcon || defaultPlaneIcon,
                        icons: [{id: entityIcon || defaultPlaneIcon, url: entityIcon || defaultPlaneIcon}]
                    }
                }});
            }
            let flyLine = getEntityById(`${id}-line`);
            let flyHomePoint = getEntityById(`${id}-HomePoint`);
            if (flyLine) {
                let {source} = flylineLayer.getFeatureById(flyLine.id, Node.LINE);
                flyLine.update({source, options: {
                    geometry: flyLine.geometry,
                    properties: {...flyLine.properties, lineColor: color || "#FFB100"}
                }});
            }
            let drawNum = jumpPointRedrawObj[id];
            if (drawNum) {
                for (let i = 1; i <= drawNum; i++) {
                    let flyLineItem = getEntityById(`${id}-line-${i}`);
                    if (flyLineItem) {
                        let {source} = flylineLayer.getFeatureById(flyLineItem.id, Node.LINE);
                        flyLineItem.update({source, options: {
                            geometry: flyLineItem.geometry,
                            properties: {...flyLineItem.properties, lineColor: color || "#FFB100"}
                        }});
                    }
                }
            }
            if (flyHomePoint) {
                let {source} = flylineLayer.getFeatureById(flyHomePoint.id, Node.POINT);
                flyHomePoint.update({source, options: {
                    geometry: flyHomePoint.geometry,
                    properties: {
                        ...flyHomePoint.properties, 
                        useIcon: homeIcon || defaultHomeIcon,
                        icons: [{id: homeIcon || defaultHomeIcon, url: homeIcon || defaultHomeIcon}],
                    }
                }});
            }
        };
        // 改变飞机实体大小
        const changeEntitySize = (id, size, entityIcon, color, homeImg) => {
            let flyPoint = getEntityById(id);
            if (flyPoint) {
                if (entityIcon) {
                    changeEntityStyle(id, entityIcon, color, homeImg);
                }
                let {source} = flylineLayer.getFeatureById(flyPoint.id, Node.POINT);
                flyPoint.update({source, options: {
                    geometry: flyPoint.geometry,
                    properties: {...flyPoint.properties, iconSize: size}
                }});
            }
        };
        // 通过id获取对应实体
        const getEntityById = (id) => {
            if (!id) return;
            return map2dCollection.featuresCache.getCacheById(id);
        };
        // 定位到飞机实体
        const locationToEntity = (id) => {
            if (!id) return;
            let feature = getEntityById(id);
            if (!feature) return;
            map2dCollection.fitBoundsRange(feature.geometry);
        };
        // 切换是否跟随
        const changeFlightFollowing = (id, follwing) => {
            if (follwing !== undefined && follwing !== null) {
                isFlightFollowing = follwing;
            } else {
                isFlightFollowing = !isFlightFollowing;
            }
            flightFollowingId = isFlightFollowing ? (id || '') : '';
            return isFlightFollowing;
        };
        // 通过id获取实体设置跟随
        const setFlightFollowingById = (id, follwing) => {
            if (!id) return;
            if (follwing) {
                isFlightFollowing = follwing;
                flightFollowingId = id || '';
            }
            return isFlightFollowing;
        };
        // 跟随设置
        const flightFollowing = (feature) => {
            if (!feature) return;
            if (isFlightFollowing && flightFollowingId === feature.id) {
                map2dCollection.fitBoundsRange(feature.geometry);
            }
        };
        // 根据id打开/隐藏指定飞行轨迹
        const showOrHideUavFlyline = (id, status) => {
            if (!id) return;
            let lineNodeId = `${id}-line`;
            let flyLine = getEntityById(lineNodeId);
            if (flyLine) {
                let {source} = flylineLayer.getFeatureById(flyLine.id, Node.LINE);
                flyLine.update({source, options: {
                    geometry: flyLine.geometry,
                    properties: {...flyLine.properties, visibility: status}
                }});
            }
            let drawNum = jumpPointRedrawObj[id];
            if (drawNum) {
                for (let i = 1; i <= drawNum; i++) {
                    let flyLineItem = getEntityById(`${id}-line-${i}`);
                    if (flyLineItem) {
                        let {source} = flylineLayer.getFeatureById(flyLineItem.id, Node.LINE);
                        flyLineItem.update({source, options: {
                            geometry: flyLineItem.geometry,
                            properties: {...flyLineItem.properties, visibility: status}
                        }});
                    }
                }
            }
        };
        // 根据id重置指定飞行轨迹的坐标数组
        const resetUavFlylinePositions = (id, point = []) => {
            if (!id || !point || !point.length) return;
            let lineNodeId = `${id}-line`;
            let flyLine = getEntityById(lineNodeId);
            if (flyLine) {
                let {source} = flylineLayer.getFeatureById(flyLine.id, Node.LINE);
                flyLine.update({source, options: {
                    geometry: {type: Node.LINE, coordinates: point},
                    properties: {...flyLine.properties}
                }});
            }
            let drawNum = jumpPointRedrawObj[id];
            if (drawNum) {
                for (let i = 1; i <= drawNum; i++) {
                    flylineLayer.removeFeatureById(`${id}-line-${i}`);
                }
                delete jumpPointRedrawObj[id];
            }
        };
        // 根据id集合清除多个指定的飞机实体，路线，可视区，home点等
        const clearUavEntity = (ids = []) => {
            ids.map(t => {
                flylineLayer.removeFeatureById(t);
                let lineNodeId = `${t}-line`;
                let flyLine = getEntityById(lineNodeId);
                if (flyLine) {
                    flylineLayer.removeFeatureById(lineNodeId);
                }
                let drawNum = jumpPointRedrawObj[t];
                if (drawNum) {
                    for (let i = 1; i <= drawNum; i++) {
                        flylineLayer.removeFeatureById(`${t}-line-${i}`);
                    }
                    delete jumpPointRedrawObj[t];
                }
                let polygonNodeId = `${t}-polygon`;
                let flyPolygon = getEntityById(polygonNodeId);
                if (flyPolygon) {
                    flylineLayer.removeFeatureById(polygonNodeId);
                }
                let polygonLineNodeId = `${t}-polygonLine`;
                let flyPolygonLine = getEntityById(polygonLineNodeId);
                if (flyPolygonLine) {
                    flylineLayer.removeFeatureById(polygonLineNodeId);
                }
                flylineLayer.removeFeatureById(`${t}-HomePoint`);
            });
        };
        // 根据id清除指定的飞机的可视区
        const clearUavPolygonEntity = (id) => {
            if (!id) return;
            let polygonNodeId = `${id}-polygon`;
            let flyPolygon = getEntityById(polygonNodeId);
            if (flyPolygon) {
                flylineLayer.removeFeatureById(polygonNodeId);
            }
            let polygonLineNodeId = `${id}-polygonLine`;
            let flyPolygonLine = getEntityById(polygonLineNodeId);
            if (flyPolygonLine) {
                flylineLayer.removeFeatureById(polygonLineNodeId);
            }
        };
        // 单独清除当前flylineLayer层的飞行实体
        const clearFlylineLayer = () => {
            flylineLayer && flylineLayer.clearFeatures();
        };
        // 单独关闭清除当前hook维护的ws链接
        const closeWsLink = (ws) => {
            if (ws) {
                let wsItem = wsList.find(t => t == ws);
                if (wsItem) {
                    wsItem.close();
                    wsItem = null;
                }
            } else {
                wsList && wsList.map(t => {
                    t && t.close();
                });
                wsList = [];
            }
        };
        // 清除地图实例，图层实体，关闭ws链接
        const clearFlyRoute = () => {
            flylineLayer && flylineLayer.clearAllLayers();
            flylineLayer = null;
            jumpPointRedrawObj = {};
            map2dCollection = null;
            isShowVisualFlyPath = null;
            isShowVisualPolygon = null;
            isShowHomePoint = null;
            isFlightFollowing = null;
            flightFollowingId = '';
            wsList && wsList.map(t => {
                t && t.close();
            });
            wsList = [];
        };
        return {
            setMap,
            getFlylineLayerObj,
            initWebSocket,
            handlingRoutes,
            findEntityById,
            initFlyRoute,
            changeFlyRoute,
            changeEntityStyle,
            changeEntitySize,
            getEntityById,
            locationToEntity,
            changeFlightFollowing,
            setFlightFollowingById,
            flightFollowing,
            showOrHideUavFlyline,
            resetUavFlylinePositions,
            clearUavEntity,
            clearUavPolygonEntity,
            clearFlylineLayer,
            closeWsLink,
            clearFlyRoute
        };
    })();
};

export default userFlyRouteHook;