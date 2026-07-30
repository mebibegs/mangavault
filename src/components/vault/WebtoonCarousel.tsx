"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";
import { A11y } from "swiper/modules";
import "swiper/css";

interface WebtoonCarouselProps {
  children: ReactNode[];
}

export default function WebtoonCarousel({ children }: WebtoonCarouselProps) {
  const swiperRef = useRef<SwiperClass | null>(null);

  if (!children || children.length === 0) return null;

  return (
    <div className="wcarousel">
      <Swiper
        modules={[A11y]}
        onSwiper={(s) => (swiperRef.current = s)}
        spaceBetween={12}
        slidesPerView="auto"
        slidesPerGroup={2}
        navigation={false}
        allowTouchMove={true}
        grabCursor={true}
        className="wcarousel-swiper"
      >
        {children.map((child, i) => (
          <SwiperSlide key={i} className="wcarousel-slide">
            {child}
          </SwiperSlide>
        ))}
      </Swiper>

      <button
        type="button"
        className="wcarousel-nav prev"
        aria-label="go to previous carousel"
        onClick={() => swiperRef.current?.slidePrev()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className="wcarousel-nav next"
        aria-label="go to next carousel"
        onClick={() => swiperRef.current?.slideNext()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
