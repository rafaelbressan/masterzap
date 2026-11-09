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


if __name__ == "__main__":
    unittest.main()


class Provenance(unittest.TestCase):
    def test_unknown_source_id_is_rejected(self):
        from message_schema import validate_provenance
        meta = {"source_id": "a", "verification": "verificado"}
        self.assertEqual(validate_provenance(meta, [msg()], {"a"}, "t"), [])
        self.assertTrue(validate_provenance({**meta, "source_id": "x"}, [msg()], {"a"}, "t"))
        self.assertTrue(validate_provenance({**meta, "verification": "talvez"}, [msg()], {"a"}, "t"))
        self.assertTrue(validate_provenance(meta, [msg(source_id="x")], {"a"}, "t"))

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
