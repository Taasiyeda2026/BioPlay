#!/usr/bin/env python3
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Missing dependency: Pillow (pip install Pillow).") from exc


def convert(root: Path) -> int:
    count = 0
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        out = path.with_suffix(".webp")
        if out.exists():
            continue
        with Image.open(path) as img:
            img.save(out, format="WEBP", quality=90, method=6)
        count += 1
    return count


if __name__ == "__main__":
    total = convert(Path("public"))
    print(f"created {total} webp files")
