// Electroys "living circuit board": a single full-screen fragment shader.
//
// A random-but-connected grid of PCB traces with pulses of current flowing
// along them in the logo colors. The cursor energizes nearby traces, clicks
// send out a ripple of charge, and scrolling drifts the board for parallax.
//
// Cheap by design: one quad, one draw call, DPR capped, paused off-screen and
// in background tabs, a single static frame for prefers-reduced-motion, and a
// CSS gradient fallback when WebGL is unavailable.

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;      // px, y-up
uniform float uMouseOn;    // 0..1 eased presence
uniform vec4  uPulse[4];   // xy = px origin, z = start time, w = active
uniform float uScroll;     // px
uniform float uCell;       // trace grid size in px

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h11(float x) { return fract(sin(x * 91.17) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}

vec3 palette(float k) {
  // Logo colors: sun, flame, leaf, electric blue.
  if (k < 0.25) return vec3(1.00, 0.73, 0.08);
  if (k < 0.50) return vec3(0.95, 0.42, 0.11);
  if (k < 0.75) return vec3(0.18, 0.75, 0.40);
  return vec3(0.25, 0.55, 1.00);
}

// Is the edge from cell c to its +x (axis=0) or +y (axis=1) neighbour a trace?
float edgeOn(vec2 c, float axis) { return step(0.56, h21(c * 1.37 + axis * 17.13)); }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = frag + vec2(0.0, uScroll * 0.35);           // slow parallax with scroll
  p += (uMouse - uRes * 0.5) * 0.012 * uMouseOn;      // subtle drift toward the cursor

  vec2 g = p / uCell;
  vec2 c = floor(g);
  vec2 f = fract(g) - 0.5;

  // Connected traces: the right half of a cell draws its own +x edge, the left half
  // draws the left neighbour's +x edge; same for vertical. Pads where edges meet.
  float eR = edgeOn(c, 0.0), eL = edgeOn(c - vec2(1, 0), 0.0);
  float eU = edgeOn(c, 1.0), eD = edgeOn(c - vec2(0, 1), 1.0);
  float w = 0.055;
  float lineH = (f.x > 0.0 ? eR : eL) * (1.0 - smoothstep(w, w + 0.035, abs(f.y)));
  float lineV = (f.y > 0.0 ? eU : eD) * (1.0 - smoothstep(w, w + 0.035, abs(f.x)));
  float deg = eR + eL + eU + eD;
  float pad = step(0.5, deg) * (1.0 - smoothstep(0.13, 0.17, length(f))) * (deg == 1.0 || deg >= 3.0 ? 1.0 : 0.0);
  float padHole = (1.0 - smoothstep(0.05, 0.08, length(f))) * pad;
  float trace = max(max(lineH, lineV), pad - padHole * 0.8);

  // Current: dashes travel along every row and column at their own speed/direction.
  float rowR = h11(c.y + 3.1), colR = h11(c.x + 7.7);
  float dirH = rowR > 0.5 ? 1.0 : -1.0, dirV = colR > 0.5 ? 1.0 : -1.0;
  float sH = fract(g.x * 0.11 * dirH - uTime * (0.10 + rowR * 0.18) + rowR * 9.0);
  float sV = fract(g.y * 0.11 * dirV - uTime * (0.10 + colR * 0.18) + colR * 9.0);
  float pulseH = pow(smoothstep(0.80, 1.0, sH), 3.0) * lineH;
  float pulseV = pow(smoothstep(0.80, 1.0, sV), 3.0) * lineV;
  float current = max(pulseH, pulseV);
  vec3 curCol = palette(lineH > lineV ? rowR : colR);

  // Cursor energizes nearby traces.
  float md = length(frag - uMouse);
  float near = uMouseOn * exp(-md * md / (2.0 * 150.0 * 150.0));

  // Click ripples: an expanding ring of charge.
  float ring = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 q = uPulse[i];
    if (q.w < 0.5) continue;
    float age = uTime - q.z;
    float r = age * 620.0;
    float d = abs(length(frag - q.xy) - r);
    ring += exp(-d * d / 900.0) * exp(-age * 1.6);
  }

  // Ink background with a slow aurora so the board never looks static.
  vec2 uv = frag / uRes;
  float n = noise(uv * 2.2 + vec2(uTime * 0.03, -uTime * 0.02)) * 0.6 + noise(uv * 5.0 - uTime * 0.04) * 0.4;
  vec3 col = mix(vec3(0.020, 0.043, 0.090), vec3(0.035, 0.075, 0.165), uv.y + n * 0.25);
  col += vec3(0.10, 0.20, 0.55) * smoothstep(0.55, 0.95, n) * 0.35;
  col += vec3(0.55, 0.25, 0.05) * smoothstep(0.62, 1.0, noise(uv * 1.5 + 4.0 + uTime * 0.02)) * 0.18;

  // Compose.
  vec3 traceCol = vec3(0.16, 0.30, 0.62);
  col += traceCol * trace * (0.2 + near * 0.9 + ring * 1.4);
  col += curCol * current * (0.7 + near * 1.6 + ring * 2.0);
  col += curCol * current * near * 0.6;                       // bloom-ish lift near cursor
  col += vec3(0.30, 0.50, 1.00) * near * 0.10;                // soft halo
  col += vec3(1.00, 0.80, 0.40) * ring * 0.08;

  // Vignette + fine grain.
  float vig = smoothstep(1.25, 0.25, length(uv - vec2(0.5, 0.55)));
  col *= mix(0.55, 1.0, vig);
  col += (h21(frag + fract(uTime) * 100.0) - 0.5) * 0.025;

  gl_FragColor = vec4(col, 1.0);
}
`;

export function mountCircuitField(canvas: HTMLCanvasElement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const ctx = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', premultipliedAlpha: false });
  if (!ctx) { canvas.dataset.fallback = 'true'; return; }
  const gl: WebGLRenderingContext = ctx;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    canvas.dataset.fallback = 'true';
    return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uTime = U('uTime'), uMouse = U('uMouse'), uMouseOn = U('uMouseOn');
  const uPulse = U('uPulse'), uScroll = U('uScroll'), uCell = U('uCell');

  // Quality tiers. Phones start lighter; the frame-time monitor below steps
  // down further on devices that struggle, ending at a single still frame.
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.0 : 1.5);
  const minFrameMs = coarse ? 33 : 0; // ~30fps cap on phones saves battery
  let still = reduced;

  // No GPU (software rasterizer)? The shader would run on the CPU: show one frame.
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
    // No real GPU: even one full-screen frame is costly on the CPU. Use the CSS background.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.dataset.fallback = 'true';
    return;
  }

  let W = 0, H = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uCell, Math.round((coarse ? 30 : 38) * dpr));
    if (!running) draw(performance.now());
  };

  // Pointer state (canvas pixels, y-up), eased.
  const target = { x: 0, y: 0, on: 0 };
  const mouse = { x: 0, y: 0, on: 0 };
  const pulses = new Float32Array(16);
  let pulseIdx = 0;
  const toCanvas = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr, y: (r.bottom - e.clientY) * dpr };
  };
  const host = canvas.parentElement!;
  host.addEventListener('pointermove', (e) => { const p = toCanvas(e); target.x = p.x; target.y = p.y; target.on = 1; });
  host.addEventListener('pointerleave', () => { target.on = 0; });
  host.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a, button')) return;
    const p = toCanvas(e);
    pulses.set([p.x, p.y, (performance.now() - t0) / 1000, 1], pulseIdx * 4);
    pulseIdx = (pulseIdx + 1) % 4;
    if (!running) draw(performance.now());
  });

  const t0 = performance.now();
  let running = false, visible = true, raf = 0, last = 0;
  const samples: number[] = [];
  let tier = 0;

  function draw(now: number) {
    const t = still ? 12.0 : (now - t0) / 1000;
    const k = 0.12;
    mouse.x += (target.x - mouse.x) * k;
    mouse.y += (target.y - mouse.y) * k;
    mouse.on += (target.on - mouse.on) * 0.06;
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uMouseOn, reduced ? 0 : mouse.on);
    gl.uniform4fv(uPulse, pulses);
    gl.uniform1f(uScroll, window.scrollY * dpr);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // Adaptive quality: if the median frame takes too long, lower resolution;
  // if it is still slow, settle on a still frame.
  function adapt(delta: number) {
    if (tier >= 2) return;
    samples.push(delta);
    if (samples.length < 45) return;
    const median = [...samples].sort((a, b) => a - b)[samples.length >> 1];
    samples.length = 0;
    if (median <= 45) { tier = 2; return; } // healthy: stop measuring
    tier++;
    if (tier === 1) { dpr *= 0.6; resize(); }
    else { still = true; setRunning(false); draw(performance.now()); }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (minFrameMs && now - last < minFrameMs) return;
    if (last) adapt(now - last);
    last = now;
    draw(now);
  }
  function setRunning(on: boolean) {
    if (still) { draw(performance.now()); return; }
    if (on && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  }

  // Paint one still frame right away, then start animating only once the page
  // has loaded and the main thread is idle, so the board never delays first paint.
  new ResizeObserver(resize).observe(canvas);
  resize();
  canvas.dataset.ready = 'true';
  const begin = () => {
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }).observe(canvas);
    document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));
    setRunning(true);
  };
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 1200));
  if (document.readyState === 'complete') idle(begin);
  else window.addEventListener('load', () => idle(begin), { once: true });
}
