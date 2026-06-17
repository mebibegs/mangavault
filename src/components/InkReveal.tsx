"use client";
import { useEffect, useRef, useCallback } from "react";

interface Stamp {
  x: number; y: number; born: number; seed: number; rmax: number;
}

export default function InkReveal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampsRef = useRef<Stamp[]>([]);
  const runningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const mc: [number, number, number] = [9, 9, 11]; // black bg color
  const brushSize = 128, lifetime = 600, rStart = 10, rVary = 0.45;
  const stampStep = 10, maxStamps = 200, segments = 36;
  const wobble: [number, number, number] = [0.14, 0.08, 0.05];
  const gInner = 0.2, gStops: [number, number, number] = [0.95, 0.88, 0];

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c?.parentElement) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.parentElement.getBoundingClientRect();
    dimsRef.current = { w: r.width, h: r.height };
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    c.style.width = `${r.width}px`;
    c.style.height = `${r.height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${mc[0]},${mc[1]},${mc[2]})`;
    ctx.fillRect(0, 0, r.width, r.height);
  }, []);

  const carve = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, r * gInner, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${gStops[0] * alpha})`);
    g.addColorStop(0.5, `rgba(0,0,0,${gStops[1] * alpha})`);
    g.addColorStop(1, `rgba(0,0,0,${gStops[2] * alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const w = 0.78 + wobble[0] * Math.sin(a * 3 + seed) + wobble[1] * Math.sin(a * 5 + seed * 2.1) + wobble[2] * Math.sin(a * 7 + seed * 0.7);
      const px = x + Math.cos(a) * r * w, py = y + Math.sin(a) * r * w;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }, []);

  const addStamp = useCallback((x: number, y: number) => {
    const s = stampsRef.current;
    if (s.length >= maxStamps) s.shift();
    s.push({ x, y, born: performance.now(), seed: Math.random() * Math.PI * 2, rmax: brushSize * (1 - rVary + Math.random() * rVary) });
  }, []);

  const stampAlong = useCallback((x: number, y: number) => {
    const last = lastPosRef.current;
    if (!last) { addStamp(x, y); } else {
      const dx = x - last.x, dy = y - last.y, dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / stampStep));
      for (let i = 1; i <= steps; i++) addStamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
    }
    lastPosRef.current = { x, y };
  }, [addStamp]);

  const loop = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const { w, h } = dimsRef.current;
    const now = performance.now(), stamps = stampsRef.current;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${mc[0]},${mc[1]},${mc[2]})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-out";
    for (let i = stamps.length - 1; i >= 0; i--) {
      const t = (now - stamps[i].born) / lifetime;
      if (t >= 1) { stamps.splice(i, 1); continue; }
      const ease = 1 - Math.pow(1 - t, 3);
      const r = rStart + (stamps[i].rmax - rStart) * ease;
      carve(ctx, stamps[i].x, stamps[i].y, r, stamps[i].seed, 1 - t * t);
    }
    if (stamps.length) requestAnimationFrame(loop); else runningRef.current = false;
  }, [carve]);

  const startLoop = useCallback(() => { if (!runningRef.current) { runningRef.current = true; requestAnimationFrame(loop); } }, [loop]);

  useEffect(() => { resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize); }, [resize]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <canvas ref={canvasRef} className={className} style={{ position: "absolute", inset: 0, zIndex: 1, cursor: "crosshair", ...style }}
      onMouseEnter={(e) => { const p = getPos(e); lastPosRef.current = p; stampAlong(p.x, p.y); startLoop(); }}
      onMouseMove={(e) => { const p = getPos(e); stampAlong(p.x, p.y); startLoop(); }}
      onMouseLeave={() => { lastPosRef.current = null; }}
    />
  );
}
