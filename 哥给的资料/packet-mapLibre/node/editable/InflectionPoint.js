export default class InflectionPoint {
    constructor(options) {
        this._color = options.color || "#1A2B2E";
        this._index = options.index || '';
        this._iconImg = this.initInflectionPoint();
    }
    get iconImg() {
        return this._iconImg;
    }

    initInflectionPoint() {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 24;
        canvas.height = 24;
        // 按照下边参数开始绘制新路径
        ctx.beginPath();
        //（圆心X坐标，圆心Y坐标，半径，开始角度（弧度），结束角度弧度，是否按照顺时针画）
        ctx.arc(12, 12, 12 - 2, 0, Math.PI * 2, true); 
        //关闭路径
        ctx.closePath();
        // 设置填充颜色
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.font = "16px lion";
        ctx.textAlign = "center";
        ctx.fillStyle = this._color;
        ctx.fillText(`${this._index}`, 12, 18);
        let image = new Image();
        image.src = canvas.toDataURL("image/png");
        return image;
    }
}