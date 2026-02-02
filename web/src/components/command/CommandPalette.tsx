"use client";

import { useEffect, useState, useMemo } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useSessionStore } from "@/stores/sessionStore";
import {
  Plus,
  Search,
  Download,
  GitCompare,
  Copy,
  RefreshCw,
  Edit,
  Settings,
  DollarSign,
  HelpCircle,
  FileText,
  ArrowRight,
  Brain,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  category: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette() {
  const { commandPaletteOpen, commandQuery, setCommandQuery, closeCommandPalette } = useUIStore();
  const { createSession, currentSession } = useSessionStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(() => [
    // Сессии
    {
      id: "new-session",
      label: "Новая сессия анализа",
      description: "Создать новую сессию",
      shortcut: "N",
      category: "Сессии",
      icon: <Plus className="h-4 w-4" />,
      action: () => {
        createSession();
        closeCommandPalette();
      },
    },
    {
      id: "search-sessions",
      label: "Поиск сессий",
      description: "Найти сессии по ключевому слову",
      shortcut: "/",
      category: "Сессии",
      icon: <Search className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "compare-sessions",
      label: "Сравнить сессии",
      description: "Сравнение бок о бок",
      shortcut: "C",
      category: "Сессии",
      icon: <GitCompare className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    // Действия
    {
      id: "export",
      label: "Экспорт текущей сессии",
      description: "Экспорт в MD, PDF, JSON, CSV",
      shortcut: "E",
      category: "Действия",
      icon: <Download className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "duplicate",
      label: "Дублировать сессию",
      description: "Клонировать с изменениями",
      shortcut: "D",
      category: "Действия",
      icon: <Copy className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "rerun",
      label: "Перезапустить анализ",
      description: "Тот же ввод, новый запуск",
      shortcut: "R",
      category: "Действия",
      icon: <RefreshCw className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    // Настройки
    {
      id: "edit-prompts",
      label: "Редактировать промпты",
      description: "Настроить системные промпты",
      shortcut: "P",
      category: "Настройки",
      icon: <Edit className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "thinking-patterns",
      label: "Паттерны мышления",
      description: "Добавить/удалить паттерны",
      shortcut: "T",
      category: "Настройки",
      icon: <Brain className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "agent-settings",
      label: "Настройки агентов",
      description: "Модели, температура",
      shortcut: "A",
      category: "Настройки",
      icon: <Settings className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "cost-dashboard",
      label: "Панель расходов",
      description: "Использование и затраты",
      shortcut: "$",
      category: "Настройки",
      icon: <DollarSign className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    // Навигация
    {
      id: "go-input",
      label: "К вводу задачи",
      description: "Перейти к вводу",
      shortcut: "⌘I",
      category: "Навигация",
      icon: <ArrowRight className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "go-synthesis",
      label: "К синтезу",
      description: "Перейти к итогам",
      shortcut: "⌘S",
      category: "Навигация",
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    // Справка
    {
      id: "shortcuts",
      label: "Горячие клавиши",
      description: "Показать все сочетания",
      shortcut: "?",
      category: "Справка",
      icon: <HelpCircle className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
    {
      id: "docs",
      label: "Документация",
      description: "Открыть документацию",
      shortcut: "F1",
      category: "Справка",
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        closeCommandPalette();
      },
    },
  ], [createSession, closeCommandPalette]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!commandQuery.trim()) return commands;
    const query = commandQuery.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query)
    );
  }, [commands, commandQuery]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Keyboard navigation
  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCommandPalette();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filteredCommands, selectedIndex, closeCommandPalette]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [commandQuery]);

  if (!commandPaletteOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeCommandPalette}
      />

      {/* Palette */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Введите команду или поиск..."
              className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-sm"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              autoFocus
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-600 bg-slate-800 px-1.5 font-mono text-xs text-slate-400">
              Esc
            </kbd>
          </div>

          {/* Commands */}
          <div className="max-h-80 overflow-y-auto py-2">
            {Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-xs text-slate-500 uppercase tracking-wider">
                  {category}
                </div>
                {cmds.map((cmd) => {
                  const currentIndex = flatIndex++;
                  const isSelected = currentIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-left",
                        isSelected ? "bg-slate-800" : "hover:bg-slate-800/50"
                      )}
                    >
                      <span className={cn("text-slate-400", isSelected && "text-violet-400")}>
                        {cmd.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-sm", isSelected ? "text-white" : "text-slate-300")}>
                          {cmd.label}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{cmd.description}</div>
                      </div>
                      {cmd.shortcut && (
                        <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-slate-600 bg-slate-800 px-1.5 font-mono text-xs text-slate-400">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="px-4 py-8 text-center text-slate-500">
                Команды не найдены
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>Введите для поиска...</span>
            <div className="flex items-center gap-2">
              <span>↑↓ Навигация</span>
              <span>↵ Выбор</span>
              <span>Esc Закрыть</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
