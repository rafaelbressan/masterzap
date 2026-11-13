#!/usr/bin/env python3
"""Build conversation JSON from the Federal Police documents.

Sources:
- data/ipj-3298613/*.jsonl — transcription of the IPJ-A 3298613/2026 report
  on Daniel Vorcaro's seized iPhone (Operação Compliance Zero);
- data/<document>/mensagens.jsonl for the other documents in DOCUMENTS, each
  line with its own fixed id.
The message content in the PDFs lives inside page images, so the JSONL files
are a manual transcription, not a parser output.

Output: data/conversations/<conv-id>.json in the same shape as
data/messages.json (metadata + messages), consumable by scripts/split_data.py.
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "data" / "ipj-3298613"
OUT_DIR = ROOT / "data" / "conversations"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from message_schema import date_sort_key, normalise_message, sort_key  # noqa: E402

SOURCE_DOC = "IPJ-A nº 3298613/2026 — NADIP/DFIN/CGRC/DICOR/PF"
# The report's record in data/sources.json. Every message built here comes from
# it and cites its page and figure, so the whole conversation is "verificado".
SOURCE_ID = "ipj-a-3298613-2026"
VERIFICATION = "verificado"

MORAES_ID = "alexandre-de-moraes"
MORAES_NAME = "Alexandre de Moraes BRASILIA"
MORAES_PHONE = "556192664093"

URL_PATTERN = re.compile(r"https?://[^\s<>\"']+")


def read_jsonl(path):
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def slugify(name):
    s = name.lower().strip()
    for src, dst in (("àáâãä", "a"), ("èéêë", "e"), ("ìíîï", "i"),
                     ("òóôõö", "o"), ("ùúûü", "u"), ("ç", "c"), ("ñ", "n")):
        for ch in src:
            s = s.replace(ch, dst)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def make_message(mid, timestamp, sender, content, mtype, **extra):
    """Build a message in the viewer's schema (see CLAUDE.md 'Data Format')."""
    date, time = timestamp.split(" ")
    msg = {
        "id": mid,
        "timestamp": f"{date}T{time}",
        "date": date,
        "time": time,
        "sender": sender,
        "content": content,
        "type": mtype,
        "is_edited": False,
        "attachment": extra.get("attachment"),
        "urls": URL_PATTERN.findall(content),
    }
    for key in ("forwarded", "quoted", "source_page", "source_figure",
                "view_once", "note_created_utc", "sent_utc", "duration",
                "note"):
        if extra.get(key) is not None:
            msg[key] = extra[key]
    return normalise_message(msg)


def build_moraes_conversation():
    """The DV <-> 'Alexandre de Moraes BRASILIA' chat.

    Two sources merge here:
      * chat-moraes.jsonl — the WhatsApp thread itself (17/11/2025), where every
        DV message is a view-once image.
      * notas.jsonl — the 52 Notes-app screenshots DV sent to the same terminal.
        The PF correlated each note to a WhatsApp send via system logs, so each
        note is rendered as an outgoing message at its send time (BRT).
    """
    events = []

    for note in read_jsonl(SRC_DIR / "notas.jsonl"):
        events.append({
            "ts": note["sent_br"],
            "sender": "DV",
            "content": note["body"],
            "type": "text",
            "extra": {
                "view_once": True,
                "note_created_utc": note.get("note_start_utc"),
                "sent_utc": note.get("sent_utc"),
                "source_page": note["page"],
                "source_figure": note["fig"],
                "note": note.get("note"),
            },
        })

    for msg in read_jsonl(SRC_DIR / "chat-moraes.jsonl"):
        # Outgoing view-once images are the notes above; keep only the events
        # the notes cannot express: system notices, deletions, and the
        # unrecovered incoming images from the other side.
        if msg["sender"] == "DV":
            continue
        events.append({
            "ts": msg["ts"],
            "sender": "system" if msg["sender"] == "system" else MORAES_NAME,
            "content": msg["content"],
            "type": msg["type"] if msg["type"] != "image_view_once" else "image",
            "extra": {
                "view_once": msg["type"] == "image_view_once" or None,
                "source_page": msg["page"],
                "source_figure": msg["fig"],
                "note": msg.get("note"),
            },
        })

    events.sort(key=lambda e: e["ts"])
    messages = [
        make_message(i, e["ts"], e["sender"], e["content"], e["type"], **e["extra"])
        for i, e in enumerate(events, 1)
    ]
    metadata = {
        "participants": ["DV", MORAES_NAME],
        "phone": MORAES_PHONE,
        "date_range": {"start": messages[0]["date"], "end": messages[-1]["date"]},
        "total_messages": len(messages),
        "source": SOURCE_DOC,
        "source_id": SOURCE_ID,
        "verification": VERIFICATION,
        "note": (
            "Mensagens de DANIEL VORCARO enviadas como capturas de tela do "
            "aplicativo Notas em modo de visualização única; o conteúdo foi "
            "recuperado pela perícia e correlacionado ao envio pelos logs do "
            "sistema. Mensagens recebidas de visualização única não foram "
            "recuperadas."
        ),
    }
    return MORAES_ID, {"metadata": metadata, "messages": messages}


# Contacts whose real name we know, keyed by conversation id.
#
# The JSONL keeps the contact exactly as the phone had it saved — that is what
# the report reproduces, and it is evidence in its own right (Vorcaro filed the
# minister under "Alexandre de Moraes BRASILIA"). But a nickname like "Marcos
# Prime" tells a reader nothing, so where reporting has identified the person we
# show the real name and keep the saved one alongside it.
CONTACT_DISPLAY_NAMES = {
    # CEO e fundador da Prime You. O relatório da PF grafa "MARCOS DA MATA".
    "marcos-prime": "Marcus Matta",
    # Prime You, cuidava da agenda de voos e dos eventos.
    "thatiane-prime": "Thatiane Garcia",
    # Produtor dos eventos; cavaleiro de hipismo.
    "leo-serrano": "Leandro Serrano Giunchetti",
    # Inq 5.026: identificado pela PF; salvo no celular como "Berg".
    "berg": "José Alfredo Berg Filho",
}

# The report also quotes the DV <-> Martha Graeff chat, but that conversation is
# already in the viewer in full (data/messages.json, 65k messages covering the
# same dates). Emitting the excerpts would collide with it under the same
# conversation id, so they stay in mensagens.jsonl as source only.
SKIP_CONVERSATIONS = {"martha-graeff"}


def row_message(mid, row, **extra):
    """One transcribed line (mensagens.jsonl) as a message."""
    return make_message(
        mid, row["ts"], row["sender"], row["content"], row["type"],
        attachment=row.get("attachment"),
        forwarded=row.get("forwarded"),
        quoted=row.get("quoted"),
        duration=row.get("duration"),
        source_page=row["page"],
        source_figure=row.get("fig"),
        note=row.get("note"),
        **extra,
    )


def contact_metadata(rows, peer, saved_as, messages, source_label, source_id, note):
    """A conversation with one contact, every message from one document."""
    return {
        "participants": ["DV", peer],
        # How the contact was filed in Vorcaro's phone, when that differs
        # from the person's name.
        "saved_as": saved_as if saved_as != peer else None,
        "phone": rows[0].get("phone"),
        "date_range": {"start": messages[0]["date"], "end": messages[-1]["date"]},
        "total_messages": len(messages),
        "source": source_label,
        "source_id": source_id,
        "verification": VERIFICATION,
        "note": note,
    }


def build_other_conversations():
    """Every other chat quoted in the report, one conversation per contact."""
    by_conv = defaultdict(list)
    for msg in read_jsonl(SRC_DIR / "mensagens.jsonl"):
        if msg["conv"] in SKIP_CONVERSATIONS:
            continue
        by_conv[msg["conv"]].append(msg)

    built = {}
    for conv_id, rows in by_conv.items():
        rows.sort(key=lambda m: m["ts"])
        saved_as = rows[0]["peer"]
        peer = CONTACT_DISPLAY_NAMES.get(conv_id, saved_as)
        messages = [row_message(i, r) for i, r in enumerate(rows, 1)]
        built[conv_id] = {
            "metadata": contact_metadata(
                rows, peer, saved_as, messages, SOURCE_DOC, SOURCE_ID,
                "Trechos citados no relatório policial — a conversa completa "
                "não consta do documento."),
            "messages": messages,
        }
    return built


# Other police documents that reproduce Vorcaro's chats, each in
# data/<dir>/mensagens.jsonl. Their lines carry the message id, fixed for good.
DOCUMENTS = [
    {
        "dir": "inq-5026",
        "source_id": "inq-5026-representacao-pf-2026-06-09",
        "label": "Representação da PF por medidas cautelares — Inq 5.026 (Pet 16.032)",
    },
]


def add_document_conversations(conversations):
    """The chats the other documents quote, one new conversation per contact.

    Adding to a conversation that already exists is refused for now: a new
    message keeps the next id even when it is older (data/README.md), and the
    per-day index (first/last id of each day, src/lib/data-store.js) assumes
    each day holds a contiguous run of ids, so an older message with a high id
    would send its links to the wrong day.
    """
    for doc in DOCUMENTS:
        by_conv = defaultdict(list)
        for row in read_jsonl(ROOT / "data" / doc["dir"] / "mensagens.jsonl"):
            if row["conv"] not in SKIP_CONVERSATIONS:
                by_conv[row["conv"]].append(row)

        for conv_id, rows in by_conv.items():
            if conv_id in conversations:
                sys.exit(f"{doc['dir']}: {conv_id} já existe; acrescentar mensagens a "
                         "uma conversa existente ainda não é suportado (ver a docstring).")
            saved_as = rows[0]["peer"]
            peer = CONTACT_DISPLAY_NAMES.get(conv_id, saved_as)
            messages = sorted((row_message(r["id"], r) for r in rows), key=sort_key)
            conversations[conv_id] = {
                "metadata": contact_metadata(
                    rows, peer, saved_as, messages, doc["label"], doc["source_id"],
                    "Trechos citados no documento da PF — a conversa completa "
                    "não consta dele."),
                "messages": messages,
            }


def build_index(messages):
    by_date = defaultdict(list)
    for msg in messages:
        by_date[msg["date"]].append(msg)
    return {
        "dates": [
            {
                "date": date,
                "message_count": len(by_date[date]),
                "first_message_id": by_date[date][0]["id"],
                "last_message_id": by_date[date][-1]["id"],
            }
            # Undated first, a month before its days — the order the viewer
            # loads them in (message_schema.date_sort_key).
            for date in sorted(by_date, key=date_sort_key)
        ]
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    conversations = dict([build_moraes_conversation()])
    conversations.update(build_other_conversations())
    add_document_conversations(conversations)

    for conv_id, payload in sorted(conversations.items()):
        payload["index"] = build_index(payload["messages"])
        path = OUT_DIR / f"{conv_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        meta = payload["metadata"]
        print(f"{conv_id:28s} {meta['total_messages']:4d} msgs  "
              f"{meta['date_range']['start']} → {meta['date_range']['end']}")

    total = sum(c["metadata"]["total_messages"] for c in conversations.values())
    print(f"\n{len(conversations)} conversas, {total} mensagens → {OUT_DIR}")


if __name__ == "__main__":
    main()
