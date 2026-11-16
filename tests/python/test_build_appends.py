"""Messages added later to a conversation that already exists."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from build_ipj_data import append_messages, build_index, id_runs  # noqa: E402


def base():
    msgs = [
        {"id": 1, "timestamp": "2024-01-01T10:00:00", "date": "2024-01-01", "time": "10:00:00",
         "sender": "DV", "content": "a", "type": "text"},
        {"id": 2, "timestamp": "2024-01-01T11:00:00", "date": "2024-01-01", "time": "11:00:00",
         "sender": "Ana", "content": "b", "type": "text"},
        {"id": 3, "timestamp": "2024-01-03T09:00:00", "date": "2024-01-03", "time": "09:00:00",
         "sender": "DV", "content": "c", "type": "text"},
    ]
    return {"ana": {"metadata": {"note": "Trechos.", "total_messages": 3}, "messages": msgs}}


def row(mid, after, content, ts=None, date=None, **extra):
    r = {"id": mid, "conv": "ana", "ts": ts, "sender": "Ana", "type": "text", "content": content,
         "page": None, "after": after, "source_id": "s", "verification": "imprensa",
         "_where": "test", **extra}
    if ts is None:
        r["date"] = date
    return r


class AppendMessages(unittest.TestCase):
    def test_goes_after_its_anchor_with_its_own_source(self):
        convs = base()
        append_messages(convs, {"ana": [row(4, 1, "x", "2024-01-01 10:30:00")]})
        msgs = convs["ana"]["messages"]
        self.assertEqual([m["id"] for m in msgs], [1, 4, 2, 3])
        self.assertEqual((msgs[1]["source_id"], msgs[1]["verification"]), ("s", "imprensa"))
        self.assertEqual(convs["ana"]["metadata"]["total_messages"], 4)
        self.assertIn("outras fontes", convs["ana"]["metadata"]["note"])

    def test_first_of_its_day_and_a_new_day_and_a_chain(self):
        convs = base()
        append_messages(convs, {"ana": [
            row(4, None, "first", date="2024-01-01"),        # before 1
            row(5, None, "new day", "2024-01-02 08:00:00"),  # between the days
            row(6, 5, "chained", "2024-01-02 08:01:00"),     # after an added one
            row(7, None, "month", date="2024-01"),           # a month before its days
        ]})
        self.assertEqual([m["id"] for m in convs["ana"]["messages"]], [7, 4, 1, 2, 5, 6, 3])

    def test_refuses_what_it_cannot_place(self):
        for bad in (
            row(4, 9, "x", "2024-01-01 10:30:00"),        # anchor not in the chat
            row(4, 3, "x", "2024-01-01 10:30:00"),        # anchor on another day
            row(2, 1, "x", "2024-01-01 10:30:00"),        # id already used
            {k: v for k, v in row(4, 1, "x", "2024-01-01 10:30:00").items() if k != "after"},
        ):
            with self.subTest(bad=bad), self.assertRaises(SystemExit):
                append_messages(base(), {"ana": [bad]})
        with self.assertRaises(SystemExit):
            append_messages(base(), {"nobody": [row(4, None, "x", date="2024-01-01")]})

    def test_refuses_two_lines_at_one_spot(self):
        # They would come out in reverse; the converter chains them instead.
        for pair in ([row(4, 1, "x", "2024-01-01 10:30:00"), row(5, 1, "y", "2024-01-01 10:31:00")],
                     [row(4, None, "x", date="2024-01-02"), row(5, None, "y", date="2024-01-02")]):
            with self.subTest(pair=pair), self.assertRaises(SystemExit):
                append_messages(base(), {"ana": pair})

    def test_an_old_reply_keeps_its_target(self):
        # Reply 3 quoted "a" (msg 1); a new "a" placed before it does not take it over.
        convs = base()
        old = convs["ana"]["messages"][2]
        old.update(quoted="a", quoted_id=1, quoted_sender="DV")
        append_messages(convs, {"ana": [row(4, 2, "a", "2024-01-01 12:00:00", sender="DV")]})
        self.assertEqual(old["quoted_id"], 1)


class IdRuns(unittest.TestCase):
    def test_runs(self):
        self.assertEqual(id_runs([7, 1, 2, 3, 8]), [[1, 3], [7, 8]])

    def test_index_lists_runs_only_for_a_broken_day(self):
        convs = base()
        append_messages(convs, {"ana": [row(4, 2, "late", "2024-01-01 12:00:00")]})
        days = {d["date"]: d for d in build_index(convs["ana"]["messages"])["dates"]}
        self.assertEqual(days["2024-01-01"]["id_runs"], [[1, 2], [4, 4]])
        self.assertNotIn("id_runs", days["2024-01-03"])


if __name__ == "__main__":
    unittest.main()
