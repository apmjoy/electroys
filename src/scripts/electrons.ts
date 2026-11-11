// "Electrons that become toys": the homepage particle stage.
//
// Thousands of glowing points swirl, then assemble into the Electroys logo and
// one featured product photo after another, each particle colored by the photo
// pixel it lands on. The pointer scatters them; they flow back into place.
//
// Hand-written WebGL (no 3D library): one point draw per frame, all motion in
// the vertex shader. Fewer particles on phones, automatic step-down on slow
// devices, paused off-screen, and a static photo for reduced motion / no WebGL.

import { isScrolling } from './scroll-state';

type Shape = { pos: Float32Array; col: Float32Array };

const VERT = `
attribute vec2 aFrom; attribute vec2 aTo;
attribute vec3 aFromCol; attribute vec3 aToCol;
attribute vec4 aSeed;
uniform vec2 uRes; uniform float uTime; uniform float uMorph;
uniform vec2 uMouse; uniform float uMouseOn; uniform float uScatter;
uniform float uSize; uniform float uDpr;
varying vec3 vCol; varying float vGlow;
float ease(float t) { return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
void main() {
  float delay = aSeed.w * .35;
  float e = ease(clamp((uMorph - delay) / .65, 0., 1.));
  vec2 p = mix(aFrom, aTo, e);
  float lift = sin(e * 3.14159);
  float ang = aSeed.x * 6.2832 + uTime * (.5 + aSeed.z * .9);
  vec2 orbit = vec2(cos(ang), sin(ang)) * (.15 + aSeed.y) * uRes.y * .42;
  p += orbit * (lift * .95 + uScatter);
  p += vec2(sin(uTime * 1.7 + aSeed.x * 20.), cos(uTime * 1.3 + aSeed.y * 20.)) * .7;
  vec2 dm = p - uMouse;
  float d = length(dm);
  p += (dm / max(d, 1.)) * uMouseOn * exp(-d * d / (2. * 64. * 64.)) * 52.;
  gl_Position = vec4(p / (uRes * .5), 0., 1.);
  vCol = mix(aFromCol, aToCol, e);
  vGlow = lift + uScatter;
  gl_PointSize = uSize * uDpr * (1. + lift * .7);
}`;

const FRAG = `
precision mediump float;
varying vec3 vCol; varying float vGlow;
void main() {
  float d = length(gl_PointCoord - .5);
  float a = smoothstep(.5, .05, d);
  vec3 c = vCol * 1.12 + .04 + vGlow * vec3(.25, .3, .5);
  gl_FragColor = vec4(c * a, a);
}`;

const PALETTE = [[1, .73, .08], [.95, .42, .11], [.18, .75, .4], [.25, .55, 1]];

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

/** Sample an image into N target points (centered px coords, y-up) + colors. */
async function sampleImage(url: string, n: number, size: number, opts: { alpha?: boolean }): Promise<Shape> {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  const S = 180;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const k = Math.min(S / img.width, S / img.height) * .94;
  const w = img.width * k, h = img.height * k;
  ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, S, S).data;
  // Background = transparent pixels, plus (for photos) near-white pixels connected
  // to the image edge. A flood fill keeps white areas *inside* the product.
  const bg = new Uint8Array(S * S);
  const light = (i: number) => data[i * 4 + 3] < 120 || (!opts.alpha && data[i * 4] > 236 && data[i * 4 + 1] > 236 && data[i * 4 + 2] > 236);
  const stack: number[] = [];
  for (let i = 0; i < S; i++) stack.push(i, (S - 1) * S + i, i * S, i * S + S - 1);
  while (stack.length) {
    const i = stack.pop()!;
    if (bg[i] || !light(i)) continue;
    bg[i] = 1;
    const x = i % S, y = (i / S) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < S - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - S);
    if (y < S - 1) stack.push(i + S);
  }
  const cand: number[] = [];
  for (let i = 0; i < S * S; i++) {
    if (bg[i] || data[i * 4 + 3] < 120) continue;
    cand.push(i % S, (i / S) | 0, data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }
  const pts = cand.length / 5 || 1;
  const pos = new Float32Array(n * 2), col = new Float32Array(n * 3);
  const r = rand(pts * 7919);
  const scale = size / S;
  for (let j = 0; j < n; j++) {
    const s = cand.length ? Math.floor(r() * pts) * 5 : 0;
    const x = cand[s] ?? S / 2, y = cand[s + 1] ?? S / 2;
    pos[j * 2] = (x + r() - .5 - S / 2) * scale;
    pos[j * 2 + 1] = (S / 2 - y + r() - .5) * scale;
    col[j * 3] = (cand[s + 2] ?? 255) / 255;
    col[j * 3 + 1] = (cand[s + 3] ?? 255) / 255;
    col[j * 3 + 2] = (cand[s + 4] ?? 255) / 255;
  }
  return { pos, col };
}

/** Starting state: a loose swirl of brand-colored electrons. */
function cloud(n: number, size: number): Shape {
  const r = rand(42);
  const pos = new Float32Array(n * 2), col = new Float32Array(n * 3);
  for (let j = 0; j < n; j++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * size * .55;
    pos[j * 2] = Math.cos(a) * rad;
    pos[j * 2 + 1] = Math.sin(a) * rad * .8;
    const c = PALETTE[j % 4];
    col.set(c, j * 3);
  }
  return { pos, col };
}

export interface StageItem { image: string; href: string | null }
export interface StageOptions {
  /** Cycle through items forever (homepage) or assemble once and hold (gift reveal). */
  loop?: boolean;
  /** Start right away (after a tap) instead of waiting for page load + idle. */
  immediate?: boolean;
  /** Which item is a transparent logo sampled by alpha; null when all are photos. */
  alphaIndex?: number | null;
}

/** Waits for load + an idle moment, so the stage never competes with first paint. */
export function mountElectrons(root: HTMLElement, items: StageItem[], onShow: (index: number) => void, opts: StageOptions = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { root.dataset.mode = 'static'; return; }
  if (opts.immediate) { startElectrons(root, items, onShow, opts); return; }
  const go = () => {
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as any).requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 600));
    idle(() => startElectrons(root, items, onShow, opts));
  };
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}

function startElectrons(root: HTMLElement, items: StageItem[], onShow: (index: number) => void, opts: StageOptions) {
  const cycle = opts.loop ?? true;
  const alphaIndex = opts.alphaIndex === undefined ? 0 : opts.alphaIndex;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const ctx = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!ctx || reduced) { root.dataset.mode = 'static'; return; }
  const gl: WebGLRenderingContext = ctx;

  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  // No real GPU: the particles would run on the CPU. Keep the static photo instead.
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    root.dataset.mode = 'static';
    onShow(Math.min(1, items.length - 1));
    return;
  }

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  try {
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
  } catch { root.dataset.mode = 'static'; return; }
  gl.useProgram(prog);

  const N = coarse ? 7000 : 15000;
  let drawCount = N;
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  let W = 1, H = 1, size = 300;

  const attr = (name: string, comps: number) => {
    const buf = gl.createBuffer()!;
    const loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, comps, gl.FLOAT, false, 0, 0);
    return (data: Float32Array) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); };
  };
  const setFrom = attr('aFrom', 2), setTo = attr('aTo', 2), setFromCol = attr('aFromCol', 3), setToCol = attr('aToCol', 3), setSeed = attr('aSeed', 4);
  const seeds = new Float32Array(N * 4);
  const r = rand(7);
  for (let i = 0; i < seeds.length; i++) seeds[i] = r();
  setSeed(seeds);

  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uTime = U('uTime'), uMorph = U('uMorph'), uMouse = U('uMouse'), uMouseOn = U('uMouseOn');
  const uScatter = U('uScatter'), uSize = U('uSize'), uDpr = U('uDpr');
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE); // additive: overlapping electrons glow
  gl.clearColor(0, 0, 0, 0);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, W, H);
    gl.uniform1f(uDpr, dpr);
    size = Math.min(W, H) * .92;
    gl.uniform1f(uSize, Math.max(1.6, Math.min(3.2, size / 150)));
  };
  resize();

  // Pointer → repel (CSS px, centered, y-up).
  const target = { x: 0, y: 0, on: 0 }, mouse = { x: 0, y: 0, on: 0 };
  const toLocal = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left - W / 2, y: H / 2 - (e.clientY - rect.top) };
  };
  root.addEventListener('pointermove', (e) => { const p = toLocal(e); target.x = p.x; target.y = p.y; target.on = 1; }, { passive: true });
  root.addEventListener('pointerleave', () => { target.on = 0; });
  root.addEventListener('pointerdown', (e) => { const p = toLocal(e); mouse.x = target.x = p.x; mouse.y = target.y = p.y; target.on = 1.6; });

  // Shape sequence: cloud → logo → products…
  const shapes: (Shape | null)[] = new Array(items.length).fill(null);
  const load = (i: number) => shapes[i] ? Promise.resolve(shapes[i]!) : sampleImage(items[i].image, N, size, { alpha: i === alphaIndex }).then((s) => (shapes[i] = s));
  let current = cloud(N, size);
  let next = 0;
  let morphStart = -1;
  const MORPH = 1.7, HOLD = 3.4;
  // Cycle: 'morph' (assembling) → 'hold' (showing) → 'loading' (next image) → 'morph'…
  let phase: 'idle' | 'morph' | 'hold' | 'loading' = 'idle';
  let phaseEnd = 0;

  const beginMorph = (to: Shape, now: number) => {
    setFrom(current.pos); setFromCol(current.col);
    setTo(to.pos); setToCol(to.col);
    current = to;
    morphStart = now;
  };

  const t0 = performance.now();
  let running = false, raf = 0, last = 0, visible = true, scroll = 0;
  const frames: number[] = [];
  let tuned = false;

  async function advance() {
    phase = 'loading';
    const i = next;
    next = (next + 1) % items.length;
    const shape = await load(i).catch(() => null);
    if (!shape) { phase = 'hold'; phaseEnd = 0; return; } // skip a failed image, try the next
    beginMorph(shape, performance.now());
    phase = 'morph';
    onShow(i);
    load(next).catch(() => {});
  }

  function draw(now: number) {
    const t = (now - t0) / 1000;
    const k = coarse ? .2 : .14;
    mouse.x += (target.x - mouse.x) * k; mouse.y += (target.y - mouse.y) * k;
    mouse.on += (target.on - mouse.on) * .08;
    if (target.on > 1) target.on = Math.max(0, target.on - .05);
    const morph = morphStart < 0 ? 0 : Math.min(1, (now - morphStart) / 1000 / MORPH);
    if (phase === 'morph' && morph >= 1) { phase = 'hold'; phaseEnd = now + HOLD * 1000; }
    else if (phase === 'hold' && now > phaseEnd && cycle) advance();
    const rect = root.getBoundingClientRect();
    scroll = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
    gl.uniform1f(uTime, t);
    gl.uniform1f(uMorph, morph);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uMouseOn, Math.min(1.6, mouse.on));
    gl.uniform1f(uScatter, scroll * .9);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, drawCount);
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (isScrolling()) { last = 0; return; } // scrolling gets the whole frame
    if (last && !tuned) {
      frames.push(now - last);
      if (frames.length >= 60) {
        const median = [...frames].sort((a, b) => a - b)[30];
        if (median > 28) drawCount = Math.floor(drawCount * .5); // struggling device: halve the electrons
        frames.length = 0;
        tuned = median <= 28 || drawCount < N * .3;
      }
    }
    last = now;
    draw(now);
  }
  const setRunning = (on: boolean) => {
    if (on && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
    if (!on && running) { running = false; cancelAnimationFrame(raf); }
  };

  new ResizeObserver(() => { resize(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(visible && !document.hidden); }).observe(root);
  document.addEventListener('visibilitychange', () => setRunning(visible && !document.hidden));

  // Seed buffers with the cloud so the first frames show swirling electrons.
  setFrom(current.pos); setFromCol(current.col); setTo(current.pos); setToCol(current.col);
  root.dataset.mode = 'live';
  setRunning(true);
  // First shape after a beat, once the page is settled.
  setTimeout(() => advance(), 300);
}
