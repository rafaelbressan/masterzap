"""The message schema the build relies on, in one place.

Two jobs:

* **Normalise** a message on its way in (the importers in scripts/ call
  ``normalise_message``): timestamps without a UTC offset, in local wall-clock
  time like the rest of the data, and partial dates recorded as partial instead
  of being padded into a day nobody knows.
* **Validate** everything already in data/ (``scripts/split_data.py`` calls
  ``validate_messages``), so a malformed message fails the build rather than
  reaching the site.

The field-by-field description is in data/README.md.
"""

import re
from datetime import datetime, timedelta, timezone

# Every source is Brazilian local time. Brazil has had no daylight saving since
# 2019, so for the period the data covers the offset is a constant.
LOCAL_OFFSET = timedelta(hours=-3)

DAY_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_RE = re.compile(r"^\d{4}-\d{2}$")
YEAR_RE = re.compile(r"^\d{4}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}:\d{2}$")
NO_DATE = "sem-data"

# Written explicitly only when it is not "day"; a message without the field has
# an exact date.
DATE_PRECISIONS = ("day", "month", "year", "none")

VERIFICATIONS = ("verificado", "imprensa", "nao-verificado", "reconstruido")

# The types src/components/ChatView.js knows how to draw.
TYPES = (
    "text", "image", "video", "audio", "sticker", "document", "deleted", "call", "system",
    "contact", "link", "location", "image_view_once",
)


def date_precision(date):
    """How much of a date is known: day, month, year or none."""
    if date is None or date == NO_DATE:
        return "none"
    if DAY_RE.match(date):
        return "day"
    if MONTH_RE.match(date):
        return "month"
    if YEAR_RE.match(date):
        return "year"
    raise ValueError(f"data fora do formato: {date!r}")


def to_local(timestamp):
    """'2024-03-12T10:00:00-03:00' → '2024-03-12T10:00:00', in local time.

    A timestamp already without an offset is taken to be local and returned as
    it is. One with any other offset (UTC from a log, say) is converted.
    """
    if timestamp is None:
        return None
    text = timestamp.strip().replace(" ", "T", 1)
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        return parsed.strftime("%Y-%m-%dT%H:%M:%S")
    local = parsed.astimezone(timezone(LOCAL_OFFSET))
    return local.replace(tzinfo=None).strftime("%Y-%m-%dT%H:%M:%S")


def normalise_message(msg):
    """Bring one incoming message to the schema. Returns a new dict.

    * ``timestamp`` loses its offset (converted to local time when it is not
      -03:00), and ``date``/``time`` are derived from it when it is exact.
    * A time the source could not read ("??", "", "--:--") becomes ``None``,
      and so does the timestamp: an unknown time is not midnight.
    * A partial date ("2024-07", "2024", "sem-data") stays partial and gets a
      ``date_precision``; nothing is invented to fill the gap.
    """
    out = dict(msg)
    time = out.get("time")
    if time is not None and not TIME_RE.match(str(time)):
        if re.match(r"^\d{2}:\d{2}$", str(time)):
            time = f"{time}:00"
        else:
            time = None
    out["time"] = time

    stamp = out.get("timestamp")
    if stamp:
        try:
            out["timestamp"] = to_local(stamp)
        except ValueError:
            out["timestamp"] = None
    if out.get("timestamp"):
        out["date"], out["time"] = out["timestamp"].split("T")
    else:
        out["timestamp"] = None

    date = out.get("date") or NO_DATE
    out["date"] = date
    precision = date_precision(date)
    if precision != "day":
        out["date_precision"] = precision
        out["timestamp"] = None
    else:
        out.pop("date_precision", None)
        if out["timestamp"] is None and out["time"]:
            out["timestamp"] = f"{date}T{out['time']}"
    return out


def validate_message(msg, where):
    """Problems with one message, as a list of strings (empty when it is fine)."""
    problems = []
    say = lambda text: problems.append(f"{where} msg {msg.get('id')}: {text}")

    if not isinstance(msg.get("id"), int):
        say("id não é inteiro")
    if msg.get("type") not in TYPES:
        say(f"tipo desconhecido {msg.get('type')!r}")
    if not msg.get("sender"):
        say("sem remetente")

    date = msg.get("date")
    try:
        precision = date_precision(date)
    except ValueError as err:
        say(str(err))
        return problems
    declared = msg.get("date_precision", "day")
    if declared not in DATE_PRECISIONS:
        say(f"date_precision desconhecida {declared!r}")
    elif declared != precision:
        say(f"date_precision {declared!r} não bate com a data {date!r}")

    time = msg.get("time")
    if time is not None and not TIME_RE.match(time):
        say(f"hora fora do formato: {time!r}")

    stamp = msg.get("timestamp")
    if stamp is not None:
        if re.search(r"(Z|[+-]\d{2}:\d{2})$", stamp):
            say(f"timestamp com fuso (deve ser hora local, sem offset): {stamp!r}")
        elif precision != "day" or stamp != f"{date}T{time}":
            say(f"timestamp {stamp!r} não bate com date/time {date!r} {time!r}")
    elif precision == "day" and time is not None:
        say("timestamp ausente com data e hora exatas")

    if msg.get("verification") is not None and msg["verification"] not in VERIFICATIONS:
        say(f"verification desconhecida {msg['verification']!r}")
    return problems


def validate_messages(messages, where):
    """Every problem in a conversation, plus duplicate ids."""
    problems = []
    seen = set()
    for msg in messages:
        problems.extend(validate_message(msg, where))
        if msg.get("id") in seen:
            problems.append(f"{where} msg {msg.get('id')}: id duplicado")
        seen.add(msg.get("id"))
    return problems


def sort_key(msg):
    """Chronological order that tolerates partial dates and unknown times.

    An undated message goes first (there is nowhere better to put it), a
    month-only date sorts before every day of that month, and an unknown time
    sorts before every known time of its day. Ties keep the source's order
    (``sorted`` is stable), and then the id decides.
    """
    date = msg.get("date") or NO_DATE
    if date == NO_DATE:
        return ("", "", msg.get("id") or 0)
    return (date, msg.get("time") or "", msg.get("id") or 0)


# ── provenance ──────────────────────────────────────────────────────────────

SOURCE_KINDS = (
    "laudo-pf", "peticao-stf", "imprensa", "vazamento", "print", "iped", "fornecido",
)
SOURCE_REQUIRED = ("id", "kind", "titulo", "orgao_ou_veiculo", "data", "how")


def validate_sources(sources, root):
    """Problems with data/sources.json; a file it names must exist and match."""
    import hashlib

    problems = []
    seen = set()
    for src in sources:
        sid = src.get("id")
        where = f"sources.json {sid!r}"
        for key in SOURCE_REQUIRED:
            if not src.get(key):
                problems.append(f"{where}: falta {key}")
        if sid in seen:
            problems.append(f"{where}: id duplicado")
        seen.add(sid)
        if src.get("kind") not in SOURCE_KINDS:
            problems.append(f"{where}: kind desconhecido {src.get('kind')!r}")
        if src.get("data"):
            try:
                date_precision(src["data"])
            except ValueError as err:
                problems.append(f"{where}: {err}")
        if src.get("file"):
            path = root / src["file"]
            if not path.exists():
                problems.append(f"{where}: arquivo {src['file']} não existe")
            elif src.get("sha256") != hashlib.sha256(path.read_bytes()).hexdigest():
                problems.append(f"{where}: sha256 não bate com {src['file']}")
    return problems


def provenance_of(msg, metadata):
    """(source_id, verification) of a message: its own, else its conversation's."""
    return (
        msg.get("source_id") or metadata.get("source_id"),
        msg.get("verification") or metadata.get("verification"),
    )


def validate_provenance(metadata, messages, source_ids, where):
    """Every message must resolve to a known source and a known seal."""
    problems = []
    if metadata.get("source_id") not in source_ids:
        problems.append(f"{where}: source_id da conversa inválido {metadata.get('source_id')!r}")
    if metadata.get("verification") not in VERIFICATIONS:
        problems.append(f"{where}: verification da conversa inválida {metadata.get('verification')!r}")
    for msg in messages:
        if "source_id" in msg and msg["source_id"] not in source_ids:
            problems.append(f"{where} msg {msg.get('id')}: source_id inválido {msg['source_id']!r}")
    return problems
