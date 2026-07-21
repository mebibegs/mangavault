"use client";

import { useState } from "react";

export function ApiTester() {
  const [liveResult, setLiveResult] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function runLiveExample() {
    setLiveLoading(true);
    setLiveResult(null);
    try {
      const res = await fetch("/api/search?q=solo+leveling");
      const data = await res.json();
      setLiveResult(JSON.stringify(data, null, 2));
    } catch {
      setLiveResult('{ "error": "Request failed. Try again." }');
    } finally {
      setLiveLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <div className="vpanel" style={{ padding: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "18px 22px", borderBottom: "2px solid #333" }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontStyle: "italic", fontSize: 16, textTransform: "uppercase", letterSpacing: ".04em" }}>Try it live</h3>
            <p style={{ margin: "4px 0 0", color: "#888", fontSize: 11, letterSpacing: ".08em" }}>SEND A REAL REQUEST — SEE EXACTLY WHAT COMES BACK</p>
          </div>
          <button className="btn sm" onClick={runLiveExample} disabled={liveLoading}>
            {liveLoading ? "FETCHING…" : "▶ RUN EXAMPLE"}
          </button>
        </div>
        <div style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className="tag" style={{ borderColor: "#fff", color: "#fff", fontWeight: 800 }}>GET</span>
            <code style={{ fontSize: 12, color: "#aaa", wordBreak: "break-all" }}>/api/search?q=solo+leveling</code>
          </div>
          {liveResult && (
            <div style={{ position: "relative", marginTop: 14, border: "2px solid #333", background: "#000", overflow: "hidden" }}>
              <button
                className="chip"
                style={{ position: "absolute", top: 8, right: 8, zIndex: 2, padding: "5px 10px" }}
                onClick={() => copyToClipboard(liveResult)}
              >
                {copied ? "COPIED ✓" : "COPY"}
              </button>
              <pre style={{ margin: 0, padding: 16, overflowX: "auto", maxHeight: 320, fontSize: 11 }}>
                <code style={{ color: "#ddd", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{liveResult}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function EndpointCard({
  method,
  path,
  description,
  params,
  example,
}: {
  method: string;
  path: string;
  description: string;
  params: { name: string; type: string; required: boolean; desc: string }[];
  example: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="vpanel-line" style={{ padding: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
          background: "none", border: 0, color: "#fff", fontFamily: "inherit", cursor: "pointer", textAlign: "left",
        }}
      >
        <span className="tag" style={{ borderColor: "#fff", fontWeight: 800, flexShrink: 0 }}>{method}</span>
        <code style={{ fontSize: 13, flex: 1 }}>{path}</code>
        <span style={{ color: "#888", transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {open && (
        <div style={{ borderTop: "2px solid #333", padding: 18 }}>
          <p style={{ margin: "0 0 16px", color: "#aaa", fontSize: 13, lineHeight: 1.7 }}>{description}</p>
          {params.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h4 className="vlabel">Parameters</h4>
              {params.map((p) => (
                <div key={p.name} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", border: "1px solid #333", background: "#000", padding: "10px 12px", marginBottom: 8 }}>
                  <code style={{ fontSize: 12, color: "#fff" }}>{p.name}</code>
                  <span className="tag" style={{ borderColor: "#333", color: "#888" }}>{p.type}</span>
                  {p.required && <span className="tag" style={{ borderColor: "#fff", color: "#fff" }}>REQUIRED</span>}
                  <span style={{ color: "#aaa", fontSize: 12, flex: 1, minWidth: 160 }}>{p.desc}</span>
                </div>
              ))}
            </div>
          )}
          <h4 className="vlabel">Example</h4>
          <pre style={{ margin: 0, background: "#000", border: "1px solid #333", padding: 14, overflowX: "auto", fontSize: 11, color: "#ddd" }}>{example}</pre>
        </div>
      )}
    </div>
  );
}
