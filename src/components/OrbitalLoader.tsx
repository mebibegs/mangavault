"use client";
import { motion } from "framer-motion";

export default function OrbitalLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 border-2 border-transparent border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 border-2 border-transparent border-t-white/60 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-4 border-2 border-transparent border-t-white/30 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>
      {message && <p className="text-text-secondary text-xs sm:text-sm animate-pulse">{message}</p>}
    </div>
  );
}
