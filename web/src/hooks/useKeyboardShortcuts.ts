"use client";

import { useEffect } from "react";
import { useUIStore, ViewMode } from "@/stores/uiStore";
import { useSessionStore } from "@/stores/sessionStore";

export function useKeyboardShortcuts() {
  const {
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    toggleSidebar,
    toggleDrawer,
    expandAllSections,
    collapseAllSections,
    viewMode,
    setViewMode,
    cycleViewMode,
    nextSlide,
    prevSlide,
    toggleSpeakerNotes,
    togglePresentFullscreen,
    exitPresentMode,
    toggleCompareSyncScroll,
    toggleCompareShowDiff,
  } = useUIStore();

  const { createSession, startAnalysis, pauseAnalysis, currentSession } = useSessionStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Cmd+K - Command palette (always works)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
        return;
      }

      // If command palette is open, let it handle keys
      if (commandPaletteOpen) return;

      // If typing in input, don't trigger single-key shortcuts
      if (isInput) return;

      // Present mode shortcuts (priority)
      if (viewMode === "present") {
        switch (e.key.toLowerCase()) {
          case " ": // Space
          case "arrowright":
          case "j":
            e.preventDefault();
            nextSlide();
            return;

          case "arrowleft":
          case "k":
            e.preventDefault();
            prevSlide();
            return;

          case "f":
            e.preventDefault();
            togglePresentFullscreen();
            return;

          case "n":
            e.preventDefault();
            toggleSpeakerNotes();
            return;

          case "escape":
            e.preventDefault();
            exitPresentMode();
            return;
        }
      }

      // Compare mode shortcuts
      if (viewMode === "compare") {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            toggleCompareSyncScroll();
            return;

          case "d":
            e.preventDefault();
            toggleCompareShowDiff();
            return;
        }
      }

      // Single key shortcuts (global)
      switch (e.key.toLowerCase()) {
        // Mode switching (1-4)
        case "1":
          e.preventDefault();
          setViewMode("workspace");
          break;

        case "2":
          e.preventDefault();
          setViewMode("document");
          break;

        case "3":
          e.preventDefault();
          setViewMode("present");
          break;

        case "4":
          e.preventDefault();
          setViewMode("compare");
          break;

        case "m":
          e.preventDefault();
          cycleViewMode();
          break;

        case "n":
          if (viewMode !== "present") {
            e.preventDefault();
            createSession();
          }
          break;

        case "/":
          e.preventDefault();
          openCommandPalette();
          break;

        case "?":
          e.preventDefault();
          // Show help
          break;
      }

      // Cmd/Ctrl + key shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case "\\":
            e.preventDefault();
            if (e.shiftKey) {
              toggleDrawer();
            } else {
              toggleSidebar();
            }
            break;

          case "Enter":
            e.preventDefault();
            if (currentSession?.status === "input") {
              startAnalysis();
            }
            break;

          case ".":
            e.preventDefault();
            if (currentSession?.status === "running") {
              pauseAnalysis();
            }
            break;

          case "ArrowUp":
            e.preventDefault();
            collapseAllSections();
            break;

          case "ArrowDown":
            e.preventDefault();
            expandAllSections();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    commandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleSidebar,
    toggleDrawer,
    createSession,
    startAnalysis,
    pauseAnalysis,
    expandAllSections,
    collapseAllSections,
    currentSession,
    viewMode,
    setViewMode,
    cycleViewMode,
    nextSlide,
    prevSlide,
    toggleSpeakerNotes,
    togglePresentFullscreen,
    exitPresentMode,
    toggleCompareSyncScroll,
    toggleCompareShowDiff,
  ]);
}
