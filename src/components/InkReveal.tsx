"use client";
import { useEffect, useRef, useCallback } from "react";

interface Stamp {
  x: number;
  y: number;
  born: number;
  seed: number;
  rmax: number;
}

const MASK_COLOR: [number, number, number] = [9, 9, 11];
const BRUSH_SIZE = 128;
const LIFETIME_MS = 600;
const R_START = 10;
const R_VARY = 0.45;
const STAMP_STEP = 10;
const MAX_STAMPS = 200;
const SEGMENTS = 36;
const WOBBLE: [number, number, number] = [0.14, 0.08, 0.05];
const GRADIENT_INNER = 0.2;
const GRADIENT_STOPS: [number, number, number] = [0.95, 0.88, 0];

export default function InkReveal({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stampsRef = useRef<Stamp[]>([]);
  const runningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const dimsRef = useRef({ w: 0, h: 0 });
  const loopRef = useRef<() => void>(() => undefined);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    dimsRef.current = { w: rect.width, h: rect.height };
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${MASK_COLOR[0]},${MASK_COLOR[1]},${MASK_COLOR[2]})`;
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const carve = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, r: number, seed: number, alpha: number) => {
    const gradient = ctx.createRadialGradient(x, y, r * GRADIENT_INNER, x, y, r);
    gradient.addColorStop(0, `rgba(0,0,0,${GRADIENT_STOPS[0] * alpha})`);
    gradient.addColorStop(0.5, `rgba(0,0,0,${GRADIENT_STOPS[1] * alpha})`);
    gradient.addColorStop(1, `rgba(0,0,0,${GRADIENT_STOPS[2] * alpha})`);
    ctx.fillStyle = gradient;
    ctx.beginPath();

    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = (i / SEGMENTS) * Math.PI * 2;
      const wobble = 0.78
        + WOBBLE[0] * Math.sin(angle * 3 + seed)
        + WOBBLE[1] * Math.sin(angle * 5 + seed * 2.1)
        + WOBBLE[2] * Math.sin(angle * 7 + seed * 0.7);
      const px = x + Math.cos(angle) * r * wobble;
      const py = y + Math.sin(angle) * r * wobble;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fill();
  }, []);

  const addStamp = useCallback((x: number, y: number) => {
    const stamps = stampsRef.current;
    if (stamps.length >= MAX_STAMPS) stamps.shift();
    stamps.push({
      x,
      y,
      born: performance.now(),
      seed: Math.random() * Math.PI * 2,
      rmax: BRUSH_SIZE * (1 - R_VARY + Math.random() * R_VARY),
    });
  }, []);

  const stampAlong = useCallback((x: number, y: number) => {
    const last = lastPosRef.current;
    if (!last) {
      addStamp(x, y);
    } else {
      const dx = x - last.x;
      const dy = y - last.y;
      const distance = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(distance / STAMP_STEP));
      for (let i = 1; i <= steps; i++) {
        addStamp(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
      }
    }
    lastPosRef.current = { x, y };
  }, [addStamp]);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = dimsRef.current;
    const now = performance.now();
    const stamps = stampsRef.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${MASK_COLOR[0]},${MASK_COLOR[1]},${MASK_COLOR[2]})`;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-out";

    for (let i = stamps.length - 1; i >= 0; i--) {
      const stamp = stamps[i];
      const t = (now - stamp.born) / LIFETIME_MS;
      if (t >= 1) {
        stamps.splice(i, 1);
        continue;
      }

      const ease = 1 - Math.pow(1 - t, 3);
      const radius = R_START + (stamp.rmax - R_START) * ease;
      carve(ctx, stamp.x, stamp.y, radius, stamp.seed, 1 - t * t);
    }

    if (stamps.length) requestAnimationFrame(loopRef.current);
    else runningRef.current = false;
  }, [carve]);

  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const startLoop = useCallback(() => {
    if (!runningRef.current) {
      runningRef.current = true;
      requestAnimationFrame(loopRef.current);
    }
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const getPos = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: "absolute", inset: 0, zIndex: 1, cursor: "crosshair", ...style }}
      onMouseEnter={(event) => {
        const pos = getPos(event);
        lastPosRef.current = pos;
        stampAlong(pos.x, pos.y);
        startLoop();
      }}
      onMouseMove={(event) => {
        const pos = getPos(event);
        stampAlong(pos.x, pos.y);
        startLoop();
      }}
      onMouseLeave={() => {
        lastPosRef.current = null;
      }}
    />
  );
}
