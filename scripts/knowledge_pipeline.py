#!/usr/bin/env python3
"""
Knowledge Base Pipeline
=======================
Загрузка и обработка источников для Personal Strategic Advisor.

Использование:
    python knowledge_pipeline.py import sources.csv
    python knowledge_pipeline.py process --limit 10
    python knowledge_pipeline.py status
"""

import os
import sys
import csv
import json
import asyncio
import hashlib
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from openai import AsyncOpenAI
from supabase import create_client, Client

# ============================================================
# Configuration
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://daqaxdkyufelexsivywl.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# LLM для обработки контента
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # openai или anthropic

# ============================================================
# Data Classes
# ============================================================

@dataclass
class Source:
    url: str
    category: str
    source_type: str
    title: Optional[str] = None
    author: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None


@dataclass
class ProcessedContent:
    content: str
    summary: str
    key_insights: List[Dict[str, Any]]
    frameworks: List[Dict[str, Any]]
    quotes: List[Dict[str, str]]
    use_cases: List[str]
    related_concepts: List[str]
    language: str


# ============================================================
# Content Fetchers
# ============================================================

async def fetch_article(url: str) -> Optional[str]:
    """Fetch and extract text from article URL."""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBot/1.0)"
            }
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Remove script, style, nav, footer
            for tag in soup(["script", "style", "nav", "footer", "aside", "header"]):
                tag.decompose()

            # Try to find main content
            content = None
            for selector in ["article", "main", ".post-content", ".entry-content", ".content"]:
                elem = soup.select_one(selector)
                if elem:
                    content = elem.get_text(separator="\n", strip=True)
                    break

            if not content:
                content = soup.get_text(separator="\n", strip=True)

            # Clean up
            lines = [line.strip() for line in content.split("\n") if line.strip()]
            content = "\n".join(lines)

            # Limit length
            if len(content) > 50000:
                content = content[:50000] + "..."

            return content

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None


async def fetch_youtube_transcript(url: str) -> Optional[str]:
    """Fetch YouTube video transcript."""
    try:
        # Extract video ID
        parsed = urlparse(url)
        if "youtube.com" in parsed.netloc:
            video_id = parsed.query.split("v=")[1].split("&")[0] if "v=" in parsed.query else None
        elif "youtu.be" in parsed.netloc:
            video_id = parsed.path.strip("/")
        else:
            return None

        if not video_id:
            return None

        # Try youtube-transcript-api
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en', 'ru'])
            transcript = " ".join([t['text'] for t in transcript_list])
            return transcript
        except ImportError:
            print("youtube-transcript-api not installed. Run: pip install youtube-transcript-api")
            return None
        except Exception as e:
            print(f"Could not get transcript for {video_id}: {e}")
            return None

    except Exception as e:
        print(f"Error processing YouTube URL {url}: {e}")
        return None


async def fetch_content(url: str, source_type: str) -> Optional[str]:
    """Fetch content based on source type."""
    if source_type == "video":
        if "youtube.com" in url or "youtu.be" in url:
            return await fetch_youtube_transcript(url)
        return None
    elif source_type in ["article", "paper", "thread"]:
        return await fetch_article(url)
    elif source_type == "book":
        # Books usually need manual summary
        return None
    return None


# ============================================================
# LLM Processing
# ============================================================

EXTRACTION_PROMPT = """Analyze this content and extract structured knowledge.

CONTENT:
{content}

CATEGORY: {category}

Extract the following in JSON format:

{{
  "summary": "2-3 paragraph summary of the key ideas",
  "key_insights": [
    {{"insight": "specific insight", "importance": "high/medium/low"}}
  ],
  "frameworks": [
    {{"name": "framework name", "description": "what it is", "when_to_use": "when to apply"}}
  ],
  "quotes": [
    {{"quote": "memorable quote", "context": "why it matters"}}
  ],
  "use_cases": ["when to apply this knowledge"],
  "related_concepts": ["related ideas, frameworks, thinkers"],
  "language": "en or ru"
}}

Focus on actionable insights. Be specific, not generic.
If this is about a specific thinker (genius_mind category), capture their mental models and decision-making patterns.
"""


async def process_with_openai(content: str, category: str) -> Optional[ProcessedContent]:
    """Process content using OpenAI."""
    try:
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert at extracting and structuring knowledge. Always respond with valid JSON."},
                {"role": "user", "content": EXTRACTION_PROMPT.format(content=content[:30000], category=category)}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        return ProcessedContent(
            content=content,
            summary=result.get("summary", ""),
            key_insights=result.get("key_insights", []),
            frameworks=result.get("frameworks", []),
            quotes=result.get("quotes", []),
            use_cases=result.get("use_cases", []),
            related_concepts=result.get("related_concepts", []),
            language=result.get("language", "en")
        )

    except Exception as e:
        print(f"Error processing with OpenAI: {e}")
        return None


async def process_with_anthropic(content: str, category: str) -> Optional[ProcessedContent]:
    """Process content using Anthropic Claude."""
    try:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": EXTRACTION_PROMPT.format(content=content[:30000], category=category)}
            ]
        )

        # Extract JSON from response
        text = response.content[0].text
        # Find JSON in response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(text[start:end])

            return ProcessedContent(
                content=content,
                summary=result.get("summary", ""),
                key_insights=result.get("key_insights", []),
                frameworks=result.get("frameworks", []),
                quotes=result.get("quotes", []),
                use_cases=result.get("use_cases", []),
                related_concepts=result.get("related_concepts", []),
                language=result.get("language", "en")
            )

    except Exception as e:
        print(f"Error processing with Anthropic: {e}")
        return None

    return None


async def process_content(content: str, category: str) -> Optional[ProcessedContent]:
    """Process content with configured LLM."""
    if LLM_PROVIDER == "anthropic":
        return await process_with_anthropic(content, category)
    return await process_with_openai(content, category)


# ============================================================
# Embeddings
# ============================================================

async def create_embedding(text: str) -> Optional[List[float]]:
    """Create embedding using OpenAI."""
    try:
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)

        # Truncate if too long
        if len(text) > 8000:
            text = text[:8000]

        response = await client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )

        return response.data[0].embedding

    except Exception as e:
        print(f"Error creating embedding: {e}")
        return None


# ============================================================
# Database Operations
# ============================================================

def get_supabase() -> Client:
    """Get Supabase client."""
    if not SUPABASE_KEY:
        raise ValueError("SUPABASE_SERVICE_KEY or SUPABASE_KEY environment variable required")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


async def import_sources(csv_path: str) -> int:
    """Import sources from CSV file."""
    supabase = get_supabase()
    imported = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        # Try to detect delimiter
        sample = f.read(1024)
        f.seek(0)

        delimiter = ','
        if '\t' in sample:
            delimiter = '\t'
        elif '|' in sample:
            delimiter = '|'

        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:
            # Normalize column names
            row = {k.lower().strip(): v.strip() for k, v in row.items() if v}

            url = row.get('url') or row.get('source_url') or row.get('link')
            if not url:
                continue

            category = row.get('category', 'strategy')
            source_type = row.get('type') or row.get('source_type', 'article')
            title = row.get('title') or row.get('name') or url[:100]

            # Check if already exists
            existing = supabase.table('advisor_knowledge').select('id').eq('source_url', url).execute()
            if existing.data:
                print(f"Skipping (exists): {url[:60]}...")
                continue

            # Insert
            data = {
                'source_url': url,
                'source_type': source_type,
                'title': title,
                'category': category,
                'subcategory': row.get('subcategory'),
                'author': row.get('author'),
                'tags': row.get('tags', '').split(',') if row.get('tags') else [],
                'processing_status': 'pending'
            }

            supabase.table('advisor_knowledge').insert(data).execute()
            imported += 1
            print(f"Imported: {title[:50]}...")

    return imported


async def process_pending(limit: int = 10) -> int:
    """Process pending sources."""
    supabase = get_supabase()
    processed = 0

    # Get pending items
    result = supabase.table('advisor_knowledge') \
        .select('*') \
        .eq('processing_status', 'pending') \
        .limit(limit) \
        .execute()

    for item in result.data:
        print(f"\nProcessing: {item['title'][:50]}...")

        # Update status
        supabase.table('advisor_knowledge') \
            .update({'processing_status': 'processing'}) \
            .eq('id', item['id']) \
            .execute()

        try:
            # Fetch content
            content = await fetch_content(item['source_url'], item['source_type'])

            if not content:
                print(f"  Could not fetch content, marking as manual")
                supabase.table('advisor_knowledge') \
                    .update({
                        'processing_status': 'manual_required',
                        'processing_error': 'Could not fetch content automatically'
                    }) \
                    .eq('id', item['id']) \
                    .execute()
                continue

            # Process with LLM
            processed_content = await process_content(content, item['category'])

            if not processed_content:
                raise Exception("LLM processing failed")

            # Create embedding
            embed_text = f"{item['title']} {processed_content.summary} {' '.join(processed_content.related_concepts)}"
            embedding = await create_embedding(embed_text)

            # Update record
            update_data = {
                'content': processed_content.content[:50000],  # Limit storage
                'summary': processed_content.summary,
                'key_insights': processed_content.key_insights,
                'frameworks': processed_content.frameworks,
                'quotes': processed_content.quotes,
                'use_cases': processed_content.use_cases,
                'related_concepts': processed_content.related_concepts,
                'language': processed_content.language,
                'processing_status': 'completed',
                'processed_at': datetime.utcnow().isoformat()
            }

            if embedding:
                update_data['embedding'] = embedding

            supabase.table('advisor_knowledge') \
                .update(update_data) \
                .eq('id', item['id']) \
                .execute()

            processed += 1
            print(f"  ✓ Completed: {len(processed_content.key_insights)} insights, {len(processed_content.frameworks)} frameworks")

        except Exception as e:
            print(f"  ✗ Error: {e}")
            supabase.table('advisor_knowledge') \
                .update({
                    'processing_status': 'failed',
                    'processing_error': str(e)
                }) \
                .eq('id', item['id']) \
                .execute()

    return processed


async def show_status():
    """Show processing status."""
    supabase = get_supabase()

    result = supabase.table('advisor_knowledge') \
        .select('processing_status') \
        .execute()

    stats = {}
    for item in result.data:
        status = item['processing_status']
        stats[status] = stats.get(status, 0) + 1

    print("\n=== Knowledge Base Status ===")
    print(f"Total sources: {len(result.data)}")
    print()
    for status, count in sorted(stats.items()):
        emoji = {
            'pending': '⏳',
            'processing': '🔄',
            'completed': '✅',
            'failed': '❌',
            'manual_required': '📝'
        }.get(status, '•')
        print(f"  {emoji} {status}: {count}")

    # Show categories
    result = supabase.table('advisor_knowledge') \
        .select('category') \
        .eq('processing_status', 'completed') \
        .execute()

    cat_stats = {}
    for item in result.data:
        cat = item['category']
        cat_stats[cat] = cat_stats.get(cat, 0) + 1

    if cat_stats:
        print("\nBy category (completed):")
        for cat, count in sorted(cat_stats.items()):
            print(f"  • {cat}: {count}")


async def add_manual(url: str, category: str, title: str, summary: str, insights: str):
    """Add source manually with summary."""
    supabase = get_supabase()

    # Parse insights (comma-separated)
    key_insights = [{"insight": i.strip(), "importance": "high"} for i in insights.split(",")]

    # Create embedding
    embed_text = f"{title} {summary}"
    embedding = await create_embedding(embed_text)

    data = {
        'source_url': url,
        'source_type': 'book',
        'title': title,
        'category': category,
        'summary': summary,
        'key_insights': key_insights,
        'processing_status': 'completed',
        'processed_at': datetime.utcnow().isoformat()
    }

    if embedding:
        data['embedding'] = embedding

    supabase.table('advisor_knowledge').insert(data).execute()
    print(f"✓ Added: {title}")


# ============================================================
# CLI
# ============================================================

def print_usage():
    print("""
Knowledge Base Pipeline
=======================

Commands:
    python knowledge_pipeline.py import <file.csv>     Import sources from CSV
    python knowledge_pipeline.py process [--limit N]   Process pending sources
    python knowledge_pipeline.py status                Show processing status
    python knowledge_pipeline.py add-manual            Add source manually

CSV format:
    url,category,type,title
    https://example.com/article,strategy,article,Article Title

Categories: strategy, analytics, psychology, genius_mind
Types: article, book, video, paper, thread

Environment variables:
    SUPABASE_URL          Supabase URL
    SUPABASE_SERVICE_KEY  Supabase service key
    OPENAI_API_KEY        OpenAI API key
    LLM_PROVIDER          openai (default) or anthropic
""")


async def main():
    if len(sys.argv) < 2:
        print_usage()
        return

    command = sys.argv[1]

    if command == "import":
        if len(sys.argv) < 3:
            print("Usage: python knowledge_pipeline.py import <file.csv>")
            return
        count = await import_sources(sys.argv[2])
        print(f"\n✓ Imported {count} sources")

    elif command == "process":
        limit = 10
        if "--limit" in sys.argv:
            idx = sys.argv.index("--limit")
            limit = int(sys.argv[idx + 1])
        count = await process_pending(limit)
        print(f"\n✓ Processed {count} sources")

    elif command == "status":
        await show_status()

    elif command == "add-manual":
        print("Add source manually:")
        url = input("URL: ")
        category = input("Category (strategy/analytics/psychology/genius_mind): ")
        title = input("Title: ")
        summary = input("Summary: ")
        insights = input("Key insights (comma-separated): ")
        await add_manual(url, category, title, summary, insights)

    else:
        print_usage()


if __name__ == "__main__":
    asyncio.run(main())
