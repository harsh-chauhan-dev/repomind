from app.chunking import chunk_code


def test_chunking_preserves_line_ranges_and_symbols() -> None:
    chunks = chunk_code("src/example.py", "def first():\n    return 1\n\ndef second():\n    return 2\n", "python", max_lines=3, overlap=1)
    assert chunks
    assert chunks[0].start_line == 1
    assert chunks[0].symbol_name == "first"
    assert all(chunk.start_line <= chunk.end_line for chunk in chunks)


def test_empty_file_has_no_chunks() -> None:
    assert chunk_code("empty.py", "") == []
