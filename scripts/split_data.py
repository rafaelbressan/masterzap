#!/usr/bin/env python3
"""Split messages.json into per-date chunks for lazy loading."""

import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

from message_schema import (
    provenance_of, validate_messages, validate_provenance, validate_sources,
)

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CONVERSATIONS_DIR = DATA_DIR / "conversations"
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


def load_extra_conversations():
    """Load the conversations built from the IPJ report (data/conversations/).

    Each file already carries its own index, built by scripts/build_ipj_data.py.
    Returns a list of (conv_id, data, index) tuples; empty when the directory
    does not exist, so the Martha-only build keeps working unchanged.
    """
    if not CONVERSATIONS_DIR.is_dir():
        return []

    loaded = []
    for path in sorted(CONVERSATIONS_DIR.glob("*.json")):
        with open(path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        loaded.append((path.stem, payload, payload["index"]))
        print(f"Loading conversations/{path.name}...")
    return loaded


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


# Martha's 65k messages need the 80-char cap to keep the index at ~5 MB, and her
# messages are short enough that it costs nothing. The IPJ conversations are the
# opposite: a few hundred messages, but each note runs several hundred characters,
# so truncating would make most of their text unsearchable. Index those in full —
# 615 messages of full text is a rounding error next to Martha's index.
FULL_TEXT_INDEX_MAX_MESSAGES = 5000


def build_search_index(messages, max_content_len=80):
    """Build lightweight search index, truncating content only when it pays off."""
    if len(messages) <= FULL_TEXT_INDEX_MAX_MESSAGES:
        max_content_len = None
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
            "content": content if max_content_len is None else content[:max_content_len],
        })
    return entries


def write_json(path, data):
    """Write JSON to file, creating directories as needed."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


def load_sources():
    """data/sources.json, by id — every document a message can cite."""
    with open(DATA_DIR / "sources.json", "r", encoding="utf-8") as f:
        sources = json.load(f)["sources"]
    return sources, {src["id"]: src for src in sources}


def document_of(src):
    """A source that is a file in the repository, in the shape the site reads.

    The path is the repository's; the site does not serve the PDF. Say where it is.
    """
    if not src.get("file"):
        return None
    return {
        "file": src["file"],
        "url": src.get("url"),
        "download": src.get("download"),
        "sha256": src.get("sha256"),
        "pages": src.get("pages"),
    }


CALL_RE_PT = re.compile(r"^Chamada de (voz|v[ií]deo)(?: — duração (\d{1,2}:\d{2}))?( perdida)?", re.I)
CALL_RE_EN = re.compile(r"^(Missed )?(Voice|Video) call(?:, (\d+) (min|sec)|, (No answer)|, (Ended)|, (Tap to call back))?", re.I)


def describe_call(msg):
    """One call as the calls screen needs it: direction, kind, how it ended, how long.

    The Martha export writes calls in English ("Voice call, 3 min", "Missed
    video call, Tap to call back", "Voice call, No answer"); the police report
    in Portuguese ("Chamada de voz — duração 02:49", "Chamada de voz perdida").
    Both become the same record. Returns None for a line that is not a call.
    """
    text = (msg.get("content") or "").strip()
    kind, status, duration = None, None, None
    m = CALL_RE_PT.match(text)
    if m:
        kind = "video" if m.group(1).lower().startswith("v") and "d" in m.group(1).lower() else "voice"
        duration = m.group(2)
        status = "missed" if m.group(3) else ("completed" if duration else "ended")
    else:
        m = CALL_RE_EN.match(text)
        if not m:
            return None
        kind = m.group(2).lower()
        if m.group(1) or m.group(7):
            status = "missed"
        elif m.group(5):
            status = "no_answer"
        elif m.group(3):
            status = "completed"
            duration = f"{m.group(3)} {'min' if m.group(4).lower().startswith('min') else 's'}"
        else:
            status = "ended"
    return {
        "kind": kind,
        "status": status,
        "duration": duration,
        "outgoing": msg.get("sender") == "DV",
    }


def normalise_date_range(date_range):
    """Always {"start": ..., "end": ...}.

    data/messages.json uses that shape; the IPJ builder once emitted a pair.
    Consumers should not have to know which source a conversation came from.
    """
    if isinstance(date_range, dict):
        return {"start": date_range["start"], "end": date_range["end"]}
    start, end = date_range
    return {"start": start, "end": end}


def split_conversation(conv_id, data, index):
    """Write index, search index and per-date chunks for one conversation.

    Returns the entry describing it for conversations.json.
    """
    metadata = data["metadata"]
    messages = data["messages"]
    source = SOURCES[metadata["source_id"]]
    conv_dir = OUTPUT_DIR / conv_id

    by_date = group_messages_by_date(messages)
    dates = sorted(by_date.keys())

    write_json(conv_dir / "index.json", index)

    search_index = build_search_index(messages)
    write_json(conv_dir / "search-index.json", search_index)
    size_mb = os.path.getsize(conv_dir / "search-index.json") / (1024 * 1024)

    for date in dates:
        write_json(conv_dir / f"{date}.json", {"messages": by_date[date]})

    for msg in messages:
        if msg["type"] != "call":
            continue
        call = describe_call(msg)
        if call:
            CALLS.append({
                "conversation_id": conv_id,
                "message_id": msg["id"],
                "date": msg["date"],
                "timestamp": msg["timestamp"],
                **call,
            })

    print(f"{conv_id}: {len(messages)} messages, {len(dates)} dates, "
          f"search index {size_mb:.1f} MB")

    type_counts = Counter(msg["type"] for msg in messages)

    last_msg = messages[-1] if messages else None
    other = [p for p in metadata["participants"] if p != "DV"]
    entry = {
        "id": conv_id,
        "participants": metadata["participants"],
        # The other side, by name, so nobody has to know "the one that is not DV".
        "contact": other[0] if other else metadata["participants"][0],
        "date_range": normalise_date_range(metadata["date_range"]),
        "total_messages": metadata["total_messages"],
        # Drives the "Mídias, links e documentos" count in the contact drawer.
        "media_counts": {
            "images": type_counts["image"],
            "videos": type_counts["video"],
            "documents": type_counts["document"],
        },
        "last_message": {
            "content": last_msg["content"][:80],
            "timestamp": last_msg["timestamp"],
            "sender": last_msg["sender"],
        } if last_msg else None,
    }
    for key in ("phone", "saved_as", "note"):
        if metadata.get(key):
            entry[key] = metadata[key]
    # Provenance: the conversation's default source and seal. A message that
    # came from somewhere else carries its own source_id/verification.
    entry["source"] = source["titulo"]
    entry["source_id"] = source["id"]
    entry["verification"] = metadata["verification"]
    seals = Counter(provenance_of(m, metadata)[1] for m in messages)
    if len(seals) > 1:
        entry["verification_counts"] = dict(seals)
    document = document_of(source)
    if document:
        entry["source_document"] = document
    return entry


SOURCES = {}
CALLS = []


def check(problems):
    """Fail the build on any schema problem, printing the first few."""
    if not problems:
        return
    for problem in problems[:20]:
        print(f"Error: {problem}")
    if len(problems) > 20:
        print(f"... e mais {len(problems) - 20}")
    sys.exit(1)


def main():
    global SOURCES
    source_list, SOURCES = load_sources()
    check(validate_sources(source_list, ROOT))

    data, index = load_source_data()
    sources = [(get_conversation_id(data["metadata"]), data, index)]
    sources.extend(load_extra_conversations())
    print()

    for conv_id, payload, _ in sources:
        check(validate_messages(payload["messages"], conv_id)
              + validate_provenance(payload["metadata"], payload["messages"], SOURCES, conv_id))

    # Two sources sharing an id would overwrite each other's chunks in
    # public/data/<id>/ and produce a duplicate entry in conversations.json.
    seen = set()
    for conv_id, _, _ in sources:
        if conv_id in seen:
            print(f"Error: duplicate conversation id '{conv_id}'")
            sys.exit(1)
        seen.add(conv_id)

    entries = [split_conversation(*source) for source in sources]

    # Most recent conversation first, the way WhatsApp orders the chat list.
    entries.sort(key=lambda e: e["last_message"]["timestamp"] if e["last_message"] else "",
                 reverse=True)
    # The sources the conversations cite, for the seal and the contact drawer.
    public_sources = {
        sid: {k: src.get(k) for k in ("kind", "titulo", "orgao_ou_veiculo", "data", "url", "archive_url")}
        for sid, src in SOURCES.items()
    }
    write_json(OUTPUT_DIR / "conversations.json", {"conversations": entries, "sources": public_sources})

    # Every call, newest first — the calls screen reads this one file.
    CALLS.sort(key=lambda c: (c["timestamp"] or c["date"]), reverse=True)
    write_json(OUTPUT_DIR / "calls.json", {"calls": CALLS})
    print(f"calls.json: {len(CALLS)} calls")

    total = sum(e["total_messages"] for e in entries)
    print(f"\nDone! {len(entries)} conversations, {total} messages in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
