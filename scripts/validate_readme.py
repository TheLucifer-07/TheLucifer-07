#!/usr/bin/env python3
"""Validate GitHub profile README structure, ASCII blocks, widths, and links."""

from __future__ import annotations

import argparse
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
TARGET_WIDTHS = (80, 75, 70, 60)
REQUIRED_HEADINGS = (
    "01 / WHOAMI",
    "02 / PHILOSOPHY",
    "03 / TECH STACK",
    "04 / CURRENT FOCUS",
    "05 / A BIT MORE",
    "06 / LANDSCAPE",
    "07 / CONNECTIONS",
)
LINK_RE = re.compile(r"\[[^\]]+\]\((https?://[^)]+|mailto:[^)]+)\)")
ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
RAW_HTML_RE = re.compile(r"</?[A-Za-z][^>]*>")


def extract_code_blocks(markdown: str) -> tuple[list[list[str]], list[str]]:
    blocks: list[list[str]] = []
    errors: list[str] = []
    current: list[str] | None = None
    for line_no, line in enumerate(markdown.splitlines(), 1):
        if line.startswith("```"):
            if current is None:
                current = []
            else:
                blocks.append(current)
                current = None
        elif current is not None:
            current.append(line)
    if current is not None:
        errors.append("Unclosed fenced code block")
    return blocks, errors


def validate_frames(blocks: list[list[str]]) -> list[str]:
    errors: list[str] = []
    for block_no, block in enumerate(blocks, 1):
        for top_no, top in enumerate(block):
            if len(top) < 5 or not (top.startswith("+") and top.endswith("+")):
                continue
            for bottom_no in range(top_no + 1, len(block)):
                bottom = block[bottom_no]
                if (
                    not bottom.startswith("+")
                    or not bottom.endswith("+")
                    or set(bottom) - {"+", "-"}
                ):
                    continue
                if len(bottom) != len(top):
                    errors.append(
                        f"Code block {block_no}: frame width differs ({len(top)} vs {len(bottom)} columns)"
                    )
                    break
                boundary_columns = [i for i, char in enumerate(bottom) if char == "+"]
                body = block[top_no + 1 : bottom_no]
                aligned = all(
                    not line or (len(line) == len(bottom) and all(line[col] == "|" for col in boundary_columns))
                    for line in body
                )
                if aligned:
                    print(f"PASS: code block {block_no} frame alignment ({len(body)} content lines)")
                else:
                    errors.append(f"Code block {block_no}: frame between lines {top_no + 1} and {bottom_no + 1} is misaligned")
                break
    return errors


def validate_link(url: str) -> tuple[str, str]:
    if url.startswith("mailto:"):
        address = url.removeprefix("mailto:")
        if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", address):
            return "unverified", "valid mailto syntax; delivery cannot be checked over HTTP"
        return "fail", "invalid mailto address syntax"
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "README-validator/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            return ("pass" if 200 <= response.status < 400 else "fail"), f"HTTP {response.status}"
    except urllib.error.HTTPError as exc:
        if exc.code == 999:
            return "unverified", "LinkedIn blocks automated requests with HTTP 999"
        if exc.code in (403, 405, 429):
            fallback = urllib.request.Request(
                url, headers={"User-Agent": "README-validator/1.0", "Range": "bytes=0-0"}
            )
            try:
                with urllib.request.urlopen(fallback, timeout=12) as response:
                    return ("pass" if 200 <= response.status < 400 else "fail"), f"GET HTTP {response.status} after HEAD {exc.code}"
            except Exception as fallback_exc:  # Report the server response; do not hide it.
                if isinstance(fallback_exc, urllib.error.HTTPError) and fallback_exc.code == 999:
                    return "unverified", "LinkedIn blocks automated requests with HTTP 999"
                return "fail", f"HEAD HTTP {exc.code}; GET {type(fallback_exc).__name__}: {fallback_exc}"
        return "fail", f"HTTP {exc.code}"
    except Exception as exc:
        return "fail", f"{type(exc).__name__}: {exc}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-links", action="store_true", help="Make network requests for Markdown links")
    args = parser.parse_args()
    markdown = README.read_text(encoding="utf-8")
    errors: list[str] = []
    blocks, fence_errors = extract_code_blocks(markdown)
    errors.extend(fence_errors)
    errors.extend(validate_frames(blocks))
    if not blocks:
        errors.append("No fenced ASCII artwork blocks found")

    max_width = 0
    for block_no, block in enumerate(blocks, 1):
        for line_no, line in enumerate(block, 1):
            max_width = max(max_width, len(line))
            if not line.isascii():
                errors.append(f"Code block {block_no}, line {line_no}: non-ASCII character")
            if "\t" in line:
                errors.append(f"Code block {block_no}, line {line_no}: tab character")
            if line.rstrip() != line:
                errors.append(f"Code block {block_no}, line {line_no}: trailing whitespace")
            if ANSI_RE.search(line):
                errors.append(f"Code block {block_no}, line {line_no}: ANSI escape sequence")
    for width in TARGET_WIDTHS:
        over = [(i, len(line)) for i, block in enumerate(blocks, 1) for line in block if len(line) > width]
        if over:
            errors.append(f"{width}-column check failed: {len(over)} code line(s) exceed width")
        else:
            print(f"PASS: {width}-column code-block fit")

    for heading in REQUIRED_HEADINGS:
        match = re.search(rf"^## {re.escape(heading)}\s*$", markdown, re.MULTILINE)
        if not match:
            errors.append(f"Missing section heading: {heading}")
            continue
        next_heading = re.search(r"^## ", markdown[match.end() :], re.MULTILINE)
        end = match.end() + next_heading.start() if next_heading else len(markdown)
        if not markdown[match.end() : end].strip():
            errors.append(f"Empty section: {heading}")

    in_fence = False
    blank_run = 0
    for line in markdown.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            blank_run = 0
        elif not in_fence:
            if "<script" in line.lower() or "<style" in line.lower():
                errors.append("Unsupported script/style HTML found outside a code block")
            if RAW_HTML_RE.search(line):
                errors.append("Raw HTML found outside a code block; this README uses Markdown only")
            if not line.strip():
                blank_run += 1
                if blank_run == 3:
                    errors.append("Inconsistent spacing: three or more consecutive blank prose lines")
            else:
                blank_run = 0

    links = LINK_RE.findall(markdown)
    if not links:
        errors.append("No Markdown links found")
    print(f"Code blocks: {len(blocks)}; maximum line width: {max_width} columns")
    print(f"Markdown links: {len(links)}")
    if args.check_links:
        for url in links:
            status, detail = validate_link(url)
            print(f"{status.upper()}: {url} ({detail})")
            if status == "fail":
                errors.append(f"Link check failed: {url} ({detail})")
    else:
        print("Link reachability not checked (pass --check-links to enable network checks)")

    if errors:
        for error in errors:
            print(f"FAIL: {error}", file=sys.stderr)
        return 1
    print("PASS: Markdown structure, required sections, ASCII blocks, and ANSI checks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
