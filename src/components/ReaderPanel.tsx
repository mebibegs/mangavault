"use client";

import { useState } from "react";

interface ReaderPanelProps {
  src: string;
  index: number;
  eager?: boolean;
}

export default function ReaderPanel({ src, index, eager = false }: ReaderPanelProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);

  const handleLoad = () => setStatus("loaded");
  const handleError = () => setStatus("error");
  const handleRetry = () => {
    setStatus("loading");
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="rp-wrap">
      {status === "loading" && (
        <div className="rp-spinner-wrap">
          <div className="rp-spinner" />
          <span className="rp-spinner-label">{index + 1}</span>
        </div>
      )}
      {status === "error" && (
        <button className="rp-retry" onClick={handleRetry} aria-label={`Retry loading panel ${index + 1}`}>
          <svg className="rp-retry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span className="rp-retry-label">{index + 1}</span>
        </button>
      )}
      <img
        key={retryKey}
        src={src}
        alt={`Panel ${index + 1}`}
        className={`rp-img ${status === "loaded" ? "rp-img--visible" : "rp-img--hidden"}`}
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}
