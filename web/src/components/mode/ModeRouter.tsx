"use client";

import { lazy, Suspense } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Loader2 } from "lucide-react";

const WorkspaceMode = lazy(() => import("@/components/workspace/WorkspaceLayout").then(m => ({ default: m.WorkspaceLayout })));
const DocumentMode = lazy(() => import("@/components/document/DocumentLayout").then(m => ({ default: m.DocumentLayout })));
const PresentMode = lazy(() => import("@/components/present/PresentLayout").then(m => ({ default: m.PresentLayout })));
const CompareMode = lazy(() => import("@/components/compare/CompareLayout").then(m => ({ default: m.CompareLayout })));

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    </div>
  );
}

export function ModeRouter() {
  const { viewMode } = useUIStore();

  return (
    <Suspense fallback={<LoadingFallback />}>
      {viewMode === "workspace" && <WorkspaceMode />}
      {viewMode === "document" && <DocumentMode />}
      {viewMode === "present" && <PresentMode />}
      {viewMode === "compare" && <CompareMode />}
    </Suspense>
  );
}
