"""Messages added later to a conversation that already exists."""

import contextlib
import io
import json
import sys
import tempfile
import unittest
from collections import defaultdict
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

import build_ipj_data  # noqa: E402
from build_ipj_data import append_messages, build_index, id_runs  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


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

    def test_an_anchor_with_a_higher_id_is_named_as_such(self):
        with self.assertRaises(SystemExit) as caught:
            append_messages(base(), {"ana": [row(4, 5, "x", "2024-01-01 12:00:00"),
                                             row(5, 2, "y", "2024-01-01 11:30:00")]})
        self.assertIn("id maior", str(caught.exception))
        with self.assertRaises(SystemExit) as caught:
            append_messages(base(), {"ana": [row(4, 4, "x", "2024-01-01 12:00:00")]})
        self.assertIn("própria linha", str(caught.exception))

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


    def test_an_added_reply_is_resolved_and_the_range_grows(self):
        convs = base()
        append_messages(convs, {"ana": [
            row(4, 2, "resp", "2024-01-01 12:00:00", quoted="a", quoted_sender="DV"),
            row(5, None, "late", "2024-01-05 09:00:00"),
        ]})
        msgs = {m["id"]: m for m in convs["ana"]["messages"]}
        self.assertEqual(msgs[4]["quoted_id"], 1)
        self.assertEqual(convs["ana"]["metadata"]["date_range"], {"start": "2024-01-01", "end": "2024-01-05"})


class Routing(unittest.TestCase):
    """Which lines become additions, and with what source and seal."""

    DOC = {"dir": "doc", "source_id": "doc-src", "label": "Doc"}

    def doc_rows(self, **extra):
        return [{"id": 4, "conv": "ana", "peer": "Ana", "ts": "2024-01-01 12:00:00", "sender": "Ana",
                 "type": "text", "content": "z", "page": 9, "after": 2, **extra}]

    def run_docs(self, rows):
        appends = defaultdict(list)
        with mock.patch.object(build_ipj_data, "DOCUMENTS", [self.DOC]), \
                mock.patch.object(build_ipj_data, "read_jsonl", return_value=rows), \
                mock.patch.object(build_ipj_data, "document_seal", return_value="nao-verificado"):
            build_ipj_data.add_document_conversations(base(), appends)
        return appends

    def test_a_document_line_for_an_existing_chat_takes_the_document_source_and_seal(self):
        added = self.run_docs(self.doc_rows())["ana"][0]
        self.assertEqual((added["source_id"], added["verification"]), ("doc-src", "nao-verificado"))
        # Its own seal stays.
        added = self.run_docs(self.doc_rows(verification="reconstruido"))["ana"][0]
        self.assertEqual(added["verification"], "reconstruido")

    def test_a_document_line_with_its_own_source_needs_its_own_seal(self):
        with self.assertRaises(SystemExit):
            self.run_docs(self.doc_rows(source_id="uol"))

    def test_after_on_a_line_that_starts_a_chat_is_refused(self):
        with self.assertRaises(SystemExit):
            self.run_docs([{**self.doc_rows()[0], "conv": "nova"}])

    def test_a_fork_line_for_an_existing_chat_needs_its_own_source_and_seal(self):
        with tempfile.TemporaryDirectory() as tmp:
            fork = Path(tmp) / "data" / "fork"
            fork.mkdir(parents=True)
            (fork / "conversas.json").write_text("{}")
            (Path(tmp) / "data" / "sources.json").write_text('{"sources": []}')
            line = {"id": 4, "conv": "ana", "ts": "2024-01-01 12:00:00", "sender": "Ana",
                    "type": "text", "content": "z", "after": 2}
            (fork / "mensagens.jsonl").write_text(json.dumps(line))
            with mock.patch.object(build_ipj_data, "ROOT", Path(tmp)), self.assertRaises(SystemExit):
                build_ipj_data.add_fork_conversations(base(), defaultdict(list))
            (fork / "mensagens.jsonl").write_text(json.dumps({**line, "source_id": "s", "verification": "imprensa"}))
            appends = defaultdict(list)
            with mock.patch.object(build_ipj_data, "ROOT", Path(tmp)):
                build_ipj_data.add_fork_conversations(base(), appends)
            self.assertEqual([r["id"] for r in appends["ana"]], [4])


class CommittedConversations(unittest.TestCase):
    def test_data_conversations_is_what_the_build_writes(self):
        # Three sources feed the appends: a line edited and never rebuilt
        # would ship stale. Run `python3 scripts/build_ipj_data.py` to fix.
        committed = ROOT / "data" / "conversations"
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(build_ipj_data, "OUT_DIR", Path(tmp)), \
                    contextlib.redirect_stdout(io.StringIO()):
                build_ipj_data.main()
            built = {p.name: p.read_bytes() for p in Path(tmp).glob("*.json")}
        self.assertEqual(sorted(built), sorted(p.name for p in committed.glob("*.json")))
        stale = [name for name, data in built.items() if (committed / name).read_bytes() != data]
        self.assertEqual(stale, [], "data/conversations desatualizado: rode scripts/build_ipj_data.py")


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
