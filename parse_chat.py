#!/usr/bin/env python3
"""Parse WhatsApp chat export PDF into structured JSON."""

import json
import re
import sys
from collections import OrderedDict
from datetime import datetime

import fitz  # PyMuPDF

PDF_PATH = "ARQ.-02.pdf"
MESSAGES_OUT = "data/messages.json"
INDEX_OUT = "data/index.json"

# Timestamp pattern at the start of each message
# Format: [M/DD/YY, HH:MM:SS] Sender: content
MSG_PATTERN = re.compile(
    r"\[(\d{1,2}/\d{1,2}/\d{2}),\s(\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s(.*)"
)

URL_PATTERN = re.compile(r"https?://[^\s<>\"']+")


def extract_text(pdf_path: str) -> str:
    """Extract all text from the PDF, concatenating pages."""
    doc = fitz.open(pdf_path)
    pages = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


def parse_messages(full_text: str) -> list[dict]:
    """Parse raw text into structured message dicts."""
    lines = full_text.split("\n")
    messages = []
    current = None

    for line in lines:
        line = line.rstrip()
        if not line:
            continue

        match = MSG_PATTERN.match(line)
        if match:
            # Save previous message
            if current is not None:
                messages.append(current)

            date_str, time_str, sender, content = match.groups()
            current = {
                "date_str": date_str,
                "time_str": time_str,
                "sender": sender.strip(),
                "content": content.strip(),
            }
        else:
            # Continuation line — append to current message content
            if current is not None:
                current["content"] += " " + line.strip()

    # Don't forget the last message
    if current is not None:
        messages.append(current)

    return messages


def parse_date(date_str: str) -> str:
    """Convert M/DD/YY to YYYY-MM-DD."""
    dt = datetime.strptime(date_str, "%m/%d/%y")
    return dt.strftime("%Y-%m-%d")


def classify_message(content: str) -> tuple[str, str | None]:
    """Classify message type and extract attachment filename if present.

    Returns (type, attachment_filename).
    """
    c = content.strip()
    cl = c.lower()

    # Deleted messages
    if c in ("This message was deleted.", "You deleted this message."):
        return "deleted", None

    # Call types
    if cl.startswith("missed voice call"):
        return "call", None
    if cl.startswith("missed video call"):
        return "call", None
    if cl.startswith("voice call"):
        return "call", None
    if cl.startswith("video call"):
        return "call", None

    # Media omitted
    if cl == "image omitted":
        return "image", None
    if cl == "video omitted":
        return "video", None
    if cl == "audio omitted":
        return "audio", None
    if cl == "sticker omitted":
        return "sticker", None

    # Attachments
    attach_match = re.match(r"<attached:\s*(.+?)>", c)
    if attach_match:
        filename = attach_match.group(1).strip()
        return classify_attachment(filename), filename

    # Partial/truncated attachment (no closing >)
    partial_match = re.match(r"<attached:\s*(.+)", c)
    if partial_match:
        filename = partial_match.group(1).strip().rstrip(">")
        return classify_attachment(filename), filename

    # System message (encryption notice)
    if "end-to-end encrypted" in cl:
        return "system", None

    return "text", None


def classify_attachment(filename: str) -> str:
    """Classify attachment type based on filename."""
    fl = filename.upper()
    if "PHOTO" in fl or fl.endswith((".JPG", ".JPEG", ".PNG", ".WEBP", ".HEIC")):
        return "image"
    if "VIDEO" in fl or fl.endswith((".MP4", ".MOV", ".AVI")):
        return "video"
    if "AUDIO" in fl or fl.endswith((".OPUS", ".OGG", ".M4A", ".MP3", ".AAC")):
        return "audio"
    if "STICKER" in fl or fl.endswith(".WEBP"):
        return "sticker"
    if fl.endswith((".VCF", ".HTML", ".PDF", ".DOC", ".DOCX", ".XLS", ".XLSX")):
        return "document"
    # Default: if we can't tell, it's a document
    return "document"


def build_structured(raw_messages: list[dict]) -> list[dict]:
    """Convert raw parsed messages into the final structured format."""
    structured = []
    for idx, msg in enumerate(raw_messages, start=1):
        date_iso = parse_date(msg["date_str"])
        time_str = msg["time_str"]
        content = msg["content"]

        # Check for edited flag
        is_edited = "<This message was edited>" in content
        if is_edited:
            content = content.replace("<This message was edited>", "").strip()

        msg_type, attachment = classify_message(content)

        # For media types with attachments, clear content (it's just the attachment tag)
        if attachment and msg_type in ("image", "video", "audio", "sticker", "document"):
            display_content = ""
        elif msg_type in ("image", "video", "audio", "sticker"):
            # "image omitted" etc — no useful content
            display_content = ""
        elif msg_type == "deleted":
            display_content = content
        elif msg_type == "call":
            display_content = content
        elif msg_type == "system":
            display_content = content
        else:
            display_content = content

        urls = URL_PATTERN.findall(display_content)

        structured.append({
            "id": idx,
            "timestamp": f"{date_iso}T{time_str}",
            "date": date_iso,
            "time": time_str,
            "sender": msg["sender"],
            "content": display_content,
            "type": msg_type,
            "is_edited": is_edited,
            "attachment": attachment,
            "urls": urls,
        })

    return structured


def build_index(messages: list[dict]) -> dict:
    """Build date-based index for navigation."""
    dates = OrderedDict()
    for msg in messages:
        d = msg["date"]
        if d not in dates:
            dates[d] = {
                "date": d,
                "message_count": 0,
                "first_message_id": msg["id"],
                "last_message_id": msg["id"],
            }
        dates[d]["message_count"] += 1
        dates[d]["last_message_id"] = msg["id"]

    return {"dates": list(dates.values())}


def print_stats(messages: list[dict]) -> None:
    """Print summary statistics."""
    total = len(messages)
    by_sender = {}
    by_type = {}
    for m in messages:
        by_sender[m["sender"]] = by_sender.get(m["sender"], 0) + 1
        by_type[m["type"]] = by_type.get(m["type"], 0) + 1

    print(f"\nTotal messages: {total}")
    print("\nBy sender:")
    for s, c in sorted(by_sender.items()):
        print(f"  {s}: {c}")
    print("\nBy type:")
    for t, c in sorted(by_type.items()):
        print(f"  {t}: {c}")

    if messages:
        print(f"\nDate range: {messages[0]['date']} to {messages[-1]['date']}")

    edited = sum(1 for m in messages if m["is_edited"])
    with_urls = sum(1 for m in messages if m["urls"])
    with_attach = sum(1 for m in messages if m["attachment"])
    print(f"\nEdited messages: {edited}")
    print(f"Messages with URLs: {with_urls}")
    print(f"Messages with attachments: {with_attach}")


def main():
    print(f"Reading PDF: {PDF_PATH}")
    full_text = extract_text(PDF_PATH)
    print(f"Extracted {len(full_text):,} characters of text")

    print("Parsing messages...")
    raw = parse_messages(full_text)
    print(f"Found {len(raw):,} raw messages")

    print("Building structured data...")
    messages = build_structured(raw)

    print_stats(messages)

    # Write messages.json
    output = {
        "metadata": {
            "participants": sorted(set(m["sender"] for m in messages if m["type"] != "system")),
            "date_range": {
                "start": messages[0]["date"] if messages else None,
                "end": messages[-1]["date"] if messages else None,
            },
            "total_messages": len(messages),
            "source_file": PDF_PATH,
        },
        "messages": messages,
    }

    print(f"\nWriting {MESSAGES_OUT}...")
    with open(MESSAGES_OUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=None)
    print(f"  Written ({len(messages):,} messages)")

    # Write index.json
    index = build_index(messages)
    print(f"Writing {INDEX_OUT}...")
    with open(INDEX_OUT, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"  Written ({len(index['dates']):,} dates)")

    print("\nDone!")


if __name__ == "__main__":
    main()
