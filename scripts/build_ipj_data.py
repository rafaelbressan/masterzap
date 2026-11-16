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
from message_schema import NO_DATE, date_sort_key, normalise_message, sort_key  # noqa: E402

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
    """Build a message in the viewer's schema (see CLAUDE.md 'Data Format').

    Without a timestamp (a press report that gives the day, or only the
    month), the date comes in ``extra["date"]`` and the time stays unknown.
    """
    if timestamp:
        date, time = timestamp.split(" ")
    elif extra.get("date"):
        date, time = extra["date"], None
    else:
        raise SystemExit(f"msg {mid} ({sender}): sem ts nem date; uma data desconhecida se escreve date: \"sem-data\"")
    msg = {
        "id": mid,
        "timestamp": f"{date}T{time}" if time else None,
        "date": date,
        "time": time,
        "sender": sender,
        "content": content,
        "type": mtype,
        "is_edited": False,
        "attachment": extra.get("attachment"),
        "urls": URL_PATTERN.findall(content),
    }
    for key in ("forwarded", "quoted", "quoted_sender", "source_page", "source_figure",
                "view_once", "note_created_utc", "sent_utc", "duration",
                "note", "source_id", "verification"):
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
    # Pet 15.497 (RioPrevidência): o nome da pessoa, não o salvo no celular.
    "mauricio-quadrado": "Maurício Quadrado",
    "ricardo-gordo-siqueira-rodrigues": "Ricardo Siqueira Rodrigues",
    "augusto-lima": "Augusto Lima",
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
        quoted_sender=row.get("quoted_sender"),
        duration=row.get("duration"),
        source_page=row["page"],
        source_figure=row.get("fig"),
        note=row.get("note"),
        date=row.get("date"),
        # A line from another source than its document's (a press report
        # quoting the same chat), with that source's seal.
        source_id=row.get("source_id"),
        verification=row.get("verification"),
        **extra,
    )


def date_range(messages):
    """First and last known date; a message with none ("sem-data") is not a bound."""
    dates = [m["date"] for m in messages if m["date"] != NO_DATE] or [NO_DATE]
    return {"start": min(dates, key=date_sort_key), "end": max(dates, key=date_sort_key)}


def contact_metadata(rows, peer, saved_as, messages, source_label, source_id, note,
                     verification=VERIFICATION):
    """A conversation with one contact, its messages from one document."""
    return {
        "participants": ["DV", peer],
        # How the contact was filed in Vorcaro's phone, when that differs
        # from the person's name.
        "saved_as": saved_as if saved_as != peer else None,
        "phone": rows[0].get("phone"),
        "date_range": date_range(messages),
        "total_messages": len(messages),
        "source": source_label,
        "source_id": source_id,
        "verification": verification,
        "note": note,
    }


def _quote_key(text):
    """Text compared the way it reads: case and spacing aside."""
    return " ".join((text or "").split()).casefold()


CONTACT_QUOTE = re.compile(r"^\[(cartão de )?contato\]", re.IGNORECASE)


def _quotes(target, quoted):
    """Whether `quoted` (the excerpt a reply carries) is the message `target`."""
    if CONTACT_QUOTE.match(quoted):
        # A quoted card, as the print shows it: name and number.
        digits = re.sub(r"\D", "", quoted)
        return (target["type"] == "contact" and len(digits) >= 8
                and digits in re.sub(r"\D", "", target["content"]))
    if target["type"] == "document":
        # By the file's name, or by the caption after the bracketed
        # description when the print does not show the name.
        caption = re.sub(r"^\[[^\]]*\]\s*", "", target["content"])
        return _quote_key(quoted) in {_quote_key(target.get("attachment")), _quote_key(caption)} - {""}
    if target["type"] == "link":
        # A quoted link shows the address and the start of its card.
        url = URL_PATTERN.match(quoted.strip())
        if url:
            return url.group(0) in target["content"]
    return target["type"] != "contact" and _quote_key(target["content"]) == _quote_key(quoted)


def resolve_quotes(conv_id, messages):
    """Point each reply at the message it quotes.

    A reply in the report carries only the quoted excerpt. When the quoted
    message is in the conversation too (the latest earlier one that matches),
    the reply gets its id, ``quoted_id``, and its author, ``quoted_sender``, so
    the bubble can name who wrote it and take you there (and ``quoted_type``
    when the quoted message is a card, not text). When it is not (the report
    printed the reply, not what it answered), the transcription says who wrote
    it, as the print shows above the excerpt.

    The build stops on a reply it cannot settle: no match and no author; an
    author that matches none of the messages with that text; or a text both
    sides wrote (an "Ok"), with no author to choose between them.
    """
    for i, msg in enumerate(messages):
        quoted = msg.get("quoted")
        if not quoted:
            continue
        given = msg.get("quoted_sender")
        where = f"{conv_id} msg {msg['id']} (p. {msg.get('source_page')})"
        matches = [m for m in reversed(messages[:i]) if _quotes(m, quoted)]
        if given:
            if matches and not any(m["sender"] == given for m in matches):
                raise SystemExit(
                    f"{where}: quoted_sender {given!r}, mas a mensagem citada "
                    f"(msg {matches[0]['id']}) é de {matches[0]['sender']!r}")
            matches = [m for m in matches if m["sender"] == given]
        elif len({m["sender"] for m in matches}) > 1:
            raise SystemExit(
                f"{where}: o texto citado é de mais de um remetente "
                f"(msgs {', '.join(str(m['id']) for m in matches)}); "
                "transcreva quoted_sender do print")
        if not matches:
            if not given:
                raise SystemExit(
                    f"{where}: a mensagem citada não está na conversa; "
                    "transcreva quoted_sender do print")
            continue
        target = matches[0]
        msg["quoted_id"] = target["id"]
        msg["quoted_sender"] = target["sender"]
        # A card (a document, a contact) is quoted with its icon, not as text.
        if target["type"] != "text":
            msg["quoted_type"] = target["type"]


def build_other_conversations():
    """Every other chat quoted in the report, one conversation per contact."""
    by_conv = defaultdict(list)
    for msg in read_jsonl(SRC_DIR / "mensagens.jsonl"):
        if msg["conv"] in SKIP_CONVERSATIONS:
            continue
        by_conv[msg["conv"]].append(msg)

    built = {}
    for conv_id, rows in by_conv.items():
        rows.sort(key=lambda m: m.get("ts") or m.get("date") or "")
        saved_as = rows[0]["peer"]
        peer = CONTACT_DISPLAY_NAMES.get(conv_id, saved_as)
        messages = [row_message(i, r) for i, r in enumerate(rows, 1)]
        resolve_quotes(conv_id, messages)
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
    {
        # No PDF in the repo: the lines come from the fork's transcription,
        # which cites the page but cannot be checked (see document_seal).
        "dir": "pet-15497",
        "source_id": "pet-15497-representacao-pf-rioprevidencia",
        "label": "Representação da PF — RioPrevidência e Cláudio Castro (Pet 15.497)",
    },
]


def document_seal(source_id):
    """A document's default seal: "verificado" only with its PDF in the repo.

    The same rule scripts/message_schema.py enforces; when the PDF arrives
    (file + sha256 in data/sources.json), the conversation is promoted here.
    """
    with open(ROOT / "data" / "sources.json", encoding="utf-8") as f:
        source = next(s for s in json.load(f)["sources"] if s["id"] == source_id)
    return VERIFICATION if source.get("file") else "nao-verificado"


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
            resolve_quotes(conv_id, messages)
            conversations[conv_id] = {
                "metadata": contact_metadata(
                    rows, peer, saved_as, messages, doc["label"], doc["source_id"],
                    "Trechos citados no documento da PF — a conversa completa "
                    "não consta dele.",
                    verification=document_seal(doc["source_id"])),
                "messages": messages,
            }


def add_fork_conversations(conversations):
    """The fork's new conversations (data/fork/), one source per conversation.

    data/fork/conversas.json gives each conversation's contact, its default
    source and seal (the fork's own description of where the messages came
    from); a line from elsewhere carries its own source_id and verification.
    As with the documents, adding to an existing conversation is refused.
    """
    meta_path = ROOT / "data" / "fork" / "conversas.json"
    if not meta_path.exists():
        return
    with open(meta_path, encoding="utf-8") as f:
        convs = json.load(f)
    with open(ROOT / "data" / "sources.json", encoding="utf-8") as f:
        titles = {s["id"]: s["titulo"] for s in json.load(f)["sources"]}
    by_conv = defaultdict(list)
    for row in read_jsonl(ROOT / "data" / "fork" / "mensagens.jsonl"):
        by_conv[row["conv"]].append(row)
    for conv_id, info in convs.items():
        if conv_id in conversations:
            sys.exit(f"data/fork: {conv_id} já existe; acrescentar mensagens a uma conversa "
                     "existente ainda não é suportado (ver add_document_conversations).")
        rows = by_conv[conv_id]
        # In the file's order: the converter put each day in the fork's order.
        messages = [row_message(r["id"], r) for r in rows]
        resolve_quotes(conv_id, messages)
        conversations[conv_id] = {
            "metadata": contact_metadata(
                rows, info["name"], info["saved_as"], messages,
                titles[info["source_id"]], info["source_id"],
                "Transcrição do fork 1uc4sm4theus/masterzap; cada mensagem diz de onde veio. "
                "A conversa completa não é pública.",
                verification=info["verification"]),
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
                # The lowest and highest id of the day, which need not be its
                # first and last on screen: a day of the fork keeps the fork's
                # order, and its ids stay the ones already published.
                "first_message_id": min(m["id"] for m in by_date[date]),
                "last_message_id": max(m["id"] for m in by_date[date]),
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
    add_fork_conversations(conversations)

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
