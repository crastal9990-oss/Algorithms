// maplibre爆炸特效类
export default class RipplePulseExplosion {
    constructor(map, imageUrl = null) {
        this.map = map;
        this.imageUrl = imageUrl || '/img/map/boom2.png';
        this.activeExplosions = [];
        this.nextId = 0;
        this.defaultImageData = null;
        this.imageLoaded = false;
        if (this.imageUrl) {
            this.loadUserImage();
        }
    }
    // 创建默认圆形（橙色渐变）
    createDefaultCircle() {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, size, size);
        
        // 绘制圆形渐变
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2;
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, '#ffff88');
        gradient.addColorStop(0.4, '#ffaa44');
        gradient.addColorStop(0.7, '#ff5500');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 添加内圈高亮
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffaa';
        ctx.fill();
        
        this.userImageData = ctx.getImageData(0, 0, size, size);
        this.imageLoaded = true;
    }
    // 加载用户图片并转为圆形
    loadUserImage() {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0, 0, size, size);
            
            // 先画圆形裁剪区域
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            
            // 绘制图片（居中缩放，填满圆形）
            const scale = Math.max(size / img.width, size / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (size - w) / 2;
            const y = (size - h) / 2;
            ctx.drawImage(img, x, y, w, h);
            
            ctx.restore();
            
            // 添加边缘光晕效果
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'transparent';
            ctx.lineWidth = 0;
            ctx.stroke();
            
            this.userImageData = ctx.getImageData(0, 0, size, size);
            this.imageLoaded = true;
        };
        img.onerror = () => {
            console.warn('图片加载失败，使用默认圆形');
            this.createDefaultCircle();
        };
        img.src = this.imageUrl;
    }
    explode(lngLat, options = {}) {
        const duration = options.duration || 5000;
        const riseDuration = options.riseDuration || 500;
        const maxScale = options.maxScale || 3.5;
        
        // 等待图片加载完成
        if (!this.imageLoaded) {
            setTimeout(() => this.explode(lngLat, options), 50);
            return;
        }
        
        const explosion = {
            id: this.nextId++,
            lngLat: lngLat,
            startTime: performance.now(),
            duration: duration,
            riseDuration: riseDuration,
            maxScale: maxScale,
            marker: null,
            animationId: null
        };
        
        // 创建 Marker 容器
        const el = document.createElement('div');
        el.style.width = '48px';
        el.style.height = '48px';
        el.style.position = 'relative';
        el.style.pointerEvents = 'none';
        
        // 创建 canvas 绘制圆形图片
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // 绘制圆形图片
        if (this.userImageData) {
            ctx.putImageData(this.userImageData, 0, 0);
        }
        
        // 设置圆形样式
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.borderRadius = '50%';  // 圆形
        canvas.style.display = 'block';
        canvas.style.opacity = '0';
        
        el.appendChild(canvas);
        
        const marker = new maplibregl.Marker({ element: el })
            .setLngLat(lngLat)
            .addTo(this.map);
        
        explosion.marker = marker;
        explosion.canvas = canvas;
        
        // 动画循环
        const animate = () => {
            const now = performance.now();
            const totalElapsed = now - explosion.startTime;
            
            if (totalElapsed >= explosion.duration) {
                if (explosion.marker) explosion.marker.remove();
                const index = this.activeExplosions.findIndex(e => e.id === explosion.id);
                if (index !== -1) this.activeExplosions.splice(index, 1);
                return;
            }
            
            // 计算当前循环位置
            const cycleTime = totalElapsed % explosion.riseDuration;
            const cycleIndex = Math.floor(totalElapsed / explosion.riseDuration);
            
            if (cycleIndex % 2 === 0) {
                // 偶数周期：放大阶段
                const riseProgress = cycleTime / explosion.riseDuration;
                const easeOut = 1 - Math.pow(1 - riseProgress, 2);
                const scale = 0.3 + (explosion.maxScale - 0.3) * easeOut;
                const opacity = easeOut;
                
                explosion.canvas.style.transform = `scale(${scale})`;
                explosion.canvas.style.opacity = opacity;
            } else {
                // 奇数周期：隐藏阶段
                explosion.canvas.style.opacity = '0';
            }
            
            explosion.animationId = requestAnimationFrame(animate);
        };
        
        explosion.animationId = requestAnimationFrame(animate);
        this.activeExplosions.push(explosion);
        
        return explosion;
    }
    // 清除所有爆炸
    clearAll() {
        for (const explosion of this.activeExplosions) {
            if (explosion.animationId) cancelAnimationFrame(explosion.animationId);
            if (explosion.marker) explosion.marker.remove();
        }
        this.activeExplosions = [];
    }
}