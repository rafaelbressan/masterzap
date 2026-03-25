#!/usr/bin/env python3
"""Split messages.json into per-date chunks for lazy loading."""

import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "public" / "data"


def slugify(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    s = name.lower().strip()
    s = re.sub(r"[àáâãäå]", "a", s)
    s = re.sub(r"[èéêë]", "e", s)
    s = re.sub(r"[ìíîï]", "i", s)
    s = re.sub(r"[òóôõö]", "o", s)
    s = re.sub(r"[ùúûü]", "u", s)
    s = re.sub(r"[ç]", "c", s)
    s = re.sub(r"[ñ]", "n", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def load_source_data():
    """Load messages.json and index.json."""
    messages_path = DATA_DIR / "messages.json"
    index_path = DATA_DIR / "index.json"

    if not messages_path.exists():
        print(f"Error: {messages_path} not found")
        sys.exit(1)
    if not index_path.exists():
        print(f"Error: {index_path} not found")
        sys.exit(1)

    print("Loading messages.json...")
    with open(messages_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("Loading index.json...")
    with open(index_path, "r", encoding="utf-8") as f:
        index = json.load(f)

    return data, index


def get_conversation_id(metadata):
    """Derive conversation ID from participants (excluding DV)."""
    participants = metadata["participants"]
    other = [p for p in participants if p != "DV"]
    if other:
        return slugify(other[0])
    return slugify("-".join(participants))


def group_messages_by_date(messages):
    """Group messages by their date field."""
    by_date = defaultdict(list)
    for msg in messages:
        by_date[msg["date"]].append(msg)
    return by_date


def build_search_index(messages, max_content_len=80):
    """Build lightweight search index with truncated content."""
    entries = []
    for msg in messages:
        if msg["type"] == "system":
            continue
        content = msg.get("content", "") or ""
        if not content.strip():
            continue
        entries.append({
            "id": msg["id"],
            "date": msg["date"],
            "sender": msg["sender"],
            "content": content[:max_content_len],
        })
    return entries


def write_json(path, data):
    """Write JSON to file, creating directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


def main():
    data, index = load_source_data()
    metadata = data["metadata"]
    messages = data["messages"]
    conv_id = get_conversation_id(metadata)
    conv_dir = OUTPUT_DIR / conv_id

    print(f"Conversation ID: {conv_id}")
    print(f"Total messages: {len(messages)}")
    print(f"Output directory: {conv_dir}")

    # Group messages by date
    by_date = group_messages_by_date(messages)
    dates = sorted(by_date.keys())
    print(f"Dates: {len(dates)}")

    # 1. Write conversations.json
    last_msg = messages[-1] if messages else None
    conversations = {
        "conversations": [
            {
                "id": conv_id,
                "participants": metadata["participants"],
                "date_range": metadata["date_range"],
                "total_messages": metadata["total_messages"],
                "last_message": {
                    "content": last_msg["content"][:80] if last_msg else "",
                    "timestamp": last_msg["timestamp"] if last_msg else "",
                    "sender": last_msg["sender"] if last_msg else "",
                } if last_msg else None,
            }
        ]
    }
    write_json(OUTPUT_DIR / "conversations.json", conversations)
    print("  -> conversations.json")

    # 2. Write per-conversation index.json (same structure as source index)
    write_json(conv_dir / "index.json", index)
    print(f"  -> {conv_id}/index.json")

    # 3. Write search-index.json
    search_index = build_search_index(messages)
    write_json(conv_dir / "search-index.json", search_index)
    size_mb = os.path.getsize(conv_dir / "search-index.json") / (1024 * 1024)
    print(f"  -> {conv_id}/search-index.json ({size_mb:.1f} MB, {len(search_index)} entries)")

    # 4. Write per-date chunk files
    for date in dates:
        day_messages = by_date[date]
        write_json(conv_dir / f"{date}.json", {"messages": day_messages})

    print(f"  -> {len(dates)} date chunk files")
    print(f"\nDone! Output in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
