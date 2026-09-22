from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader, PdfWriter


def merge_pdf(files: list[bytes]) -> bytes:
    writer = PdfWriter()
    for raw in files:
        reader = PdfReader(BytesIO(raw))
        for page in reader.pages:
            writer.add_page(page)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()


def split_pdf(file_content: bytes, page_ranges: str) -> bytes:
    reader = PdfReader(BytesIO(file_content))
    pages = _parse_ranges(page_ranges, len(reader.pages))
    writer = PdfWriter()
    for page_index in pages:
        writer.add_page(reader.pages[page_index])
    out = BytesIO()
    writer.write(out)
    return out.getvalue()


def rotate_pdf(file_content: bytes, degrees: int, pages_spec: str = "all") -> bytes:
    reader = PdfReader(BytesIO(file_content))
    writer = PdfWriter()
    selected = (
        list(range(len(reader.pages)))
        if pages_spec.strip().lower() == "all"
        else _parse_ranges(pages_spec, len(reader.pages))
    )
    for index, page in enumerate(reader.pages):
        if index in selected:
            page.rotate(degrees)
        writer.add_page(page)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()


def protect_pdf(file_content: bytes, password: str) -> bytes:
    reader = PdfReader(BytesIO(file_content))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(password)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()


def unlock_pdf(file_content: bytes, password: str) -> bytes:
    reader = PdfReader(BytesIO(file_content))
    if reader.is_encrypted:
        result = reader.decrypt(password)
        if result == 0:
            raise ValueError("Incorrect password.")
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()


def _parse_ranges(raw: str, max_pages: int) -> list[int]:
    if not raw:
        raise ValueError("Page range is required.")
    selected: set[int] = set()
    for token in [t.strip() for t in raw.split(",") if t.strip()]:
        if token.isdigit():
            idx = int(token) - 1
            if 0 <= idx < max_pages:
                selected.add(idx)
            continue
        if "-" in token:
            start_raw, end_raw = [x.strip() for x in token.split("-", 1)]
            if not (start_raw.isdigit() and end_raw.isdigit()):
                continue
            start = int(start_raw) - 1
            end = int(end_raw) - 1
            if start > end:
                start, end = end, start
            for idx in range(start, end + 1):
                if 0 <= idx < max_pages:
                    selected.add(idx)
    if not selected:
        raise ValueError("No valid pages selected.")
    return sorted(selected)
