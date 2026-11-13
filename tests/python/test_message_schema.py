"""python3 -m unittest discover -s tests/python (part of `npm test`)."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from message_schema import (  # noqa: E402
    normalise_message, sort_key, to_local, validate_message, validate_messages,
)


def msg(**fields):
    base = {"id": 1, "sender": "DV", "type": "text", "content": "oi",
            "date": "2024-03-12", "time": "10:00:00", "timestamp": "2024-03-12T10:00:00"}
    base.update(fields)
    return base


class ToLocal(unittest.TestCase):
    def test_strips_the_local_offset(self):
        self.assertEqual(to_local("2024-03-12T10:00:00-03:00"), "2024-03-12T10:00:00")

    def test_converts_utc(self):
        self.assertEqual(to_local("2024-03-12T13:00:00Z"), "2024-03-12T10:00:00")
        self.assertEqual(to_local("2024-03-12T01:30:00+00:00"), "2024-03-11T22:30:00")

    def test_leaves_local_time_alone(self):
        self.assertEqual(to_local("2024-03-12 10:00:00"), "2024-03-12T10:00:00")


class Normalise(unittest.TestCase):
    def test_offset_timestamp_becomes_local_and_rederives_date_and_time(self):
        out = normalise_message(msg(timestamp="2024-03-12T01:00:00+00:00", date="2024-03-12", time="01:00:00"))
        self.assertEqual((out["timestamp"], out["date"], out["time"]), ("2024-03-11T22:00:00", "2024-03-11", "22:00:00"))
        self.assertEqual(validate_message(out, "t"), [])

    def test_unreadable_time_is_none_not_midnight(self):
        out = normalise_message(msg(time="??", timestamp=None))
        self.assertIsNone(out["time"])
        self.assertIsNone(out["timestamp"])
        self.assertNotIn("date_precision", out)
        self.assertEqual(validate_message(out, "t"), [])

    def test_partial_dates_are_kept_partial(self):
        month = normalise_message(msg(date="2024-07", time=None, timestamp=None))
        self.assertEqual((month["date"], month["date_precision"]), ("2024-07", "month"))
        undated = normalise_message(msg(date=None, time=None, timestamp=None))
        self.assertEqual((undated["date"], undated["date_precision"]), ("sem-data", "none"))
        for out in (month, undated):
            self.assertIsNone(out["timestamp"])
            self.assertEqual(validate_message(out, "t"), [])

    def test_hh_mm_gets_seconds(self):
        out = normalise_message(msg(time="10:05", timestamp=None))
        self.assertEqual(out["timestamp"], "2024-03-12T10:05:00")


class Validate(unittest.TestCase):
    def test_a_good_message_passes(self):
        self.assertEqual(validate_message(msg(), "t"), [])

    def test_offsets_are_rejected(self):
        problems = validate_message(msg(timestamp="2024-03-12T10:00:00-03:00"), "t")
        self.assertTrue(any("fuso" in p for p in problems), problems)

    def test_inconsistent_fields_are_rejected(self):
        self.assertTrue(validate_message(msg(time="11:00:00"), "t"))
        self.assertTrue(validate_message(msg(date="2024-07", date_precision="day"), "t"))
        self.assertTrue(validate_message(msg(date="julho"), "t"))
        self.assertTrue(validate_message(msg(type="emoji"), "t"))  # not drawn by ChatView
        self.assertTrue(validate_message(msg(verification="talvez"), "t"))
        self.assertTrue(validate_message(msg(time=None, timestamp="2024-03-12TNone"), "t"))
        self.assertTrue(validate_message(msg(date="2024-13-45", timestamp="2024-13-45T10:00:00"), "t"))
        self.assertTrue(validate_message(msg(time="25:99:99", timestamp="2024-03-12T25:99:99"), "t"))
        self.assertTrue(validate_message(msg(time=5), "t"))  # a readable error, not a crash
        self.assertTrue(validate_message(msg(date=20240312), "t"))

    def test_duplicate_ids(self):
        problems = validate_messages([msg(), msg()], "t")
        self.assertTrue(any("duplicado" in p for p in problems), problems)


class SortKey(unittest.TestCase):
    def test_partial_and_unknown_go_first_in_their_slot(self):
        rows = [
            msg(id=4, date="2024-07-02"),
            msg(id=3, date="2024-07-01", time=None),
            msg(id=2, date="2024-07", time=None),
            msg(id=1, date="sem-data", time=None),
        ]
        self.assertEqual([m["id"] for m in sorted(rows, key=sort_key)], [1, 2, 3, 4])



class Provenance(unittest.TestCase):
    def test_unknown_source_id_is_rejected(self):
        from message_schema import validate_provenance
        sources = {"a": {"kind": "laudo-pf"}, "j": {"kind": "imprensa"}}
        meta = {"source_id": "a", "verification": "verificado"}
        self.assertEqual(validate_provenance(meta, [msg()], sources, "t"), [])
        self.assertTrue(validate_provenance({**meta, "source_id": "x"}, [msg()], sources, "t"))
        self.assertTrue(validate_provenance({**meta, "verification": "talvez"}, [msg()], sources, "t"))
        self.assertTrue(validate_provenance(meta, [msg(source_id="x")], sources, "t"))

    def test_verified_needs_an_official_document(self):
        from message_schema import validate_provenance
        sources = {"a": {"kind": "laudo-pf"}, "j": {"kind": "imprensa"}}
        press = {"source_id": "j", "verification": "verificado"}
        self.assertTrue(validate_provenance(press, [msg()], sources, "t"))
        self.assertEqual(validate_provenance({**press, "verification": "imprensa"}, [msg()], sources, "t"), [])
        # A press message inside a police-report conversation must not stay "verificado".
        official = {"source_id": "a", "verification": "verificado"}
        self.assertTrue(validate_provenance(official, [msg(source_id="j")], sources, "t"))
        self.assertEqual(validate_provenance(official, [msg(source_id="j", verification="imprensa")], sources, "t"), [])

    def test_sources_file_hash_must_match(self):
        import tempfile
        from message_schema import validate_sources
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "doc.pdf").write_bytes(b"pdf")
            good = {"id": "a", "kind": "laudo-pf", "titulo": "T", "orgao_ou_veiculo": "PF",
                    "data": "2026-08-27", "how": "h", "file": "doc.pdf",
                    }
            import hashlib
            good["sha256"] = hashlib.sha256(b"pdf").hexdigest()
            self.assertEqual(validate_sources([good], root), [])
            self.assertTrue(validate_sources([{**good, "sha256": "0" * 64}], root))
            self.assertTrue(validate_sources([{**good, "kind": "blog"}], root))
            self.assertTrue(validate_sources([good, good], root))


class Calls(unittest.TestCase):
    """The call grammars scripts/split_data.py reads."""

    def test_every_wording_becomes_the_same_record(self):
        from split_data import describe_call
        cases = {
            "Chamada de voz — duração 02:49": ("voice", "completed", "02:49"),
            "Chamada de voz - duração: 4:34": ("voice", "completed", "4:34"),
            "Chamada de voz 04:34": ("voice", "completed", "04:34"),
            "Ligação de vídeo perdida": ("video", "missed", None),
            "[Chamada de voz perdida]": ("voice", "missed", None),
            "Chamada de voz recusada": ("voice", "ended", None),
            "Missed video call, Tap to call back": ("video", "missed", None),
            "Voice call, 3 min": ("voice", "completed", "3 min"),
        }
        for text, (kind, status, duration) in cases.items():
            call = describe_call({"content": text, "sender": "DV"})
            self.assertEqual((call["kind"], call["status"], call["duration"]), (kind, status, duration), text)
        self.assertIsNone(describe_call({"content": "Vou ligar", "sender": "DV"}))

    def test_a_call_is_outgoing_from_the_phones_owner(self):
        from split_data import describe_call
        call = {"content": "Chamada de voz perdida", "sender": "Ana"}
        self.assertFalse(describe_call(call)["outgoing"])
        self.assertTrue(describe_call(call, owner="Ana")["outgoing"])


class Owner(unittest.TestCase):
    """Whose phone a conversation came from (metadata.owner, DV by default)."""

    def test_the_conversation_is_named_after_whoever_is_not_the_owner(self):
        from split_data import get_conversation_id, owner_of
        self.assertEqual(owner_of({"participants": ["DV", "Ana"]}), "DV")
        self.assertEqual(get_conversation_id({"participants": ["DV", "Ana Matos"]}), "ana-matos")
        other = {"participants": ["Ana Matos", "DV"], "owner": "Ana Matos"}
        self.assertEqual(owner_of(other), "Ana Matos")
        self.assertEqual(get_conversation_id(other), "dv")


if __name__ == "__main__":
    unittest.main()
