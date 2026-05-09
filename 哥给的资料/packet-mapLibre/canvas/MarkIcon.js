export default class MarkIcon {
  static R = 18
  static r = 6
  static width = 48
  static height = 56
  static center = {
    x: 24,
    y: 20
  }
  static hoverOutLineColor = '#FFFFFF'
  static  hoverOutLineWidth = 5
  static getIcon = function (color) {
    const center = MarkIcon.center, R = MarkIcon.R, r = MarkIcon.r
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = MarkIcon.width;
    canvas.height = MarkIcon.height;
    ctx.save()
    ctx.beginPath();
    ctx.strokeStyle = color
    ctx.lineWidth = 0
    ctx.arc(center.x, center.y, R, Math.PI * 5 / 6, Math.PI * 13 / 6); 
    ctx.lineTo( center.x, center.y + R *1.8)
    ctx.closePath();
    ctx.arc(center.x, center.y, r + MarkIcon.hoverOutLineWidth / 2, 0, Math.PI * 2, true);
    ctx.clip()
    ctx.fillStyle = color
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    let image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image
  }
  static getHoverIcon = function (color) {
    const center = MarkIcon.center, R = MarkIcon.R, r = MarkIcon.r
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = MarkIcon.width;
    canvas.height = MarkIcon.height;
    ctx.save()
    ctx.beginPath();
    ctx.strokeStyle = MarkIcon.hoverOutLineColor
    ctx.lineWidth = MarkIcon.hoverOutLineWidth
    ctx.arc(center.x, center.y, R + MarkIcon.hoverOutLineWidth / 2, Math.PI * 5 / 6, Math.PI * 13 / 6); 
    ctx.lineTo( center.x, center.y + R *1.8)
    ctx.closePath();
    ctx.moveTo(center.x, center.y)
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2, true);
    ctx.clip()
    ctx.fillStyle = color
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    let image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image
  }
  static getSelecteIcon = function(color){
    const center = MarkIcon.center, R = MarkIcon.R, r = MarkIcon.r
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = MarkIcon.width;
    canvas.height = MarkIcon.height;
    ctx.save()
    ctx.beginPath();
    ctx.strokeStyle = MarkIcon.hoverOutLineColor
    ctx.lineWidth = MarkIcon.hoverOutLineWidth
    ctx.arc(center.x, center.y, R + MarkIcon.hoverOutLineWidth / 2, Math.PI * 5 / 6, Math.PI * 13 / 6); 
    ctx.lineTo( center.x, center.y + R *1.8)
    ctx.closePath();
    ctx.moveTo(center.x, center.y)
    ctx.clip()
    ctx.fillStyle = color
    ctx.fill()
    ctx.stroke()
    ctx.beginPath();
    ctx.moveTo(center.x + r, center.y + r)
    ctx.restore()
    ctx.save()
    ctx.strokeStyle = MarkIcon.hoverOutLineColor
    ctx.beginPath();
    ctx.lineWidth = 3
    ctx.arc(center.x, center.y, r + MarkIcon.hoverOutLineWidth / 2 - 1, 0, Math.PI * 2); 
    ctx.stroke()
    ctx.restore()
    let image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image
  }
  constructor() {}
}