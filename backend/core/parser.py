"""Dataset parser for Reuters-21578 SGML files and plain-text corpora.

Implemented 100% from scratch using standard Python string operations
(no BeautifulSoup, lxml, or XML/HTML parsing libraries).
"""

from typing import Dict, List, Optional, Tuple


# Common SGML entities found in Reuters-21578 dispatches
SGML_ENTITIES: Dict[str, str] = {
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&apos;": "'",
    "&#2;": "",       # STX start-of-text control marker
    "&#3;": "",       # ETX end-of-text control marker
    "&reuter;": "",
}


class Document:
    """Represents a single parsed document in the corpus."""

    def __init__(
        self,
        doc_id: str,
        title: str = "",
        body: str = "",
        topics: Optional[List[str]] = None,
    ):
        self.doc_id = str(doc_id)
        self.title = title.strip()
        self.body = body.strip()
        self.topics = topics or []

    @property
    def full_text(self) -> str:
        """Combines title and body into a single string for indexing."""
        if self.title and self.body:
            return f"{self.title}\n{self.body}"
        return self.title or self.body or ""

    def to_dict(self) -> Dict:
        """Serializes the document with a short preview for API responses."""
        preview = f"{self.body[:200]}..." if len(self.body) > 200 else self.body
        return {
            "doc_id": self.doc_id,
            "title": self.title,
            "body": self.body,
            "topics": self.topics,
            "preview": preview,
        }


def decode_sgml_entities(text: str) -> str:
    """Replaces SGML character entities (&amp;, &lt;, &#2;, etc.) with plain text."""
    for entity, replacement in SGML_ENTITIES.items():
        text = text.replace(entity, replacement)
    return text


def extract_tag_content(text: str, tag_name: str, start_pos: int = 0) -> Tuple[Optional[str], int]:
    """Extracts text between <TAG> and </TAG> starting at `start_pos` (case-insensitive).

    Returns `(inner_text, position_after_closing_tag)` or `(None, start_pos)` if not found.
    """
    open_tag = f"<{tag_name.lower()}>"
    close_tag = f"</{tag_name.lower()}>"
    lower_text = text.lower()

    open_pos = lower_text.find(open_tag, start_pos)
    if open_pos == -1:
        return None, start_pos

    content_start = open_pos + len(open_tag)
    close_pos = lower_text.find(close_tag, content_start)
    if close_pos == -1:
        return None, start_pos

    return text[content_start:close_pos], close_pos + len(close_tag)


def extract_all_tags(text: str, tag_name: str) -> List[str]:
    """Extracts all occurrences of `<TAG>...</TAG>` inside `text`."""
    values: List[str] = []
    pos = 0
    while True:
        val, next_pos = extract_tag_content(text, tag_name, pos)
        if val is None:
            break
        if val.strip():
            values.append(val.strip())
        pos = next_pos
    return values


def extract_attribute(tag_chunk: str, attr_name: str) -> Optional[str]:
    """Extracts an attribute value like `NEWID="12"` from an opening SGML tag."""
    pattern = f'{attr_name.lower()}="'
    attr_pos = tag_chunk.lower().find(pattern)
    if attr_pos == -1:
        return None

    val_start = attr_pos + len(pattern)
    val_end = tag_chunk.find('"', val_start)
    if val_end == -1:
        return None
    return tag_chunk[val_start:val_end]


def _parse_reuters_block(block: str, fallback_id: int) -> Document:
    """Converts a single `<REUTERS ...>...</REUTERS>` SGML block into a `Document`."""
    doc_id = extract_attribute(block, "NEWID") or str(fallback_id)
    title, _ = extract_tag_content(block, "TITLE")
    title = (title or "").strip()

    body, _ = extract_tag_content(block, "BODY")
    if body is None:
        # Fallback for dispatches that contain <TEXT> without a nested <BODY> tag
        text_content, _ = extract_tag_content(block, "TEXT")
        body = (text_content or "").strip()
        if title and body.startswith(title):
            body = body[len(title) :].strip()

    topics_section, _ = extract_tag_content(block, "TOPICS")
    topics = extract_all_tags(topics_section, "D") if topics_section else []

    return Document(doc_id=doc_id, title=title, body=body or "", topics=topics)


def parse_reuters_sgml(content: str) -> List[Document]:
    """Parses a Reuters-21578 SGML string into a list of `Document` objects."""
    decoded = decode_sgml_entities(content)
    lower_content = decoded.lower()
    open_marker = "<reuters"
    close_marker = "</reuters>"

    documents: List[Document] = []
    pos = 0
    counter = 1

    while True:
        start = lower_content.find(open_marker, pos)
        if start == -1:
            break

        end = lower_content.find(close_marker, start)
        if end == -1:
            break

        block_end = end + len(close_marker)
        block = decoded[start:block_end]
        documents.append(_parse_reuters_block(block, fallback_id=counter))

        pos = block_end
        counter += 1

    return documents


def parse_raw_text(content: str, filename: str = "document") -> List[Document]:
    """Splits plain text by blank lines (`\\n\\n`) into individual `Document` records."""
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    if not paragraphs and content.strip():
        paragraphs = [content.strip()]

    documents: List[Document] = []
    for idx, paragraph in enumerate(paragraphs, start=1):
        lines = paragraph.splitlines()
        title = lines[0][:80] if len(lines) > 1 else f"{filename} #{idx}"
        body = "\n".join(lines[1:]) if len(lines) > 1 else paragraph
        documents.append(Document(doc_id=str(idx), title=title, body=body))

    return documents


def parse_document_file(content: str, filename: str = "document") -> List[Document]:
    """Detects Reuters SGML markup vs. plain text and parses the corpus."""
    if "<reuters" in content.lower():
        return parse_reuters_sgml(content)
    return parse_raw_text(content, filename)
