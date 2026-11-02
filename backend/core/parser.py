"""Dataset Parser for Reuters-21578 and raw text files.
Implemented from scratch without external libraries (no BeautifulSoup, no lxml).
"""

from typing import Dict, List, Optional, Tuple


class Document:
    """Represents an ingested document in the search engine."""
    def __init__(self, doc_id: str, title: str = "", body: str = "", topics: Optional[List[str]] = None):
        self.doc_id = str(doc_id)
        self.title = title.strip()
        self.body = body.strip()
        self.topics = topics or []

    @property
    def full_text(self) -> str:
        """Returns combined title and body for indexing."""
        if self.title and self.body:
            return f"{self.title}\n{self.body}"
        return self.title or self.body or ""

    def to_dict(self) -> Dict:
        return {
            "doc_id": self.doc_id,
            "title": self.title,
            "body": self.body,
            "topics": self.topics,
            "preview": (self.body[:200] + "...") if len(self.body) > 200 else self.body
        }


def decode_sgml_entities(text: str) -> str:
    """Manually decodes common SGML / XML entities without external libraries."""
    entities = {
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&",
        "&quot;": "\"",
        "&apos;": "'",
        "&#2;": "",      # STX control char in Reuters
        "&#3;": "",      # ETX control char in Reuters
        "&reuter;": "",
    }
    for ent, replacement in entities.items():
        text = text.replace(ent, replacement)
    return text


def extract_tag_content(text: str, tag_name: str, start_pos: int = 0) -> Tuple[Optional[str], int]:
    """
    Extracts the content between <TAG> and </TAG> starting from start_pos.
    Returns (content, end_pos_of_closing_tag).
    """
    open_tag = f"<{tag_name.upper()}>"
    close_tag = f"</{tag_name.upper()}>"
    
    # Case-insensitive search for open tag
    lower_text = text.lower()
    lower_open = open_tag.lower()
    lower_close = close_tag.lower()

    pos_open = lower_text.find(lower_open, start_pos)
    if pos_open == -1:
        return None, start_pos

    content_start = pos_open + len(open_tag)
    pos_close = lower_text.find(lower_close, content_start)
    if pos_close == -1:
        return None, start_pos

    content = text[content_start:pos_close]
    return content, pos_close + len(close_tag)


def parse_reuters_sgml(content: str) -> List[Document]:
    """
    Parses a Reuters-21578 SGML string into a list of Document objects.
    Extracts NEWID, TITLE, BODY, and TOPICS purely with manual string searching.
    """
    content = decode_sgml_entities(content)
    documents: List[Document] = []
    
    pos = 0
    lower_content = content.lower()
    reuters_open_tag = "<reuters"
    reuters_close_tag = "</reuters>"

    doc_counter = 1

    while True:
        reuters_start = lower_content.find(reuters_open_tag, pos)
        if reuters_start == -1:
            break

        reuters_end = lower_content.find(reuters_close_tag, reuters_start)
        if reuters_end == -1:
            break

        doc_chunk = content[reuters_start : reuters_end + len(reuters_close_tag)]
        lower_chunk = doc_chunk.lower()

        # Extract NEWID or fallback to counter
        newid_idx = lower_chunk.find("newid=\"")
        doc_id = str(doc_counter)
        if newid_idx != -1:
            id_start = newid_idx + 7
            id_end = doc_chunk.find("\"", id_start)
            if id_end != -1:
                doc_id = doc_chunk[id_start:id_end]

        # Extract TITLE
        title, _ = extract_tag_content(doc_chunk, "TITLE")
        title = title or ""

        # Extract BODY
        body, _ = extract_tag_content(doc_chunk, "BODY")
        if body is None:
            # Some documents only have TEXT without BODY tag
            text_tag, _ = extract_tag_content(doc_chunk, "TEXT")
            body = text_tag or ""
            # Strip title from body if duplicated
            if title and body.startswith(title):
                body = body[len(title):]

        # Extract TOPICS
        topics_chunk, _ = extract_tag_content(doc_chunk, "TOPICS")
        topics = []
        if topics_chunk:
            t_pos = 0
            while True:
                d_val, end_d = extract_tag_content(topics_chunk, "D", t_pos)
                if d_val is None:
                    break
                topics.append(d_val.strip())
                t_pos = end_d

        doc = Document(
            doc_id=doc_id,
            title=title.strip(),
            body=body.strip(),
            topics=topics
        )
        documents.append(doc)

        pos = reuters_end + len(reuters_close_tag)
        doc_counter += 1

    return documents


def parse_raw_text(content: str, filename: str = "document") -> List[Document]:
    """
    Parses plain text content. If it contains lines or paragraphs,
    treats each non-empty section as a document, or the whole file as 1 document.
    """
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [content.strip()] if content.strip() else []

    docs = []
    for i, p in enumerate(paragraphs, start=1):
        lines = p.split("\n")
        title = lines[0][:80] if len(lines) > 1 else f"{filename} #{i}"
        body = "\n".join(lines[1:]) if len(lines) > 1 else p
        docs.append(Document(doc_id=str(i), title=title, body=body))
    return docs


def parse_document_file(content: str, filename: str) -> List[Document]:
    """
    Automatically detects the file format (.sgm, .xml, .txt) and parses documents.
    """
    lower_content = content.lower()
    if "<reuters" in lower_content:
        return parse_reuters_sgml(content)
    return parse_raw_text(content, filename)

