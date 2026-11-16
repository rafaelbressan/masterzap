"""The replies in the police report: which message each one quotes."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from build_ipj_data import resolve_quotes  # noqa: E402


def m(mid, sender, content, mtype="text", **extra):
    return {"id": mid, "sender": sender, "content": content, "type": mtype, **extra}


class ResolveQuotes(unittest.TestCase):
    def test_points_a_reply_at_the_latest_earlier_message_it_quotes(self):
        msgs = [m(1, "DV", "Otto tem que ir"), m(2, "Ciro", "x"), m(3, "DV", "Otto  tem que IR"),
                m(4, "Ciro", "Sim", quoted="Otto tem que ir")]
        resolve_quotes("c", msgs)
        self.assertEqual((msgs[3]["quoted_id"], msgs[3]["quoted_sender"]), (3, "DV"))
        self.assertNotIn("quoted_type", msgs[3])

    def test_matches_a_document_by_its_file_and_a_contact_by_its_number(self):
        msgs = [m(1, "Leo", "[anexo] Termo.docx", "document", attachment="Termo.docx"),
                m(2, "DV", "[cartão de contato] Vivi — +55 11 98344-5794", "contact"),
                m(3, "Leo", "esse", quoted="Termo.docx"),
                m(4, "Ana", "ok", quoted="[contato] Vivi +55 11 98344-5794")]
        resolve_quotes("c", msgs)
        self.assertEqual((msgs[2]["quoted_id"], msgs[2]["quoted_type"]), (1, "document"))
        self.assertEqual((msgs[3]["quoted_id"], msgs[3]["quoted_type"]), (2, "contact"))

    def test_a_quote_not_in_the_chat_keeps_the_author_from_the_print(self):
        msgs = [m(1, "Ana", "Okk", quoted="Eu sei", quoted_sender="DV")]
        resolve_quotes("c", msgs)
        self.assertNotIn("quoted_id", msgs[0])
        self.assertEqual(msgs[0]["quoted_sender"], "DV")

    def test_stops_without_an_author(self):
        with self.assertRaises(SystemExit):
            resolve_quotes("c", [m(1, "Ana", "Okk", quoted="Eu sei")])

    def test_stops_when_the_print_and_the_chat_disagree_on_the_author(self):
        msgs = [m(1, "DV", "Eu sei"), m(2, "Ana", "Okk", quoted="Eu sei", quoted_sender="Ana")]
        with self.assertRaises(SystemExit):
            resolve_quotes("c", msgs)

    def test_stops_on_a_text_both_sides_wrote_without_an_author(self):
        msgs = [m(1, "DV", "Ok"), m(2, "Ana", "Ok"), m(3, "Ana", "Certo", quoted="Ok")]
        with self.assertRaises(SystemExit):
            resolve_quotes("c", msgs)

    def test_the_author_from_the_print_picks_between_them(self):
        msgs = [m(1, "DV", "Ok"), m(2, "Ana", "Ok"), m(3, "Ana", "Certo", quoted="Ok", quoted_sender="DV")]
        resolve_quotes("c", msgs)
        self.assertEqual(msgs[2]["quoted_id"], 1)

    def test_a_number_in_a_text_is_not_a_quoted_card(self):
        msgs = [m(1, "DV", "me liga 11 98344-5794"),
                m(2, "DV", "[cartão de contato] Vivi — +55 11 98344-5794", "contact"),
                m(3, "Ana", "ok", quoted="me liga 11 98344-5794")]
        resolve_quotes("c", msgs)
        self.assertEqual(msgs[2]["quoted_id"], 1)
        self.assertNotIn("quoted_type", msgs[2])


if __name__ == "__main__":
    unittest.main()
