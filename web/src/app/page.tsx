"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Drawer } from "@/components/layout/Drawer";
import { StatusBar } from "@/components/layout/StatusBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ModeRouter } from "@/components/mode/ModeRouter";
import { ControlPlane } from "@/components/studio/ControlPlane";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUIStore } from "@/stores/uiStore";

export default function Home() {
  useKeyboardShortcuts();

  const { drawerOpen, viewMode, controlPlaneOpen, closeControlPlane } = useUIStore();

  // Present mode has a special minimal layout
  const showSidebar = viewMode !== "present";
  const showStatusBar = viewMode !== "present";

  // If Control Plane is open, show it fullscreen
  if (controlPlaneOpen) {
    return <ControlPlane onClose={closeControlPlane} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {showSidebar && <Sidebar />}

        <main className="flex-1 flex flex-col overflow-hidden">
          <ModeRouter />
        </main>

        {drawerOpen && viewMode !== "present" && <Drawer />}
      </div>

      {showStatusBar && <StatusBar />}

      <CommandPalette />
    </div>
  );
}
