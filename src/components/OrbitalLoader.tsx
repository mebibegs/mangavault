"use client";

export default function OrbitalLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-[orbital-spin_1s_linear_infinite]" />
        <div className="absolute inset-2 border-2 border-transparent border-t-white/60 rounded-full animate-[orbital-spin-reverse_1.5s_linear_infinite]" />
        <div className="absolute inset-4 border-2 border-transparent border-t-white/30 rounded-full animate-[orbital-spin_0.8s_linear_infinite]" />
      </div>
      {message && <p className="text-text-secondary text-xs sm:text-sm animate-pulse">{message}</p>}
    </div>
  );
}
