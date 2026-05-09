import {generateUUID} from "@/util/util";
import Node from "../../base/Node";
import BaseLayer from "../../../BaseLayer";
import Point from '../../base/Point';
import Line from "../../base/Line";
import Polygon from "../../base/Polygon";

export class FlyPoint extends Point {
    static BUSINESSTYPE = "FlyPoint";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyPoint.BUSINESSTYPE;
    }
}
export class FlyLine extends Line {
    static BUSINESSTYPE = "FlyLine";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyLine.BUSINESSTYPE;
    }
}
export class FlyVisualPolygon  extends Polygon {
    static BUSINESSTYPE = "FlyVisualPolygon";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyVisualPolygon.BUSINESSTYPE;
    }
}
export class FlyVisualPolygonLine extends Line {
    static BUSINESSTYPE = "FlyVisualPolygonLine";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyVisualPolygonLine.BUSINESSTYPE;
    }
}
export class FlyHomePoint extends Point {
    static BUSINESSTYPE = "FlyHomePoint";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyHomePoint.BUSINESSTYPE;
    }
}

export class FlyLandscapePoint extends Point {
    static BUSINESSTYPE = "FlyLandscapePoint";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyLandscapePoint.BUSINESSTYPE;
    }
}
export class FlyLandscapeLine extends Line {
    static BUSINESSTYPE = "FlyLandscapeLine";
    constructor(options) {
        super(options);
        this._businessType = options.businessType || FlyLandscapeLine.BUSINESSTYPE;
    }
}

export class FlyAirlineLine extends Line {
    constructor(options) {
        super(options);
        this._options = options;
        this._layerId = generateUUID();
        this._layer = new BaseLayer({
            id: this._layerId,
            map: options.map,
            layerConfig: {
                layout: {
                    symbol: {
                        'icon-image': ['get', 'useIcon'],
                        'icon-size': ['coalesce', ['get', 'iconSize'], 1],
                        'icon-anchor': 'center',
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true
                    }
                }
            }
        });
    }
    initClass() {
        this.initPoints(this._options);
    }
    initPoints(options) {
        let length = options.wayPoints ? options.wayPoints.length : 0;
        (options.wayPoints || []).map((item, index) => {
            let pointParams = {
                id: `${options.properties.id}${index + 1}`,
                // name: item.name,
                position: item.point,
                index,
                indexText: `${index + 1}`,
                color: options.color || "#1890FF",
                pointSize: options.pointSize,
                pointTextSize: options.pointTextSize,
                pointTextY: options.pointTextY
            };
            if (options.isShowNum) {
                pointParams.indexText = index + 1 == 1 ? 'S' : (index + 1 == length ? `E` : `${index + 1}`);
            } else {
                pointParams.indexText = index + 1 == 1 ? 'S' : (index + 1 == length ? `E` : '');
            }
            let iconImg = getPlanAirLinePointStyle({
                text: `${pointParams.indexText}`,
                color: pointParams.color,
                pointSize: pointParams.pointSize,
                pointTextSize: pointParams.pointTextSize,
                pointTextY: pointParams.pointTextY
            });
            if (iconImg) {
                const iconId = `PlanAirLinePoint-${pointParams.indexText}-${pointParams.color}`;
                let point = new FlyAirlineLinePoint({
                    geometry: {type: Node.POINT, coordinates: pointParams.position},
                    properties: {
                        id: pointParams.id,
                        sourceType: Node.LINE,
                        drawType: Node.POINT,
                        useIcon: iconId,
                        icons: [{id: iconId, url: iconImg.src}]
                    }
                });
                this._layer.addFeature(point);
            }
        });
    }
    destroyClass() {
        this._layer && this._layer.destroy();
    }
}
class FlyAirlineLinePoint extends Point {
    constructor(options) {
        super(options);
    }
}

// 航点的样式
function getPlanAirLinePointStyle(options) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = options.pointSize || 15;
    canvas.width = canvas.height = size;
    // 按照下边参数开始绘制新路径
    ctx.beginPath();
    //（圆心X坐标，圆心Y坐标，半径，开始角度（弧度），结束角度弧度，是否按照顺时针画）
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2, true); 
    //关闭路径
    ctx.closePath();
    // 设置边框样式
    ctx.lineWidth = 4; // 边框宽度
    ctx.strokeStyle = "#FFFFFF"; // 边框颜色
    ctx.stroke();
    // 设置填充颜色
    ctx.fillStyle = options.color || '#1890FF';
    ctx.fill();
    ctx.font = `${options.pointTextSize || 11}px sans-serif`;
    ctx.textAlign = "center";
    // '#1A2B2E'
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(options.text, size / 2, options.pointTextY || 12);
    let image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image;
}