"use client";
import { useEffect, useRef } from "react";

const VS = `attribute vec4 aVertexPosition;void main(){gl_Position=aVertexPosition;}`;

const FS = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
const float overallSpeed=0.2;
const float gridSmoothWidth=0.015;
const float axisWidth=0.05;
const float majorLineWidth=0.025;
const float minorLineWidth=0.0125;
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
const int linesPerGroup=16;
#define drawSmoothLine(pos,halfWidth,t) smoothstep(halfWidth,0.0,abs(pos-(t)))
#define drawCrispLine(pos,halfWidth,t) smoothstep(halfWidth+gridSmoothWidth,halfWidth,abs(pos-(t)))
#define drawCircle(pos,radius,coord) smoothstep(radius+gridSmoothWidth,radius,length(coord-(pos)))
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
    float cx=mod(float(l)+iTime*lineSpeed,25.0)-12.0;
    vec2 cp=vec2(cx,getPlasmaY(cx,hf,off));
    line+=drawCircle(cp,0.01,space)*4.0;
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
    const gl = canvas.getContext("webgl");
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

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(p.clientWidth * dpr);
      canvas.height = Math.round(p.clientHeight * dpr);
      canvas.style.width = p.clientWidth + "px";
      canvas.style.height = p.clientHeight + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener("resize", resize);
    resize();

    const t0 = performance.now();
    const render = () => {
      const t = (performance.now() - t0) / 1000;
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(aPos);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />;
}
