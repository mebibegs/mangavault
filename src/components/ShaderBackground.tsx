"use client";
import { useEffect, useRef } from "react";

const VS = `attribute vec4 aVertexPosition;void main(){gl_Position=aVertexPosition;}`;

const FS = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
const float overallSpeed=0.2;
const float gridSmoothWidth=0.015;
const float scale=5.0;
const vec4 lineColor=vec4(0.35,0.18,0.7,1.0);
const float minLineWidth=0.01;
const float maxLineWidth=0.2;
const float lineSpeed=1.0*overallSpeed;
const float lineAmplitude=1.0;
const float lineFrequency=0.2;
const float warpSpeed=0.2*overallSpeed;
const float warpFrequency=0.5;
const float warpAmplitude=1.0;
const float offsetFrequency=0.5;
const float offsetSpeed=1.33*overallSpeed;
const float minOffsetSpread=0.6;
const float maxOffsetSpread=2.0;
const int linesPerGroup=10;
#define drawSmoothLine(pos,halfWidth,t) smoothstep(halfWidth,0.0,abs(pos-(t)))
#define drawCrispLine(pos,halfWidth,t) smoothstep(halfWidth+gridSmoothWidth,halfWidth,abs(pos-(t)))
float random(float t){return(cos(t)+cos(t*1.3+1.3)+cos(t*1.4+1.4))/3.0;}
float getPlasmaY(float x,float hf,float off){return random(x*lineFrequency+iTime*lineSpeed)*hf*lineAmplitude+off;}
void main(){
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  vec2 space=(gl_FragCoord.xy-iResolution.xy/2.0)/iResolution.x*2.0*scale;
  float hf=1.0-(cos(uv.x*6.28)*0.5+0.5);
  float vf=1.0-(cos(uv.y*6.28)*0.5+0.5);
  space.y+=random(space.x*warpFrequency+iTime*warpSpeed)*warpAmplitude*(0.5+hf);
  space.x+=random(space.y*warpFrequency+iTime*warpSpeed+2.0)*warpAmplitude*hf;
  vec4 lines=vec4(0.0);
  for(int l=0;l<linesPerGroup;l++){
    float ni=float(l)/float(linesPerGroup);
    float ot=iTime*offsetSpeed;
    float op=float(l)+space.x*offsetFrequency;
    float r=random(op+ot)*0.5+0.5;
    float hw=mix(minLineWidth,maxLineWidth,r*hf)/2.0;
    float off=random(op+ot*(1.0+ni))*mix(minOffsetSpread,maxOffsetSpread,hf);
    float lp=getPlasmaY(space.x,hf,off);
    float line=drawSmoothLine(lp,hw,space.y)/2.0+drawCrispLine(lp,hw*0.15,space.y);
    lines+=line*lineColor*r;
  }
  vec4 bg=mix(vec4(0.04,0.04,0.12,1.0),vec4(0.12,0.04,0.2,1.0),uv.x);
  bg*=vf;bg.a=1.0;bg+=lines;
  gl_FragColor=bg;
}`;

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip WebGL on low-end or mobile devices that would lag
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,       // saves fill-rate on mobile
      powerPreference: "low-power", // lets browser/GPU throttle aggressively
      alpha: false,
    });
    if (!gl) return;

    function loadShader(gl: WebGLRenderingContext, type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    }

    const vs = loadShader(gl, gl.VERTEX_SHADER, VS);
    const fs = loadShader(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "aVertexPosition");
    const uRes = gl.getUniformLocation(prog, "iResolution");
    const uTime = gl.getUniformLocation(prog, "iTime");

    // Cap render resolution so the fill-rate stays cheap on small screens
    const MAX_DIM = 640;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      // Use a max DPR of 1 for the shader canvas — we don't need pixel-perfect
      const dpr = 1;
      const w = Math.min(p.clientWidth, MAX_DIM);
      const h = Math.min(p.clientHeight, MAX_DIM);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // CSS stretches the canvas to fill the container via absolute inset-0
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Pause rendering when the tab is hidden or user scrolls (not visible)
    let paused = false;
    const handleVisibility = () => { paused = document.hidden; };
    document.addEventListener("visibilitychange", handleVisibility);

    const t0 = performance.now();
    // Throttle to ~30 fps to save GPU/battery; the animation is subtle enough
    let lastFrame = 0;
    const TARGET_FPS = 30;
    const FRAME_BUDGET = 1000 / TARGET_FPS;

    const render = (now: number) => {
      rafRef.current = requestAnimationFrame(render);
      if (paused) return;
      if (now - lastFrame < FRAME_BUDGET) return;
      lastFrame = now;
      const t = (now - t0) / 1000;
      gl.useProgram(prog);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aPos);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0, imageRendering: "auto" }}
      aria-hidden="true"
    />
  );
}
