"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Upload,
  FileJson,
  FileCode,
  Check,
  X,
  AlertTriangle,
  Loader2,
  FolderDown,
  FolderUp,
  RefreshCw,
  Trash2,
  Copy,
  Eye,
} from "lucide-react";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    prompts: number;
    configs: number;
    pipelines: number;
    experiments: number;
  };
}

interface ImportResult {
  success: boolean;
  validation?: ValidationResult;
  results?: {
    prompts: { imported: number; errors: number };
    configs: { imported: number; errors: number };
    pipelines: { imported: number; errors: number };
    experiments: { imported: number; errors: number };
  };
  message?: string;
  error?: string;
}

interface ConfigManagerProps {
  onLog?: (message: string) => void;
}

export function ConfigManager({ onLog }: ConfigManagerProps) {
  const [activeSection, setActiveSection] = useState<"export" | "import">("export");
  const [exportType, setExportType] = useState<"full" | "prompts" | "configs" | "pipelines" | "experiments">("full");
  const [exportFormat, setExportFormat] = useState<"json" | "yaml">("json");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    onLog?.(`▶ Exporting ${exportType} as ${exportFormat.toUpperCase()}...`);

    try {
      const response = await fetch(
        `/api/studio/export?type=${exportType}&format=${exportFormat}`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from Content-Disposition header or generate one
      const disposition = response.headers.get("Content-Disposition");
      let filename = `llm-top-config-${exportType}.${exportFormat}`;
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      onLog?.(`✓ Exported to ${filename}`);
    } catch (error) {
      onLog?.(`✗ Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportPreview(text);

      // Validate the file
      onLog?.(`▶ Validating ${file.name}...`);
      const response = await fetch("/api/studio/import?dry_run=true", {
        method: "POST",
        headers: {
          "Content-Type": file.name.endsWith(".yaml") || file.name.endsWith(".yml")
            ? "application/x-yaml"
            : "application/json",
        },
        body: text,
      });

      const result = await response.json();
      setValidationResult(result.validation);

      if (result.validation?.valid) {
        onLog?.(`✓ Validation passed: ${result.validation.summary.prompts} prompts, ${result.validation.summary.configs} configs, ${result.validation.summary.pipelines} pipelines, ${result.validation.summary.experiments} experiments`);
      } else {
        onLog?.(`⚠ Validation failed: ${result.validation?.errors?.length || 0} errors`);
      }
    } catch (error) {
      onLog?.(`✗ Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    setImportResult(null);
    onLog?.(`▶ Importing (${importMode} mode)...`);

    try {
      const response = await fetch(`/api/studio/import?mode=${importMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: importPreview,
      });

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success) {
        const r = result.results;
        onLog?.(`✓ Import complete: ${r?.prompts.imported || 0} prompts, ${r?.configs.imported || 0} configs, ${r?.pipelines.imported || 0} pipelines, ${r?.experiments.imported || 0} experiments`);
      } else {
        onLog?.(`✗ Import failed: ${result.error}`);
      }
    } catch (error) {
      onLog?.(`✗ Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    setImportPreview(null);
    setValidationResult(null);
    setImportResult(null);
  };

  const copyToClipboard = () => {
    if (importPreview) {
      navigator.clipboard.writeText(importPreview);
      onLog?.("✓ Copied to clipboard");
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSection("export")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            activeSection === "export"
              ? "text-white border-b-2 border-violet-500"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Download className="h-4 w-4" />
          Экспорт
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("import")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            activeSection === "import"
              ? "text-white border-b-2 border-violet-500"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Upload className="h-4 w-4" />
          Импорт
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeSection === "export" ? (
          // Export Section
          <div className="max-w-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Экспорт конфигурации</h2>
              <p className="text-sm text-slate-400">
                Выгрузите промпты, настройки агентов, пайплайны и эксперименты в файл для бэкапа или переноса.
              </p>
            </div>

            {/* Export Type */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Что экспортировать</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "full", label: "Всё", icon: FolderDown },
                  { value: "prompts", label: "Промпты", icon: FileCode },
                  { value: "configs", label: "Конфиги", icon: FileJson },
                  { value: "pipelines", label: "Пайплайны", icon: FileJson },
                  { value: "experiments", label: "Эксперименты", icon: FileJson },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setExportType(value as typeof exportType)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                      exportType === value
                        ? "border-violet-500 bg-violet-600/20 text-white"
                        : "border-slate-700 hover:border-slate-600 text-slate-400"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Формат</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("json")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                    exportFormat === "json"
                      ? "border-violet-500 bg-violet-600/20 text-white"
                      : "border-slate-700 hover:border-slate-600 text-slate-400"
                  )}
                >
                  <FileJson className="h-4 w-4" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("yaml")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                    exportFormat === "yaml"
                      ? "border-violet-500 bg-violet-600/20 text-white"
                      : "border-slate-700 hover:border-slate-600 text-slate-400"
                  )}
                >
                  <FileCode className="h-4 w-4" />
                  YAML
                </button>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Экспортировать {exportType === "full" ? "всё" : exportType}
            </Button>
          </div>
        ) : (
          // Import Section
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-2">Импорт конфигурации</h2>
              <p className="text-sm text-slate-400">
                Загрузите файл конфигурации (JSON или YAML) для восстановления или переноса настроек.
              </p>
            </div>

            {/* Import Mode */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Режим импорта</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode("merge")}
                  className={cn(
                    "flex-1 p-3 rounded-lg border transition-colors text-left",
                    importMode === "merge"
                      ? "border-violet-500 bg-violet-600/20"
                      : "border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="font-medium text-white">Объединить</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Добавить новые и обновить существующие записи
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode("replace")}
                  className={cn(
                    "flex-1 p-3 rounded-lg border transition-colors text-left",
                    importMode === "replace"
                      ? "border-amber-500 bg-amber-600/20"
                      : "border-slate-700 hover:border-slate-600"
                  )}
                >
                  <div className="font-medium text-white">Заменить</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Удалить старые и заменить новыми записями
                  </div>
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-8 border-2 border-dashed border-slate-700 rounded-lg hover:border-violet-500 transition-colors"
              >
                <div className="flex flex-col items-center text-slate-400">
                  <FolderUp className="h-8 w-8 mb-2" />
                  <span className="font-medium">Выберите файл</span>
                  <span className="text-xs mt-1">JSON или YAML</span>
                </div>
              </button>
            </div>

            {/* Preview & Validation */}
            {importPreview && (
              <div className="space-y-4">
                {/* Validation Result */}
                {validationResult && (
                  <div
                    className={cn(
                      "p-4 rounded-lg border",
                      validationResult.valid
                        ? "bg-emerald-950/30 border-emerald-900/50"
                        : "bg-red-950/30 border-red-900/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {validationResult.valid ? (
                        <Check className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          validationResult.valid ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {validationResult.valid ? "Валидация пройдена" : "Ошибки валидации"}
                      </span>
                    </div>

                    {/* Summary */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="border-slate-600">
                        {validationResult.summary.prompts} промптов
                      </Badge>
                      <Badge variant="outline" className="border-slate-600">
                        {validationResult.summary.configs} конфигов
                      </Badge>
                      <Badge variant="outline" className="border-slate-600">
                        {validationResult.summary.pipelines} пайплайнов
                      </Badge>
                      <Badge variant="outline" className="border-slate-600">
                        {validationResult.summary.experiments} экспериментов
                      </Badge>
                    </div>

                    {/* Errors */}
                    {validationResult.errors.length > 0 && (
                      <div className="text-sm text-red-300">
                        <div className="font-medium mb-1">Ошибки:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {validationResult.errors.length > 5 && (
                            <li>... и ещё {validationResult.errors.length - 5}</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Warnings */}
                    {validationResult.warnings.length > 0 && (
                      <div className="text-sm text-amber-300 mt-2">
                        <div className="font-medium mb-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Предупреждения:
                        </div>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.warnings.slice(0, 3).map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview */}
                <div className="bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Предпросмотр
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={copyToClipboard}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400"
                        onClick={handleClear}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <pre className="p-3 text-xs text-slate-300 max-h-48 overflow-auto font-mono">
                    {importPreview.slice(0, 2000)}
                    {importPreview.length > 2000 && "\n... (truncated)"}
                  </pre>
                </div>

                {/* Import Button */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleImport}
                    disabled={!validationResult?.valid || isImporting}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Импортировать
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    className="border-slate-700"
                  >
                    Отмена
                  </Button>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div
                    className={cn(
                      "p-4 rounded-lg border",
                      importResult.success
                        ? "bg-emerald-950/30 border-emerald-900/50"
                        : "bg-red-950/30 border-red-900/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {importResult.success ? (
                        <Check className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <X className="h-5 w-5 text-red-400" />
                      )}
                      <span
                        className={cn(
                          "font-medium",
                          importResult.success ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {importResult.success ? "Импорт завершён" : "Ошибка импорта"}
                      </span>
                    </div>
                    {importResult.results && (
                      <div className="mt-2 text-sm text-slate-300">
                        Импортировано: {importResult.results.prompts.imported} промптов,{" "}
                        {importResult.results.configs.imported} конфигов,{" "}
                        {importResult.results.pipelines.imported} пайплайнов,{" "}
                        {importResult.results.experiments.imported} экспериментов
                      </div>
                    )}
                    {importResult.error && (
                      <div className="mt-2 text-sm text-red-300">{importResult.error}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
