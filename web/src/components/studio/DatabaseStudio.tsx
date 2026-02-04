"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Table,
  Plus,
  Play,
  Download,
  Upload,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Check,
  X,
} from "lucide-react";

interface DatabaseStudioProps {
  onLog?: (message: string) => void;
}

interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    isPrimary: boolean;
  }[];
  rowCount: number;
}

const MOCK_TABLES: TableSchema[] = [
  {
    name: "llm_top_sessions",
    columns: [
      { name: "id", type: "uuid", nullable: false, isPrimary: true },
      { name: "user_id", type: "text", nullable: false, isPrimary: false },
      { name: "task", type: "text", nullable: false, isPrimary: false },
      { name: "task_type", type: "text", nullable: false, isPrimary: false },
      { name: "context", type: "jsonb", nullable: true, isPrimary: false },
      { name: "analyses", type: "jsonb", nullable: true, isPrimary: false },
      { name: "synthesis", type: "jsonb", nullable: true, isPrimary: false },
      { name: "status", type: "text", nullable: false, isPrimary: false },
      { name: "created_at", type: "timestamptz", nullable: false, isPrimary: false },
    ],
    rowCount: 47,
  },
  {
    name: "llm_top_settings",
    columns: [
      { name: "id", type: "uuid", nullable: false, isPrimary: true },
      { name: "user_id", type: "text", nullable: false, isPrimary: false },
      { name: "settings_type", type: "text", nullable: false, isPrimary: false },
      { name: "data", type: "jsonb", nullable: false, isPrimary: false },
      { name: "updated_at", type: "timestamptz", nullable: false, isPrimary: false },
    ],
    rowCount: 12,
  },
  {
    name: "candidates",
    columns: [
      { name: "id", type: "serial", nullable: false, isPrimary: true },
      { name: "full_name", type: "varchar(255)", nullable: true, isPrimary: false },
      { name: "phone", type: "varchar(20)", nullable: true, isPrimary: false },
      { name: "status", type: "varchar(50)", nullable: true, isPrimary: false },
      { name: "created_at", type: "timestamp", nullable: false, isPrimary: false },
    ],
    rowCount: 234,
  },
];

export function DatabaseStudio({ onLog }: DatabaseStudioProps) {
  const [tables] = useState<TableSchema[]>(MOCK_TABLES);
  const [selectedTable, setSelectedTable] = useState<string | null>("llm_top_sessions");
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM llm_top_sessions\nWHERE created_at > NOW() - INTERVAL '7 days'\nORDER BY created_at DESC\nLIMIT 100;");
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedTable, setExpandedTable] = useState<string | null>("llm_top_sessions");

  const selectedTableData = tables.find((t) => t.name === selectedTable);

  const runQuery = async () => {
    setIsRunning(true);
    onLog?.(`▶ Running SQL query...`);

    // Simulate query execution
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock result
    setQueryResult([
      { id: "abc-123", task: "Анализ стартапа", status: "complete", created_at: "2024-01-15" },
      { id: "def-456", task: "Инвестиционный анализ", status: "running", created_at: "2024-01-14" },
      { id: "ghi-789", task: "Стратегия роста", status: "complete", created_at: "2024-01-13" },
    ]);

    onLog?.(`✓ Query completed. 3 rows returned.`);
    setIsRunning(false);
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Tables */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Tables
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto py-2">
          {tables.map((table) => (
            <div key={table.name}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTable(table.name);
                  setExpandedTable(expandedTable === table.name ? null : table.name);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                  selectedTable === table.name
                    ? "bg-violet-600/20 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                {expandedTable === table.name ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Table className="h-4 w-4" />
                <span className="flex-1 text-left truncate">{table.name}</span>
                <Badge variant="outline" className="text-xs">
                  {table.rowCount}
                </Badge>
              </button>

              {expandedTable === table.name && (
                <div className="pl-8 py-1 space-y-0.5">
                  {table.columns.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500"
                    >
                      {col.isPrimary && <span className="text-amber-400">🔑</span>}
                      <span className="text-slate-300">{col.name}</span>
                      <span className="text-slate-600">{col.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <Button variant="outline" size="sm" className="w-full border-slate-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Table View / Schema */}
        {selectedTableData && (
          <div className="border-b border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-violet-400" />
                <span className="font-medium text-white">{selectedTableData.name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedTableData.rowCount} rows
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-slate-400">
                  <Eye className="h-4 w-4 mr-1" />
                  View Data
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-slate-400">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit Schema
                </Button>
              </div>
            </div>

            {/* Schema Table */}
            <div className="overflow-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-slate-900 sticky top-0">
                  <tr>
                    <th className="text-left text-xs text-slate-400 font-medium px-4 py-2">Column</th>
                    <th className="text-left text-xs text-slate-400 font-medium px-4 py-2">Type</th>
                    <th className="text-left text-xs text-slate-400 font-medium px-4 py-2">Nullable</th>
                    <th className="text-left text-xs text-slate-400 font-medium px-4 py-2">Key</th>
                    <th className="text-right text-xs text-slate-400 font-medium px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTableData.columns.map((col) => (
                    <tr key={col.name} className="border-t border-slate-800 hover:bg-slate-900/50">
                      <td className="px-4 py-2 text-white">{col.name}</td>
                      <td className="px-4 py-2 text-slate-400 font-mono text-xs">{col.type}</td>
                      <td className="px-4 py-2">
                        {col.nullable ? (
                          <span className="text-slate-500">YES</span>
                        ) : (
                          <span className="text-slate-300">NO</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {col.isPrimary && (
                          <Badge className="bg-amber-600 text-xs">PK</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SQL Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
            <span className="text-xs text-slate-400 font-medium">SQL Editor</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={runQuery}
                disabled={isRunning}
                className="h-7 bg-emerald-600 hover:bg-emerald-500"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Execute
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4">
            <Textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="h-32 bg-slate-950 border-slate-700 font-mono text-sm resize-none"
              placeholder="SELECT * FROM ..."
            />
          </div>

          {/* Results */}
          {queryResult && (
            <div className="border-t border-slate-800">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900">
                <span className="text-xs text-slate-400">
                  Results: {queryResult.length} rows
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-slate-400">
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
              <div className="overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 sticky top-0">
                    <tr>
                      {Object.keys(queryResult[0] || {}).map((key) => (
                        <th
                          key={key}
                          className="text-left text-xs text-slate-400 font-medium px-4 py-2"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.map((row, i) => (
                      <tr key={i} className="border-t border-slate-800 hover:bg-slate-900/50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-4 py-2 text-slate-300">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
