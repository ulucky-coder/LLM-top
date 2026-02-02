#!/usr/bin/env python3
"""
LLM-top: Telegram Bot Runner
"""

import sys
import os

# Добавляем путь к проекту
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.interfaces.telegram_bot import create_bot

if __name__ == "__main__":
    print("🤖 Starting LLM-top Telegram Bot...")
    print("📡 Make sure API server is running on http://localhost:8000")
    print()

    try:
        bot = create_bot()
        print("✅ Bot initialized successfully")
        print("🚀 Bot is running! Press Ctrl+C to stop.")
        bot.run()
    except KeyboardInterrupt:
        print("\n👋 Bot stopped")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
