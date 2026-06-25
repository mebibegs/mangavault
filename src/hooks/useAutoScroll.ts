"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseAutoScrollOptions {
  interval?: number;      // ms between scrolls (default: 3000)
  scrollAmount?: number;  // px or "page" (default: "page")
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  pauseOnInteraction?: boolean;
}

export function useAutoScroll<T extends HTMLElement>(options: UseAutoScrollOptions = {}) {
  const {
    interval = 3000,
    scrollAmount = "page",
    direction = "right",
    pauseOnHover = true,
    pauseOnInteraction = true,
  } = options;

  const elementRef = useRef<T>(null);
  const isPausedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastScrollRef = useRef<number>(0);

  const scroll = useCallback(() => {
    const el = elementRef.current;
    if (!el || isPausedRef.current) return;

    const amount = scrollAmount === "page" 
      ? el.clientWidth * 0.75 
      : scrollAmount;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = direction === "right" 
      ? Math.min(el.scrollLeft + amount, maxScroll)
      : Math.max(el.scrollLeft - amount, 0);

    // Bounce back when reaching end
    if (direction === "right" && el.scrollLeft >= maxScroll - 5) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (direction === "left" && el.scrollLeft <= 5) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: direction === "right" ? amount : -amount, behavior: "smooth" });
    }
  }, [direction, scrollAmount]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const tick = () => {
      const now = Date.now();
      if (now - lastScrollRef.current >= interval) {
        scroll();
        lastScrollRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [interval, scroll]);

  // Pause handlers
  useEffect(() => {
    const el = elementRef.current;
    if (!el || !pauseOnHover) return;

    const handleEnter = () => { isPausedRef.current = true; };
    const handleLeave = () => { isPausedRef.current = false; };

    el.addEventListener("mouseenter", handleEnter);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mouseenter", handleEnter);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [pauseOnHover]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !pauseOnInteraction) return;

    const handleTouch = () => { isPausedRef.current = true; };
    const handleWheel = () => { isPausedRef.current = true; };
    
    let timeout: NodeJS.Timeout;
    const resume = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => { isPausedRef.current = false; }, 1500);
    };

    el.addEventListener("touchstart", handleTouch, { passive: true });
    el.addEventListener("wheel", handleWheel, { passive: true });
    el.addEventListener("touchend", resume);
    el.addEventListener("scroll", resume, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouch);
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("scroll", resume);
    };
  }, [pauseOnInteraction]);

  return elementRef;
}
