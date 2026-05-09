export default class MapLibreRealTimeMapPolygon {
    constructor(map, layerId = 'texture-polygon-layer') {
        this.map = map;
        this.layerId = layerId;
        this.polygons = new Map();
        this.gl = null;
        this._customLayerAdded = false;
        this._addCustomLayer();
    }

    _addCustomLayer() {
        if (this.map.getLayer(this.layerId)) this.map.removeLayer(this.layerId);
        const self = this;
        const customLayer = {
            id: this.layerId,
            type: 'custom',
            renderingMode: '3d',
            onAdd: (map, gl) => {
                self.gl = gl;
                self._initWebGLState(gl);
                for (let [id, poly] of self.polygons) {
                    if (poly._pendingBuffers) {
                        self._createFixedBuffers(poly);
                        delete poly._pendingBuffers;
                    }
                    if (poly.imageLoaded && poly.image && !poly.textureReady) {
                        self._createTextureForPolygon(poly);
                    }
                }
                self.map.triggerRepaint();
            },
            render: (gl, matrix) => {
                if (!self.gl) self.gl = gl;
                self._renderAllPolygons(gl, matrix);
            },
            onRemove: (map, gl) => {
                self._cleanupAllResources(gl);
                self.gl = null;
            }
        };
        this.map.addLayer(customLayer);
        this._customLayerAdded = true;
        this.map.triggerRepaint();
    }

    _initWebGLState(gl) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
    }

    _createTextureForPolygon(poly) {
        if (!this.gl || !poly.image) return;
        const gl = this.gl;
        if (poly.texture) gl.deleteTexture(poly.texture);
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, poly.image);
        poly.texture = texture;
        poly.textureReady = true;
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.map.triggerRepaint();
    }

    _cleanupAllResources(gl) {
        if (!gl) return;
        for (let [id, poly] of this.polygons) {
            if (poly.texture) gl.deleteTexture(poly.texture);
            if (poly.vertexBuffer) gl.deleteBuffer(poly.vertexBuffer);
            if (poly.indexBuffer) gl.deleteBuffer(poly.indexBuffer);
            if (poly.uvBuffer) gl.deleteBuffer(poly.uvBuffer);
            if (poly.shaderProgram) gl.deleteProgram(poly.shaderProgram);
        }
    }

    _renderAllPolygons(gl, matrix) {
        if (!gl || this.polygons.size === 0) return;
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        for (let [id, poly] of this.polygons) {
            if (!poly.visible) continue;
            if (!poly.textureReady && poly.imageLoaded && poly.image) this._createTextureForPolygon(poly);
            if (!poly.textureReady) continue;
            this._updateVertexPositions(poly);
            this._drawPolygon(gl, poly);
        }
    }

    _updateVertexPositions(poly) {
        const gl = this.gl;
        if (!gl) return;
        const map = this.map;
        const width = map.transform.width;
        const height = map.transform.height;
        const positionsNDC = [];
        for (let i = 0; i < poly.originalLngLat.length; i++) {
            const [lng, lat] = poly.originalLngLat[i];
            const point = map.project([lng, lat]);
            const x = (point.x / width) * 2.0 - 1.0;
            const y = 1.0 - (point.y / height) * 2.0;
            positionsNDC.push(x, y);
        }
        if (!poly.vertexBuffer) poly.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, poly.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionsNDC), gl.DYNAMIC_DRAW);
    }

    _drawPolygon(gl, poly) {
        if (!poly.vertexBuffer || !poly.indexBuffer || !poly.uvBuffer) return;
        if (!poly.shaderProgram) {
            this._initShaderForPolygon(poly);
            if (!poly.shaderProgram) return;
        }
        const program = poly.shaderProgram;
        gl.useProgram(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, poly.texture);

        const texLoc = gl.getUniformLocation(program, 'u_texture');
        const scaleLoc = gl.getUniformLocation(program, 'u_scale');
        const offsetLoc = gl.getUniformLocation(program, 'u_offset');
        const flipYLoc = gl.getUniformLocation(program, 'u_flipY');
        const planeSizeLoc = gl.getUniformLocation(program, 'u_planeSize');
        const imageSizeLoc = gl.getUniformLocation(program, 'u_imageSize');

        gl.uniform1i(texLoc, 0);
        // NO rotation in shader - rotation is baked into UVs
        gl.uniform2f(scaleLoc, poly.textureScale[0], poly.textureScale[1]);
        gl.uniform2f(offsetLoc, poly.textureOffset[0], poly.textureOffset[1]);
        gl.uniform1f(flipYLoc, poly.flipY ? 1.0 : 0.0);
        
        if (planeSizeLoc) {
            gl.uniform2f(planeSizeLoc, poly.rangeX, poly.rangeY);
        }
        if (imageSizeLoc && poly.image) {
            gl.uniform2f(imageSizeLoc, poly.image.width, poly.image.height);
        }

        const aPosLoc = gl.getAttribLocation(program, 'a_position');
        gl.bindBuffer(gl.ARRAY_BUFFER, poly.vertexBuffer);
        gl.enableVertexAttribArray(aPosLoc);
        gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

        const aUvLoc = gl.getAttribLocation(program, 'a_uv');
        gl.bindBuffer(gl.ARRAY_BUFFER, poly.uvBuffer);
        gl.enableVertexAttribArray(aUvLoc);
        gl.vertexAttribPointer(aUvLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, poly.indexBuffer);
        gl.drawElements(gl.TRIANGLES, poly.indexCount, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(aPosLoc);
        gl.disableVertexAttribArray(aUvLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        gl.useProgram(null);
    }

    _initShaderForPolygon(poly) {
        const gl = this.gl;
        if (!gl) return;
        
        const vsSource = `
            precision highp float;
            attribute vec2 a_position;
            attribute vec2 a_uv;
            varying vec2 v_uv;
            void main() {
                v_uv = a_uv;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        const fsSource = this._getFragmentShader(poly.fitMode || 'stretch');
        
        const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return;
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader link failed: ' + gl.getProgramInfoLog(program));
            return;
        }
        poly.shaderProgram = program;
        gl.deleteShader(vs);
        gl.deleteShader(fs);
    }

    _getFragmentShader(fitMode) {
        const baseUniforms = `
            #ifdef GL_FRAGMENT_PRECISION_HIGH
                precision highp float;
            #else
                precision mediump float;
            #endif
            uniform sampler2D u_texture;
            uniform vec2 u_scale;
            uniform vec2 u_offset;
            uniform float u_flipY;
            uniform vec2 u_planeSize;
            uniform vec2 u_imageSize;
            varying vec2 v_uv;
        `;
        
        // Simple texture transform without rotation
        const transformUV = `
            vec2 transformUV(vec2 uv) {
                if (u_flipY > 0.5) {
                    uv.y = 1.0 - uv.y;
                }
                vec2 result = (uv - 0.5) / u_scale + 0.5;
                result = result + u_offset;
                return result;
            }
        `;
        
        let fitLogic = '';
        let uvTransform = '';
        
        if (fitMode === 'cover') {
            fitLogic = `
                vec2 coverUV(vec2 uv) {
                    float planeAspect = u_planeSize.x / u_planeSize.y;
                    float imageAspect = u_imageSize.x / u_imageSize.y;
                    vec2 scale = vec2(1.0);
                    if (planeAspect > imageAspect) {
                        scale.x = 1.0;
                        scale.y = planeAspect / imageAspect;
                    } else {
                        scale.x = imageAspect / planeAspect;
                        scale.y = 1.0;
                    }
                    return (uv - 0.5) * scale + 0.5;
                }
            `;
            uvTransform = 'transformUV(coverUV(v_uv))';
        } else if (fitMode === 'contain') {
            fitLogic = `
                vec2 containUV(vec2 uv) {
                    float planeAspect = u_planeSize.x / u_planeSize.y;
                    float imageAspect = u_imageSize.x / u_imageSize.y;
                    vec2 scale = vec2(1.0);
                    if (planeAspect > imageAspect) {
                        scale.x = imageAspect / planeAspect;
                        scale.y = 1.0;
                    } else {
                        scale.x = 1.0;
                        scale.y = planeAspect / imageAspect;
                    }
                    return (uv - 0.5) * scale + 0.5;
                }
            `;
            uvTransform = 'transformUV(containUV(v_uv))';
        } else {
            uvTransform = 'transformUV(v_uv)';
        }
        
        return `
            ${baseUniforms}
            ${fitLogic}
            ${transformUV}
            
            void main() {
                vec2 finalUV = ${uvTransform};
                vec4 texColor = texture2D(u_texture, finalUV);
                if (finalUV.x < 0.0 || finalUV.x > 1.0 || finalUV.y < 0.0 || finalUV.y > 1.0) {
                    texColor = mix(texColor, vec4(1.0, 0.0, 0.0, 0.8), 0.6);
                }
                gl_FragColor = texColor;
            }
        `;
    }

    _compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    _createFixedBuffers(poly) {
        const gl = this.gl;
        if (!gl) return;
        if (!poly.indexBuffer) {
            poly.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, poly.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(poly.indices), gl.STATIC_DRAW);
        }
        if (!poly.uvBuffer) {
            poly.uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, poly.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(poly.uvs), gl.STATIC_DRAW);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        poly.indexCount = poly.indices.length;
    }

    /**
     * Compute UV coordinates with rotation baked in
     * Rotation is applied to the bounding box, not to the texture
     */
    _computeRotatedBoundingBoxUV(points, rotationDeg) {
        const n = points.length;
        const rotationRad = (rotationDeg * Math.PI) / 180;
        
        // Calculate centroid
        let cx = 0, cy = 0;
        points.forEach(p => {
            cx += p[0];
            cy += p[1];
        });
        cx /= n;
        cy /= n;
        
        // Apply rotation to points relative to centroid
        const cosR = Math.cos(rotationRad);
        const sinR = Math.sin(rotationRad);
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        const rotatedPoints = points.map(p => {
            const dx = p[0] - cx;
            const dy = p[1] - cy;
            // Counter-clockwise rotation (matching Cesium's stRotation)
            const rx = dx * cosR - dy * sinR;
            const ry = dx * sinR + dy * cosR;
            minX = Math.min(minX, rx);
            maxX = Math.max(maxX, rx);
            minY = Math.min(minY, ry);
            maxY = Math.max(maxY, ry);
            return { rx, ry };
        });
        
        const rangeX = maxX - minX || 1;
        const rangeY = maxY - minY || 1;
        
        // Normalize to 0-1 UV space
        return rotatedPoints.map(p => [
            (p.rx - minX) / rangeX,
            (p.ry - minY) / rangeY
        ]).flat();
    }

    /**
     * Add polygon with texture
     * @param {string} id
     * @param {number[]} degreesArray - flat lng/lat array
     * @param {string|HTMLImageElement} textureSource
     * @param {number} userRotation - degrees, clockwise (like Cesium's stRotation)
     * @param {boolean} visible
     * @param {number[]} textureScale - [sx, sy]
     * @param {number[]} textureOffset - [ox, oy]
     * @param {boolean} flipY
     * @param {string} fitMode - 'stretch' | 'cover' | 'contain'
     */
    add(id, degreesArray, textureSource, userRotation = 0, visible = true, textureScale = [1, 1], textureOffset = [0, 0], flipY = true, fitMode = 'stretch') {
        if (this.polygons.has(id)) this.remove(id);
        if (!degreesArray || degreesArray.length < 6) {
            console.error('At least 3 points required');
            return;
        }
        
        const points = [];
        for (let i = 0; i < degreesArray.length; i += 2) {
            points.push([degreesArray[i], degreesArray[i + 1]]);
        }
        
        // Calculate bearing from first edge
        const point1 = turf.point(points[0]);
        const point2 = turf.point(points[1]);
        let bearing = turf.bearing(point1, point2);
        if (bearing < 0) bearing += 360;
        
        // Cesium's stRotation behavior: rotation is relative to polygon's local frame
        // bearing aligns the texture to the polygon's orientation
        // userRotation adds additional rotation
        const totalRotation = bearing + userRotation;

        const flatCoords = points.flat();
        const indices = earcut(flatCoords, null, 2);
        if (!indices.length) {
            console.error('Triangulation failed');
            return;
        }
        
        // Calculate bounds for fitMode (original space)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p[0]);
            maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]);
            maxY = Math.max(maxY, p[1]);
        });
        const rangeX = maxX - minX;
        const rangeY = maxY - minY;
        
        // Compute UVs with rotation baked in
        const uvs = this._computeRotatedBoundingBoxUV(points, totalRotation);

        const polygonInstance = {
            id, 
            originalLngLat: points, 
            indices, 
            uvs,
            minX, maxX, minY, maxY, 
            rangeX, rangeY,
            userRotation,
            bearing,
            totalRotation,
            visible,
            fitMode,
            textureReady: false, 
            imageLoaded: false, 
            image: null, 
            texture: null,
            vertexBuffer: null, 
            indexBuffer: null, 
            uvBuffer: null,
            indexCount: indices.length, 
            shaderProgram: null,
            textureScale, 
            textureOffset, 
            flipY,
            _pendingBuffers: !this.gl,
            _debugLogged: false
        };

        if (this.gl && this._customLayerAdded) this._createFixedBuffers(polygonInstance);

        const loadImage = (img) => {
            polygonInstance.image = img;
            polygonInstance.imageLoaded = true;
            if (this.gl && this._customLayerAdded) {
                this._createTextureForPolygon(polygonInstance);
                if (polygonInstance._pendingBuffers) {
                    this._createFixedBuffers(polygonInstance);
                    polygonInstance._pendingBuffers = false;
                }
            }
            this.map.triggerRepaint();
        };

        if (typeof textureSource === 'string') {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => loadImage(img);
            img.onerror = () => this._createFallbackTexture(polygonInstance);
            img.src = textureSource;
        } else if (textureSource instanceof HTMLImageElement) {
            if (textureSource.complete && textureSource.naturalWidth > 0) loadImage(textureSource);
            else {
                textureSource.onload = () => loadImage(textureSource);
                textureSource.onerror = () => this._createFallbackTexture(polygonInstance);
            }
        } else {
            this._createFallbackTexture(polygonInstance);
        }

        this.polygons.set(id, polygonInstance);
        this.map.triggerRepaint();
    }

    _createFallbackTexture(poly) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#aa66ff';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#ffdd88';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('Texture', 200, 270);
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 64, 0);
            ctx.lineTo(i * 64, 512);
            ctx.stroke();
            ctx.moveTo(0, i * 64);
            ctx.lineTo(512, i * 64);
            ctx.stroke();
        }
        const img = new Image();
        img.src = canvas.toDataURL();
        img.onload = () => {
            poly.image = img;
            poly.imageLoaded = true;
            if (this.gl && this._customLayerAdded) {
                this._createTextureForPolygon(poly);
                if (poly._pendingBuffers) {
                    this._createFixedBuffers(poly);
                    poly._pendingBuffers = false;
                }
            }
            this.map.triggerRepaint();
        };
    }

    show(id) {
        const p = this.polygons.get(id);
        if (p) {
            p.visible = true;
            this.map.triggerRepaint();
        }
    }
    
    hide(id) {
        const p = this.polygons.get(id);
        if (p) {
            p.visible = false;
            this.map.triggerRepaint();
        }
    }
    
    remove(id) {
        const p = this.polygons.get(id);
        if (!p) return;
        const gl = this.gl;
        if (gl) {
            if (p.texture) gl.deleteTexture(p.texture);
            if (p.vertexBuffer) gl.deleteBuffer(p.vertexBuffer);
            if (p.indexBuffer) gl.deleteBuffer(p.indexBuffer);
            if (p.uvBuffer) gl.deleteBuffer(p.uvBuffer);
            if (p.shaderProgram) gl.deleteProgram(p.shaderProgram);
        }
        this.polygons.delete(id);
        this.map.triggerRepaint();
    }
    
    removeAll() {
        for (let id of this.polygons.keys()) this.remove(id);
    }
    
    has(id) {
        return this.polygons.has(id);
    }
    
    destroy() {
        this.removeAll();
        if (this.map && this.map.getLayer(this.layerId)) this.map.removeLayer(this.layerId);
        this.polygons.clear();
        this.gl = null;
        this.map = null;
        this._customLayerAdded = false;
    }
}