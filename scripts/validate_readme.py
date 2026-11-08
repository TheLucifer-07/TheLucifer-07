#!/usr/bin/env python3
"""Check the profile README, artwork, icons, and public links."""

from __future__ import annotations

import argparse
import json
import re
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
TICK = chr(96)
FENCE = TICK * 3
REQUIRED_HEADINGS = tuple(
    "## " + TICK + "> " + name + TICK
    for name in ("whoami", "philosophy", "tech_stack --view", "focus --now", "a_bit_more", "connect")
)
REQUIRED_TEXT = (
    "Hemachandu Animireddy",
    "Visakhapatnam, India",
    "Learn Deeply.",
    "Build Thoughtfully.",
    "Solve Meaningfully.",
    "Open to Collaborate",
)
TECHNOLOGIES = (
    "java", "javascript", "python", "sql", "react",
    "mongodb", "postgresql", "springboot", "nodedotjs", "docker",
)
EXPECTED_LINKS = {
    "https://github.com/TheLucifer-07",
    "https://www.linkedin.com/in/hemachandu-animireddy",
    "https://portfolio-3005.vercel.app",
    "mailto:hemachanduanimireddy@gmail.com",
}
MAX_ASSET_BYTES = 500_000
ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
RAW_HTML_RE = re.compile(r"</?[A-Za-z][^>]*>")


def markdown_images(markdown: str) -> list[tuple[str, str]]:
    return re.findall(r"!\[([^\]]*)\]\(([^)]+)\)", markdown)


def markdown_links(markdown: str) -> set[str]:
    return set(re.findall(r"(?<!!)\[[^\]]+\]\((https?://[^)]+|mailto:[^)]+)\)", markdown))


def validate_png(path: Path) -> list[str]:
    data = path.read_bytes()
    signature = [137, 80, 78, 71, 13, 10, 26, 10]
    if list(data[:8]) != signature:
        return ["Invalid PNG signature: " + str(path.relative_to(ROOT))]
    if len(data) < 24:
        return ["Truncated PNG header: " + str(path.relative_to(ROOT))]
    width, height = struct.unpack(">II", data[16:24])
    errors = []
    if width < 1 or height < 1:
        errors.append("Invalid PNG dimensions: " + str(path.relative_to(ROOT)))
    if len(data) > MAX_ASSET_BYTES:
        errors.append("PNG exceeds 500 KB: " + str(path.relative_to(ROOT)))
    return errors


def validate_svg(path: Path) -> list[str]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return ["Invalid SVG " + str(path.relative_to(ROOT)) + ": " + str(exc)]
    if not root.tag.endswith("svg"):
        return ["Missing SVG root: " + str(path.relative_to(ROOT))]
    if not any(node.tag.endswith(("path", "rect", "ellipse", "circle")) for node in root.iter()):
        return ["No drawable mark in " + str(path.relative_to(ROOT))]
    return []


def validate_local_images(markdown: str) -> tuple[list[str], list[Path]]:
    errors: list[str] = []
    image_paths: list[Path] = []
    for alt_text, destination in markdown_images(markdown):
        if not alt_text.strip():
            errors.append("Image is missing useful alt text: " + destination)
        if destination.startswith(("https://", "http://", "data:")):
            errors.append("README image must use a local path: " + destination)
            continue
        local_path = (ROOT / destination).resolve()
        if ROOT not in local_path.parents:
            errors.append("Image path escapes the repository: " + destination)
            continue
        if not local_path.is_file():
            errors.append("Missing local image: " + destination)
            continue
        image_paths.append(local_path)
        if local_path.suffix.lower() == ".png":
            errors.extend(validate_png(local_path))
    return errors, image_paths


def validate_link(url: str) -> tuple[str, str]:
    if url.startswith("mailto:"):
        address = url.removeprefix("mailto:")
        if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", address):
            return "unverified", "valid mailto syntax; delivery cannot be checked over HTTP"
        return "fail", "invalid mailto syntax"
    request = urllib.request.Request(
        url, method="HEAD", headers={"User-Agent": "README-validator/1.0"}
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return ("pass" if 200 <= response.status < 400 else "fail"), "HTTP " + str(response.status)
    except urllib.error.HTTPError as exc:
        if exc.code == 999:
            return "unverified", "LinkedIn blocks automated requests with HTTP 999"
        if exc.code in (403, 405, 429):
            return "unverified", "site blocks automated HEAD request with HTTP " + str(exc.code)
        if 500 <= exc.code < 600:
            parsed = urllib.parse.urlparse(url)
            path_parts = [part for part in parsed.path.split("/") if part]
            if parsed.hostname == "github.com" and path_parts:
                api_url = "https://api.github.com/users/" + path_parts[0]
                api_request = urllib.request.Request(
                    api_url, headers={"User-Agent": "README-validator/1.0"}
                )
                try:
                    with urllib.request.urlopen(api_request, timeout=12) as response:
                        profile = json.load(response)
                    if profile.get("login", "").lower() == path_parts[0].lower():
                        return (
                            "unverified",
                            "GitHub API confirms the handle; profile page returned HTTP " + str(exc.code),
                        )
                except Exception:
                    pass
            return "unverified", "server/proxy returned HTTP " + str(exc.code)
        return "fail", "HTTP " + str(exc.code)
    except Exception as exc:
        return "fail", type(exc).__name__ + ": " + str(exc)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-links", action="store_true", help="Probe public Markdown links")
    args = parser.parse_args()
    markdown = README.read_text(encoding="utf-8")
    errors: list[str] = []
    lines = markdown.splitlines()

    fence_count = sum(1 for line in lines if line.startswith(FENCE))
    if fence_count % 2:
        errors.append("Unclosed fenced code block")
    inside_fence = False
    for line_no, line in enumerate(lines, 1):
        if line.startswith(FENCE):
            inside_fence = not inside_fence
            continue
        if inside_fence:
            if len(line) > 80:
                errors.append("Code block line " + str(line_no) + " exceeds 80 columns")
            if "\t" in line or line.rstrip() != line:
                errors.append("Code block line " + str(line_no) + " has a tab or trailing whitespace")
            if ANSI_RE.search(line):
                errors.append("Code block line " + str(line_no) + " contains an ANSI escape sequence")

    for heading in REQUIRED_HEADINGS:
        if heading not in markdown:
            errors.append("Missing section heading: " + heading)
        else:
            start = markdown.find(heading)
            next_heading = markdown.find("\n## ", start + len(heading))
            section_end = next_heading if next_heading >= 0 else len(markdown)
            if not markdown[start + len(heading) : section_end].strip():
                errors.append("Empty section: " + heading)
    for required in REQUIRED_TEXT:
        if required not in markdown:
            errors.append("Missing requested profile content: " + required)

    image_errors, image_paths = validate_local_images(markdown)
    errors.extend(image_errors)
    if len(image_paths) != 12:
        errors.append("Expected 12 local images (2 scenes and 10 icons); found " + str(len(image_paths)))
    referenced_icons = {
        path.name.rsplit(".", 1)[0]
        for path in image_paths
        if path.parent.name == "icons"
    }
    missing_icons = sorted(set(TECHNOLOGIES) - referenced_icons)
    if missing_icons:
        errors.append("Missing technology PNGs: " + ", ".join(missing_icons))

    expected_dimensions = {
        "hero-ascii.png": (1280, 470),
        "footer-landscape.png": (1280, 245),
    }
    for filename, expected in expected_dimensions.items():
        path = ROOT / "assets" / filename
        if not path.is_file():
            errors.append("Missing generated artwork: " + filename)
            continue
        data = path.read_bytes()
        if len(data) >= 24:
            width, height = struct.unpack(">II", data[16:24])
            if (width, height) != expected:
                errors.append(
                    filename + " is " + str(width) + "x" + str(height)
                    + "; expected " + str(expected[0]) + "x" + str(expected[1])
                )

    for technology in TECHNOLOGIES:
        svg = ROOT / "assets" / "icons" / (technology + ".svg")
        png = ROOT / "assets" / "icons" / (technology + ".png")
        if not svg.is_file() or not png.is_file():
            errors.append("Technology icon source/export missing: " + technology)
        else:
            errors.extend(validate_svg(svg))
            errors.extend(validate_png(png))

    links = markdown_links(markdown)
    if links != EXPECTED_LINKS:
        for missing in sorted(EXPECTED_LINKS - links):
            errors.append("Missing expected profile link: " + missing)
        for extra in sorted(links - EXPECTED_LINKS):
            errors.append("Unexpected external link: " + extra)

    if RAW_HTML_RE.search(markdown):
        errors.append("Raw HTML found; use standard GitHub Markdown")
    if "<script" in markdown.lower() or "<style" in markdown.lower():
        errors.append("Script/style markup is not supported by GitHub README rendering")
    if any(line.lstrip().startswith("|") for line in lines):
        errors.append("Markdown table found; avoid a fixed-width mobile layout")
    if "github-readme-stats" in markdown or "shields.io" in markdown:
        errors.append("External badges/widgets are not part of this profile design")

    print("Local images: " + str(len(image_paths)))
    print("Technology icon pairs: " + str(len(TECHNOLOGIES)))
    print("Markdown links: " + str(len(links)))
    if args.check_links:
        for url in sorted(links):
            status, detail = validate_link(url)
            print(status.upper() + ": " + url + " (" + detail + ")")
            if status == "fail":
                errors.append("Link check failed: " + url + " (" + detail + ")")
    else:
        print("Link reachability not checked (pass --check-links to enable)")

    if errors:
        for error in errors:
            print("FAIL: " + error, file=sys.stderr)
        return 1
    print("PASS: Markdown structure, mobile-safe layout, local images, and icon assets")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
