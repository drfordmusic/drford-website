"""House color grade for timeline photos ("B2 warm film", chosen by Daniel, November 13, 2026).

Every timeline photo (img/tl-<id>-<width>.jpg) gets the same light treatment so photos
from different decades and cameras read as one roll of film:
    75% of the original color, a 10% wash of the site's brass (#CFA96B), +10% contrast.

The rule: drop a new photo in as img/tl-<id>-<width>.jpg (for example tl-2027-520.jpg and
tl-2027-1040.jpg) and push. The GitHub Action runs this script, which grades any JPG not
yet graded, writes matching .webp and .avif files, and records it in
.github/timeline-graded.txt so nothing is ever graded twice.

Run locally:  python3 .github/scripts/timeline_grade.py
"""
import pathlib
from PIL import Image, ImageEnhance

COLOR, TINT, CONTRAST = 0.75, 0.10, 1.10
BRASS = (207, 169, 107)

ROOT = pathlib.Path(__file__).resolve().parents[2]
IMG = ROOT / "img"
LEDGER = ROOT / ".github" / "timeline-graded.txt"


def grade(im):
    im = ImageEnhance.Color(im.convert("RGB")).enhance(COLOR)
    im = Image.blend(im, Image.new("RGB", im.size, BRASS), TINT)
    return ImageEnhance.Contrast(im).enhance(CONTRAST)


def main():
    done = set(LEDGER.read_text().split()) if LEDGER.exists() else set()
    new = []
    for jpg in sorted(IMG.glob("tl-*-*.jpg")):
        if jpg.name in done:
            continue
        im = grade(Image.open(jpg))
        im.save(jpg, "JPEG", quality=82, progressive=True, optimize=True)
        im.save(jpg.with_suffix(".webp"), "WEBP", quality=80, method=6)
        im.save(jpg.with_suffix(".avif"), "AVIF", quality=55)
        new.append(jpg.name)
        print("graded", jpg.name)
    if new:
        LEDGER.write_text("\n".join(sorted(done | set(new))) + "\n")
    else:
        print("No new timeline photos.")


if __name__ == "__main__":
    main()
