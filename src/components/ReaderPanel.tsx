"use client";

/* eslint-disable @next/next/no-img-element -- Reader panels need raw img for external dynamic URLs */
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
        </div>
      )}
      {status === "error" && (
        <button className="rp-retry" onClick={handleRetry} aria-label={`Retry loading panel ${index + 1}`}>
          <svg className="rp-retry-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
          </svg>
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
