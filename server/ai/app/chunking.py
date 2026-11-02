from dataclasses import dataclass
import re


@dataclass(frozen=True)
class CodeChunk:
    index: int
    content: str
    start_line: int
    end_line: int
    symbol_name: str | None
    metadata: dict[str, str | int]


SYMBOL_PATTERNS = (
    re.compile(r"^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)"),
    re.compile(r"^\s*class\s+([A-Za-z_]\w*)"),
    re.compile(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_]\w*)"),
    re.compile(r"^\s*(?:export\s+)?class\s+([A-Za-z_]\w*)"),
    re.compile(r"^\s*(?:public|private|protected|static|async\s+)*\s*([A-Za-z_]\w*)\s*\([^)]*\)\s*\{"),
)


def chunk_code(path: str, content: str, language: str | None = None, max_lines: int = 80, overlap: int = 12) -> list[CodeChunk]:
    """Split code on line boundaries, preferring symbol starts and retaining exact line ranges."""
    lines = content.splitlines()
    if not lines:
        return []
    symbols: dict[int, str] = {}
    for number, line in enumerate(lines, 1):
        for pattern in SYMBOL_PATTERNS:
            match = pattern.match(line)
            if match:
                symbols[number] = match.group(1)
                break
    chunks: list[CodeChunk] = []
    start = 1
    index = 0
    while start <= len(lines):
        end = min(len(lines), start + max_lines - 1)
        if end < len(lines):
            candidates = [line for line in symbols if start + max_lines // 2 <= line <= end]
            if candidates:
                end = max(candidates) - 1
        if end < start:
            end = min(len(lines), start + max_lines - 1)
        chunk_text = "\n".join(lines[start - 1:end]).strip("\n")
        if chunk_text:
            symbol = symbols.get(start) or next((symbols[line] for line in sorted(symbols) if start <= line <= end), None)
            chunks.append(CodeChunk(index, chunk_text, start, end, symbol, {"path": path, "language": language or "unknown"}))
            index += 1
        next_start = end - overlap + 1
        start = max(start + 1, next_start)
    return chunks
