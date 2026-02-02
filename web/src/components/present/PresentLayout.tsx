"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSessionStore } from "@/stores/sessionStore";
import { useUIStore } from "@/stores/uiStore";
import { useSlideBuilder } from "./useSlideBuilder";
import { SlideView } from "./SlideView";
import { SlideNavigation } from "./SlideNavigation";
import { SpeakerNotes } from "./SpeakerNotes";
import { Button } from "@/components/ui/button";
import { Presentation, X, Maximize2, Minimize2, FileText } from "lucide-react";

export function PresentLayout() {
  const { currentSession } = useSessionStore();
  const {
    presentSlideIndex,
    nextSlide,
    prevSlide,
    setSlideIndex,
    speakerNotesVisible,
    toggleSpeakerNotes,
    presentFullscreen,
    togglePresentFullscreen,
    exitPresentMode,
  } = useUIStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const slides = useSlideBuilder(currentSession);

  // Clamp slide index to valid range
  const currentIndex = Math.min(Math.max(0, presentSlideIndex), slides.length - 1);
  const currentSlide = slides[currentIndex];

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && presentFullscreen) {
        togglePresentFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [presentFullscreen, togglePresentFullscreen]);

  const enterFullscreen = useCallback(async () => {
    if (containerRef.current && !document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        togglePresentFullscreen();
      } catch (err) {
        console.error("Error entering fullscreen:", err);
      }
    }
  }, [togglePresentFullscreen]);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        togglePresentFullscreen();
      } catch (err) {
        console.error("Error exiting fullscreen:", err);
      }
    }
  }, [togglePresentFullscreen]);

  // Handle touch/swipe navigation
  const touchStart = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart.current === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart.current - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left - next slide
        if (currentIndex < slides.length - 1) {
          nextSlide();
        }
      } else {
        // Swipe right - prev slide
        if (currentIndex > 0) {
          prevSlide();
        }
      }
    }

    touchStart.current = null;
  }, [currentIndex, slides.length, nextSlide, prevSlide]);

  // No session view
  if (!currentSession || slides.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Presentation className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Презентация недоступна</h2>
          <p className="text-slate-400 mb-4">
            Завершите анализ для создания слайдов презентации
          </p>
          <Button variant="outline" onClick={exitPresentMode} className="border-slate-700">
            <X className="h-4 w-4 mr-2" />
            Выйти из презентации
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col relative bg-slate-950"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSpeakerNotes}
          className={speakerNotesVisible ? "bg-slate-800" : ""}
          title="Speaker Notes (N)"
        >
          <FileText className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={presentFullscreen ? exitFullscreen : enterFullscreen}
          title="Fullscreen (F)"
        >
          {presentFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={exitPresentMode}
          title="Exit (Esc)"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Slide Content */}
      <div className="flex-1 overflow-hidden">
        {currentSlide && (
          <SlideView
            slide={currentSlide}
            slideNumber={currentIndex + 1}
            totalSlides={slides.length}
          />
        )}
      </div>

      {/* Navigation */}
      <SlideNavigation
        currentIndex={currentIndex}
        totalSlides={slides.length}
        onPrev={() => currentIndex > 0 && prevSlide()}
        onNext={() => currentIndex < slides.length - 1 && nextSlide()}
        onGoTo={setSlideIndex}
      />

      {/* Speaker Notes */}
      {currentSlide && (
        <SpeakerNotes
          slide={currentSlide}
          visible={speakerNotesVisible}
          onClose={toggleSpeakerNotes}
        />
      )}
    </div>
  );
}
