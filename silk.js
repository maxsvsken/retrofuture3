(function () {
    const canvas = document.getElementById('silk-canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.warn('WebGL not supported');
        return;
    }

    // Vertex Shader: full screen quad
    const vsSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // Fragment Shader: Silk wave generator using Domain Warping and FBM
    const fsSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform float u_time;

        const vec3 c1 = vec3(0.0, 0.02, 0.08); // Deep space navy black
        const vec3 c2 = vec3(0.0, 0.05, 0.15); // Dark blue
        const vec3 c3 = vec3(0.15, 0.23, 1.0);  // Vivid royal blue silk (#273cff)
        const vec3 c4 = vec3(0.0, 0.35, 0.9);   // Ocean blue wave accent

        float hash(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            vec2 shift = vec2(100.0);
            mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
            for (int i = 0; i < 4; ++i) {
                v += a * noise(p);
                p = rot * p * 2.0 + shift;
                a *= 0.5;
            }
            return v;
        }

        void main() {
            // Normalized coordinates (aspect-ratio corrected stretch)
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;
            vec2 st = uv * vec2(1.5, 2.5);
            
            // Domain warping / wave distortion
            vec2 q = vec2(0.0);
            q.x = fbm(st + vec2(0.0, 0.05 * u_time));
            q.y = fbm(st + vec2(0.03 * u_time, 0.0));
            
            vec2 r = vec2(0.0);
            r.x = fbm(st + 1.0 * q + vec2(1.7, 9.2) + 0.08 * u_time);
            r.y = fbm(st + 1.0 * q + vec2(8.3, 2.8) + 0.06 * u_time);
            
            float f = fbm(st + r);
            
            // Blending gradients and wave highlights
            vec3 col = mix(c1, c2, clamp(f * f * 4.0, 0.0, 1.0));
            col = mix(col, c3, clamp(length(q) * 0.9, 0.0, 1.0));
            col = mix(col, c4, clamp(r.x * 0.7, 0.0, 1.0));
            
            // Brightness and contrast adjustment
            col = pow(col, vec3(0.85)) * 1.15;
            
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        return;
    }

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeUniformLocation = gl.getUniformLocation(program, 'u_time');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    function resizeCanvas() {
        // Optimize pixelRatio to avoid CPU load on High-DPI screens
        const pixelRatio = 1.0; 
        canvas.width = Math.floor(window.innerWidth * pixelRatio);
        canvas.height = Math.floor(window.innerHeight * pixelRatio);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function render(time) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(timeUniformLocation, time * 0.001); // convert to seconds

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
})();
