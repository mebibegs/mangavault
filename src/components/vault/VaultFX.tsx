"use client";

import { useEffect, useRef } from "react";

/**
 * MANGAVAULT background engine.
 *
 * Layer 0 — WebGL hypnotic moiré interference shader
 * Layer 1 — kinetic speed-line particle canvas
 * Layer 2 — manga screen-tone halftone paper (pure CSS, see globals.css)
 * Plus: scroll progress bar, strobe flash + blade wipe overlays.
 *
 * Other components trigger effects via window events:
 *   window.dispatchEvent(new Event("vault:flash"))  — inverted strobe + burst
 *   window.dispatchEvent(new Event("vault:wipe"))   — blade wipe
 *   window.dispatchEvent(new CustomEvent("vault:shatter", {detail:{rect,src}}))
 */

const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const FS = `precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse_velocity;
uniform float u_scroll;
uniform float u_flash;
void main(){
  vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  p += u_mouse_velocity * 0.15;
  float d = length(p);
  float wave1 = sin(d * 40.0 - u_time * 2.0 + u_scroll * 0.05);
  float wave2 = cos((p.x * cos(u_time * 0.2) + p.y * sin(u_time * 0.3)) * 30.0 + u_time);
  float wave3 = sin(atan(p.y, p.x) * 8.0 + u_time * 1.5);
  float pattern = sin((wave1 + wave2 + wave3) * 3.14159);
  float mask = smoothstep(-0.1, 0.1, pattern);
  vec3 finalColor = mix(vec3(0.0), vec3(0.12), mask);
  float dotp = smoothstep(0.32, 0.12, length(fract(gl_FragCoord.xy / 5.0) - 0.5));
  finalColor += dotp * 0.018;
  finalColor = mix(finalColor, vec3(1.0) - finalColor, u_flash);
  gl_FragColor = vec4(finalColor, 1.0);
}`;

interface Particle { x: number; y: number; l: number; w: number; life: number; dec: number; c: string; }

export default function VaultFX() {
  const glRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const shardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glc = glRef.current!, fxc = fxRef.current!;
    const fx = fxc.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let gl: WebGLRenderingContext | null = null;
    const U: Record<string, WebGLUniformLocation | null> = {};
    let glOK = false;

    try {
      gl = glc.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    } catch { /* no webgl */ }

    if (gl && !reduced) {
      try {
        const g = gl;
        const mk = (type: number, src: string) => {
          const sh = g.createShader(type)!;
          g.shaderSource(sh, src); g.compileShader(sh);
          if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) throw new Error(String(g.getShaderInfoLog(sh)));
          return sh;
        };
        const pr = g.createProgram()!;
        g.attachShader(pr, mk(g.VERTEX_SHADER, VS));
        g.attachShader(pr, mk(g.FRAGMENT_SHADER, FS));
        g.linkProgram(pr);
        if (!g.getProgramParameter(pr, g.LINK_STATUS)) throw new Error(String(g.getProgramInfoLog(pr)));
        g.useProgram(pr);
        const buf = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, buf);
        g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
        const loc = g.getAttribLocation(pr, "a");
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
        ["u_resolution", "u_time", "u_mouse_velocity", "u_scroll", "u_flash"].forEach(n => { U[n] = g.getUniformLocation(pr, n); });
        glOK = true;
      } catch {
        gl = null;
        document.body.classList.add("no-gl");
      }
    } else {
      document.body.classList.add("no-gl");
    }

    const DPR = () => Math.min(window.devicePixelRatio || 1, 1.5);
    const sizeGL = () => { const d = DPR(); glc.width = innerWidth * d; glc.height = innerHeight * d; gl?.viewport(0, 0, glc.width, glc.height); };
    const sizeFX = () => { fxc.width = innerWidth; fxc.height = innerHeight; };
    sizeGL(); sizeFX();

    let raf = 0, time = 0, flashV = 0;
    let mvx = 0, mvy = 0, lmx = innerWidth / 2, lmy = innerHeight / 2, mSpeed = 0;
    let lastY = window.scrollY, vel = 0;
    const parts: Particle[] = [];

    const spawnLine = () => {
      parts.push({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        l: 40 + Math.random() * 180 + Math.abs(vel) * 2, w: Math.random() < 0.7 ? 1 : 2,
        life: 1, dec: 0.06 + Math.random() * 0.09,
        c: Math.random() < 0.6 ? "255,255,255" : "136,136,136",
      });
    };
    const burst = (n: number) => {
      for (let i = 0; i < n; i++) parts.push({
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        l: 60 + Math.random() * 240, w: 1 + ((Math.random() * 2) | 0),
        life: 1, dec: 0.04 + Math.random() * 0.08,
        c: Math.random() < 0.5 ? "255,255,255" : "90,90,90",
      });
    };
    const drawFX = () => {
      fx.clearRect(0, 0, fxc.width, fxc.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.life -= p.dec;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        fx.globalAlpha = p.life * 0.8;
        fx.strokeStyle = "rgb(" + p.c + ")";
        fx.lineWidth = p.w;
        fx.beginPath(); fx.moveTo(p.x, p.y); fx.lineTo(p.x, p.y + p.l); fx.stroke();
      }
      fx.globalAlpha = 1;
    };

    const frame = (t: number) => {
      time = t / 1000;
      const y = window.scrollY;
      vel = y - lastY; lastY = y;

      const maxS = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      if (progRef.current) progRef.current.style.width = (Math.min(1, Math.max(0, y / maxS)) * 100).toFixed(2) + "%";

      if (!reduced && (Math.abs(vel) > 16 || mSpeed > 46)) {
        const n = Math.min(5, 1 + Math.floor((Math.abs(vel) + mSpeed) / 40));
        for (let i = 0; i < n; i++) spawnLine();
      }
      mSpeed *= 0.88; mvx *= 0.9; mvy *= 0.9;
      drawFX();

      if (glOK && gl) {
        gl.uniform2f(U.u_resolution, glc.width, glc.height);
        gl.uniform1f(U.u_time, time);
        gl.uniform2f(U.u_mouse_velocity, Math.max(-3, Math.min(3, mvx * 0.09)), Math.max(-3, Math.min(3, -mvy * 0.09)));
        gl.uniform1f(U.u_scroll, y * 0.02);
        flashV *= 0.86; if (flashV < 0.002) flashV = 0;
        gl.uniform1f(U.u_flash, flashV);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onMouse = (e: MouseEvent) => {
      const dx = e.clientX - lmx, dy = e.clientY - lmy;
      lmx = e.clientX; lmy = e.clientY;
      mvx += dx * 0.35; mvy += dy * 0.35;
      mSpeed = Math.hypot(mvx, mvy);
    };
    addEventListener("mousemove", onMouse, { passive: true });

    const onResize = () => { sizeGL(); sizeFX(); };
    addEventListener("resize", onResize);

    /* ---- effect event handlers ---- */
    const doFlash = () => {
      const el = flashRef.current; if (!el) return;
      el.classList.remove("run"); void el.offsetWidth; el.classList.add("run");
      flashV = 1;
      if (!reduced) burst(26);
    };
    const doWipe = () => {
      const el = wipeRef.current; if (!el) return;
      el.classList.remove("run"); void el.offsetWidth; el.classList.add("run");
      setTimeout(() => el.classList.remove("run"), 480);
    };
    const doShatter = (e: Event) => {
      if (reduced) return;
      const { rect, src } = (e as CustomEvent<{ rect: DOMRect; src: string }>).detail || {};
      const host = shardsRef.current;
      if (!host || !rect || !src) return;
      const cols = 4, rows = 5, j = () => (Math.random() - 0.5) * 26;
      const xs: number[] = [], ys: number[] = [];
      for (let i = 0; i <= cols; i++) xs.push(rect.width * i / cols + (i > 0 && i < cols ? j() : 0));
      for (let i = 0; i <= rows; i++) ys.push(rect.height * i / rows + (i > 0 && i < rows ? j() : 0));
      const frag = document.createDocumentFragment();
      for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) {
        const x0 = xs[b], x1 = xs[b + 1], y0 = ys[a], y1 = ys[a + 1],
          xm = (x0 + x1) / 2 + j() * 0.5, ym = (y0 + y1) / 2 + j() * 0.5;
        const tris = [
          [`${x0},${y0}`, `${x1},${y0}`, `${xm},${ym}`],
          [`${x1},${y0}`, `${x1},${y1}`, `${xm},${ym}`],
          [`${x1},${y1}`, `${x0},${y1}`, `${xm},${ym}`],
          [`${x0},${y1}`, `${x0},${y0}`, `${xm},${ym}`],
        ];
        tris.forEach(poly => {
          const d = document.createElement("div"); d.className = "shard";
          const clip = "polygon(" + poly.map(pt => { const p = pt.split(","); return p[0] + "px " + p[1] + "px"; }).join(",") + ")";
          d.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`
            + `background-image:url("${src}");background-size:${rect.width}px ${rect.height}px;clip-path:${clip};filter:grayscale(1)`;
          frag.appendChild(d);
          const dx = (xm - rect.width / 2) * 0.5 + (Math.random() - 0.5) * 140,
            dy = 180 + Math.random() * 340 + (ym - rect.height / 2) * 0.4,
            rot = (Math.random() - 0.5) * 160;
          d.animate([
            { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
            { transform: `translate(${dx.toFixed(0)}px,${dy.toFixed(0)}px) rotate(${rot.toFixed(0)}deg)`, opacity: 0 },
          ], { duration: 520 + Math.random() * 320, easing: "cubic-bezier(.15,.6,.25,1)", fill: "forwards" })
            .onfinish = () => d.remove();
        });
      }
      host.appendChild(frag);
    };

    addEventListener("vault:flash", doFlash);
    addEventListener("vault:wipe", doWipe);
    addEventListener("vault:shatter", doShatter);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("mousemove", onMouse);
      removeEventListener("resize", onResize);
      removeEventListener("vault:flash", doFlash);
      removeEventListener("vault:wipe", doWipe);
      removeEventListener("vault:shatter", doShatter);
    };
  }, []);

  return (
    <>
      <canvas id="gl" ref={glRef} aria-hidden="true" />
      <canvas id="fx" ref={fxRef} aria-hidden="true" />
      <div id="halftone" aria-hidden="true" />
      <div id="prog" ref={progRef} aria-hidden="true" />
      <div id="wipe" ref={wipeRef} aria-hidden="true"><div className="blade" /></div>
      <div id="flash" ref={flashRef} aria-hidden="true" />
      <div id="shards" ref={shardsRef} aria-hidden="true" />
    </>
  );
}

/** Fire the inverted-strobe flash + particle burst. */
export function vaultFlash() { window.dispatchEvent(new Event("vault:flash")); }
/** Fire the blade wipe transition. */
export function vaultWipe() { window.dispatchEvent(new Event("vault:wipe")); }
/** Shatter a card cover into glass shards flying off-screen. */
export function vaultShatter(rect: DOMRect, src: string) {
  window.dispatchEvent(new CustomEvent("vault:shatter", { detail: { rect, src } }));
}
