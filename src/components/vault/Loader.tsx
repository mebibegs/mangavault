"use client";

export function Loader({ size = 40, strokeWidth = 3 }: { size?: number; strokeWidth?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Loading"
      role="status"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "spin 1s linear infinite" }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#fff"
          strokeWidth={strokeWidth}
          strokeOpacity="0.15"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="#fff"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          style={{
            animation: "dash 1.5s ease-in-out infinite",
            transformOrigin: "center",
          }}
        />
      </svg>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes dash {
          0% { stroke-dasharray: 1, 31.4; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 15.7, 31.4; stroke-dashoffset: -12; }
          100% { stroke-dasharray: 15.7, 31.4; stroke-dashoffset: -31.4; }
        }
      `}</style>
    </div>
  );
}

export function InlineLoader({ size = 18, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: "spin 1s linear infinite" }}>
        <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth={strokeWidth} strokeOpacity="0.3" />
        <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="31.4 31.4" style={{ animation: "dash 1.5s ease-in-out infinite", transformOrigin: "center" }} />
      </svg>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dash {
          0% { stroke-dasharray: 1, 31.4; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 15.7, 31.4; stroke-dashoffset: -12; }
          100% { stroke-dasharray: 15.7, 31.4; stroke-dashoffset: -31.4; }
        }
      `}</style>
    </span>
  );
}