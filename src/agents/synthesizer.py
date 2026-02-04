"""
LLM-top: Synthesizer
Компонент для синтеза результатов всех агентов
"""

import re
import json
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage

from src.models.state import AgentAnalysis, AgentCritique, SynthesisResult
from src.prompts.agent_prompts import get_synthesis_prompt
from src.config import get_settings


class Synthesizer:
    """Синтезатор результатов анализа"""

    def __init__(self):
        settings = get_settings()
        # Используем Claude как главного интегратора
        self.llm = ChatAnthropic(
            model=settings.claude_model,
            temperature=0.5,  # Меньше креативности для синтеза
            max_tokens=settings.max_tokens,
            api_key=settings.anthropic_api_key,
        )

    async def synthesize(
        self,
        task: str,
        analyses: list[AgentAnalysis],
        critiques: list[AgentCritique],
    ) -> SynthesisResult:
        """Синтезировать результаты в единый отчёт"""

        # Форматируем анализы
        analyses_text = self._format_analyses(analyses)
        critiques_text = self._format_critiques(critiques)

        system_prompt, user_prompt = get_synthesis_prompt(
            task, analyses_text, critiques_text
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        response = await self.llm.ainvoke(messages)
        content = response.content

        # Пробуем распарсить как JSON
        json_data = self._try_parse_json(content)

        if json_data:
            # Извлекаем из JSON структуры
            return SynthesisResult(
                summary=self._extract_summary_from_json(json_data, content),
                conclusions=self._extract_conclusions_from_json(json_data, content),
                recommendations=self._extract_recommendations_from_json(json_data, content),
                formalized_result=self._extract_formalized_from_json(json_data, content),
                consensus_level=self._calculate_consensus(critiques),
                dissenting_opinions=self._extract_dissenting_from_json(json_data, content),
            )
        else:
            # Fallback на Markdown парсинг
            return SynthesisResult(
                summary=self._extract_summary(content),
                conclusions=self._extract_conclusions(content),
                recommendations=self._extract_recommendations(content),
                formalized_result=self._extract_formalized(content),
                consensus_level=self._calculate_consensus(critiques),
                dissenting_opinions=self._extract_dissenting(content),
            )

    def _try_parse_json(self, text: str) -> dict | None:
        """Попробовать распарсить JSON из ответа"""
        # Ищем JSON в code block
        json_match = re.search(r"```(?:json)?\s*\n?(\{.*?\})\s*\n?```", text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Пробуем весь текст как JSON
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        return None

    def _extract_summary_from_json(self, data: dict, fallback_text: str) -> str:
        """Извлечь резюме из JSON"""
        # Пробуем разные ключи
        for key in ["executive_summary", "summary", "резюме", "report.summary"]:
            if "." in key:
                parts = key.split(".")
                val = data
                for p in parts:
                    val = val.get(p, {}) if isinstance(val, dict) else None
                if val:
                    return str(val)
            elif key in data:
                return str(data[key])

        # Если есть report, собираем из него
        if "report" in data and isinstance(data["report"], dict):
            report = data["report"]
            parts = []
            if "executive_summary" in report:
                parts.append(report["executive_summary"])
            if "methodology" in report:
                parts.append(f"Методология: {report['methodology']}")
            return "\n\n".join(parts) if parts else fallback_text[:500]

        return fallback_text[:500]

    def _extract_conclusions_from_json(self, data: dict, fallback_text: str) -> list[dict]:
        """Извлечь выводы из JSON"""
        conclusions = []

        # Пробуем разные ключи
        for key in ["conclusions", "conclusions_table", "выводы", "findings"]:
            if key in data and isinstance(data[key], list):
                for item in data[key]:
                    if isinstance(item, dict):
                        conclusions.append({
                            "conclusion": item.get("conclusion", item.get("finding", item.get("вывод", str(item)))),
                            "probability": item.get("probability", item.get("вероятность", "N/A")),
                            "falsification_condition": item.get("falsification_condition", item.get("falsification", "")),
                        })
                    elif isinstance(item, str):
                        conclusions.append({
                            "conclusion": item,
                            "probability": "N/A",
                            "falsification_condition": "",
                        })
                return conclusions

        # Fallback на Markdown парсинг
        return self._extract_conclusions(fallback_text)

    def _extract_recommendations_from_json(self, data: dict, fallback_text: str) -> list[dict]:
        """Извлечь рекомендации из JSON"""
        recommendations = []

        for key in ["recommendations", "рекомендации", "actions", "next_steps"]:
            if key in data and isinstance(data[key], list):
                for item in data[key]:
                    if isinstance(item, dict):
                        recommendations.append({
                            "recommendation": item.get("recommendation", item.get("action", item.get("рекомендация", str(item)))),
                            "pros": item.get("pros", item.get("advantages", item.get("за", ""))),
                            "cons": item.get("cons", item.get("disadvantages", item.get("против", ""))),
                        })
                    elif isinstance(item, str):
                        recommendations.append({
                            "recommendation": item,
                            "pros": "",
                            "cons": "",
                        })
                return recommendations

        return self._extract_recommendations(fallback_text)

    def _extract_formalized_from_json(self, data: dict, fallback_text: str) -> str:
        """Извлечь формализованный итог из JSON"""
        for key in ["formalized_result", "formulas", "formula", "mathematical_model", "model"]:
            if key in data:
                val = data[key]
                if isinstance(val, str):
                    return val
                elif isinstance(val, dict):
                    parts = []
                    if "formula" in val:
                        parts.append(f"Формула: {val['formula']}")
                    if "variables" in val:
                        parts.append(f"Переменные: {val['variables']}")
                    if "calculation" in val:
                        parts.append(f"Расчёт: {val['calculation']}")
                    return "\n".join(parts)
                elif isinstance(val, list):
                    return "\n".join(str(f) for f in val)

        return self._extract_formalized(fallback_text)

    def _extract_dissenting_from_json(self, data: dict, fallback_text: str) -> list[str]:
        """Извлечь разногласия из JSON"""
        for key in ["dissenting_opinions", "disagreements", "разногласия", "conflicts"]:
            if key in data and isinstance(data[key], list):
                return [str(item) for item in data[key]]

        return self._extract_dissenting(fallback_text)

    def _format_analyses(self, analyses: list[AgentAnalysis]) -> str:
        """Форматировать анализы для промпта"""
        result = []
        for a in analyses:
            result.append(f"### {a.agent_name} (уверенность: {a.confidence:.0%})\n")
            result.append(a.analysis)
            result.append("\n---\n")
        return "\n".join(result)

    def _format_critiques(self, critiques: list[AgentCritique]) -> str:
        """Форматировать критики для промпта"""
        result = []
        for c in critiques:
            result.append(f"### {c.critic_name} -> {c.target_name} (оценка: {c.score}/10)\n")
            result.append(c.critique)
            result.append("\n---\n")
        return "\n".join(result)

    def _extract_summary(self, text: str) -> str:
        """Извлечь резюме"""
        # Способ 1: Секция "Резюме"
        match = re.search(r"##\s*Резюме\s*\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
        if match:
            return match.group(1).strip()

        # Способ 2: "Executive Summary" или "Исполнительное резюме"
        match = re.search(
            r"(?:##\s*)?(?:Executive\s+Summary|Исполнительное\s+резюме)\s*\n(.*?)(?=\n##|\Z)",
            text,
            re.DOTALL | re.IGNORECASE
        )
        if match:
            return match.group(1).strip()

        # Способ 3: Первые абзацы до первого заголовка
        first_section = re.match(r"^(.*?)(?=\n##)", text, re.DOTALL)
        if first_section and first_section.group(1).strip():
            return first_section.group(1).strip()

        # Fallback: первые 500 символов
        return text[:500]

    def _extract_conclusions(self, text: str) -> list[dict]:
        """Извлечь выводы из таблицы"""
        conclusions = []

        # Способ 1: Ищем Markdown таблицу после "Таблица выводов"
        table_match = re.search(
            r"##\s*Таблица выводов\s*\n+\|[^\n]+\|\s*\n\|[-|\s]+\|\s*\n((?:\|[^\n]+\|\s*\n?)+)",
            text,
            re.IGNORECASE
        )
        if table_match:
            rows = table_match.group(1).strip().split("\n")
            for row in rows:
                if not row.strip() or row.strip().startswith("|--"):
                    continue
                cells = [c.strip() for c in row.split("|")]
                cells = [c for c in cells if c]  # Убираем пустые
                if len(cells) >= 2:
                    conclusions.append({
                        "conclusion": cells[0],
                        "probability": cells[1] if len(cells) > 1 else "N/A",
                        "falsification_condition": cells[2] if len(cells) > 2 else "",
                    })

        # Способ 2: Ищем нумерованный список выводов
        if not conclusions:
            section_match = re.search(
                r"(?:##\s*(?:Таблица\s+)?[Вв]ыводы?|##\s*Conclusions?)\s*\n(.*?)(?=\n##|\Z)",
                text,
                re.DOTALL | re.IGNORECASE
            )
            if section_match:
                items = re.findall(
                    r"(?:^|\n)\s*(?:\d+[\.\)]\s*|\*\s*|-\s*)(.+?)(?:\s*[\(\[]?\s*(\d+%?)\s*[\)\]]?)?(?:\s*[-–—]\s*[Фф]альсификация:\s*(.+?))?(?=\n|$)",
                    section_match.group(1)
                )
                for item in items:
                    if item[0].strip():
                        conclusions.append({
                            "conclusion": item[0].strip(),
                            "probability": item[1] if item[1] else "N/A",
                            "falsification_condition": item[2] if len(item) > 2 else "",
                        })

        # Способ 3: Извлекаем ключевые фразы как выводы
        if not conclusions:
            key_phrases = re.findall(
                r"(?:ключевой вывод|главный вывод|основной вывод|вывод):\s*(.+?)(?:\.|$)",
                text,
                re.IGNORECASE
            )
            for phrase in key_phrases[:5]:
                conclusions.append({
                    "conclusion": phrase.strip(),
                    "probability": "N/A",
                    "falsification_condition": "",
                })

        return conclusions

    def _extract_recommendations(self, text: str) -> list[dict]:
        """Извлечь рекомендации из таблицы"""
        recommendations = []

        # Способ 1: Markdown таблица после "Рекомендации"
        table_match = re.search(
            r"##\s*Рекомендации\s*\n+\|[^\n]+\|\s*\n\|[-|\s]+\|\s*\n((?:\|[^\n]+\|\s*\n?)+)",
            text,
            re.IGNORECASE
        )
        if table_match:
            rows = table_match.group(1).strip().split("\n")
            for row in rows:
                if not row.strip() or row.strip().startswith("|--"):
                    continue
                cells = [c.strip() for c in row.split("|")]
                cells = [c for c in cells if c]  # Убираем пустые
                if len(cells) >= 1:
                    recommendations.append({
                        "recommendation": cells[0],
                        "pros": cells[1] if len(cells) > 1 else "",
                        "cons": cells[2] if len(cells) > 2 else "",
                    })

        # Способ 2: Ищем секцию "Рекомендации" и нумерованный/маркированный список
        if not recommendations:
            section_match = re.search(
                r"##\s*Рекомендации\s*\n(.*?)(?=\n##|\Z)",
                text,
                re.DOTALL | re.IGNORECASE
            )
            if section_match:
                items = re.findall(
                    r"(?:^|\n)\s*(?:\d+[\.\)]\s*|\*\s*|-\s*)([^\n]+)",
                    section_match.group(1)
                )
                for item in items:
                    if item.strip() and not item.strip().startswith("|"):
                        # Пытаемся разделить на рекомендацию и описание
                        parts = re.split(r"\s*[-–—:]\s*", item, maxsplit=2)
                        recommendations.append({
                            "recommendation": parts[0].strip(),
                            "pros": parts[1] if len(parts) > 1 else "",
                            "cons": parts[2] if len(parts) > 2 else "",
                        })

        # Способ 3: Ищем фразы "рекомендуется", "следует"
        if not recommendations:
            rec_phrases = re.findall(
                r"(?:рекомендуется|следует|необходимо|важно)\s+(.+?)(?:\.|$)",
                text,
                re.IGNORECASE
            )
            for phrase in rec_phrases[:5]:
                recommendations.append({
                    "recommendation": phrase.strip(),
                    "pros": "",
                    "cons": "",
                })

        return recommendations

    def _extract_formalized(self, text: str) -> str:
        """Извлечь формализованный итог"""
        # Способ 1: Секция "Формализованный итог"
        match = re.search(
            r"##\s*Формализованный итог\s*\n(.*?)(?=\n##|\Z)",
            text,
            re.DOTALL | re.IGNORECASE
        )
        if match:
            return match.group(1).strip()

        # Способ 2: Ищем блок кода с формулой
        code_match = re.search(
            r"```(?:math|latex)?\s*\n(.*?)\n```",
            text,
            re.DOTALL
        )
        if code_match:
            return code_match.group(1).strip()

        # Способ 3: Ищем математические выражения
        formula_match = re.search(
            r"(?:формула|расчёт|модель):\s*\n?(.*?)(?:\n\n|\Z)",
            text,
            re.DOTALL | re.IGNORECASE
        )
        if formula_match:
            return formula_match.group(1).strip()

        # Способ 4: Ищем строки с математическими символами
        math_lines = re.findall(
            r"^.*[=×÷±∑∏√∫≈≠≤≥].*$",
            text,
            re.MULTILINE
        )
        if math_lines:
            return "\n".join(math_lines[:5])

        return ""

    def _extract_dissenting(self, text: str) -> list[str]:
        """Извлечь разногласия"""
        match = re.search(
            r"##\s*Разногласия\s*\n(.*?)(?=\n##|\Z)",
            text,
            re.DOTALL | re.IGNORECASE
        )
        if match:
            items = re.findall(r"[-*]\s*(.+)", match.group(1))
            return [item.strip() for item in items]
        return []

    def _calculate_consensus(self, critiques: list[AgentCritique]) -> float:
        """Рассчитать уровень консенсуса на основе оценок"""
        if not critiques:
            return 0.5
        avg_score = sum(c.score for c in critiques) / len(critiques)
        # Нормализуем к 0-1
        return avg_score / 10
