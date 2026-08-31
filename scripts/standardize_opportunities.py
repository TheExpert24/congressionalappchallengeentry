from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT / "website" / "all_opportunities.json"
OUTPUT_PATH = ROOT / "website" / "all_opportunities.json"

ALLOWED_CATEGORIES = {
    "Computer Science",
    "STEM",
    "Robotics",
    "Engineering",
    "Mathematics",
    "Science",
    "Art",
    "Music",
    "Film",
    "Writing",
    "Journalism",
    "Business",
    "Economics",
    "Entrepreneurship",
    "Debate",
    "Politics",
    "Law",
    "Psychology",
    "Environment",
    "Sports",
    "Competition",
    "Tournament",
}

CATEGORY_ALIASES = {
    "computer science": "Computer Science",
    "cs": "Computer Science",
    "stem": "STEM",
    "robotics": "Robotics",
    "engineering": "Engineering",
    "math": "Mathematics",
    "mathematics": "Mathematics",
    "science": "Science",
    "art": "Art",
    "music": "Music",
    "film": "Film",
    "writing": "Writing",
    "journalism": "Journalism",
    "business": "Business",
    "economics": "Economics",
    "entrepreneurship": "Entrepreneurship",
    "debate": "Debate",
    "politics": "Politics",
    "law": "Law",
    "psychology": "Psychology",
    "environment": "Environment",
    "sports": "Sports",
    "competition": "Competition",
    "tournament": "Tournament",
}

LOW_QUALITY_PATTERNS = [
    "access temporarily blocked",
    "security service to protect against malicious bots",
    "this website uses a security service",
    "page not found",
    "domain may be for sale",
    "you did nothing wrong",
    "this can happen on school or district networks using content filters",
    "store data (e.g. cookie for user session)",
    "must be logged in to the website",
    "for informational and reviewing purposes only",
    "not a bot",
]


def clean_text(value):
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    value = value.replace("\u2013", "-").replace("\u2014", "-").replace("\u2015", "-")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def normalize_url(value):
    value = clean_text(value)
    if not value:
        return ""
    return value.rstrip("/")


def normalize_categories(raw_categories):
    if not isinstance(raw_categories, list):
        return []

    cleaned = []
    seen = set()

    for item in raw_categories:
        text = clean_text(item).strip()
        if not text:
            continue
        normalized = CATEGORY_ALIASES.get(text.lower(), text)
        if normalized in ALLOWED_CATEGORIES and normalized not in seen:
            cleaned.append(normalized)
            seen.add(normalized)

    return cleaned


def normalize_type(raw_type):
    value = clean_text(raw_type).lower()
    if not value:
        return "Other"

    if "scholarship" in value or "awards" in value or "fellowship" in value:
        return "Scholarship"
    if "internship" in value or "research program" in value:
        return "Internship"
    if "camp" in value:
        return "Camp"
    if "competition" in value or "tournament" in value or "challenge" in value or "olympiad" in value or "contest" in value:
        return "Competition"
    if "program" in value or "academy" in value or "series" in value or "initiative" in value or "club" in value or "school" in value:
        return "Program"
    if "workshop" in value or "conference" in value or "summit" in value:
        return "Workshop"
    if "lab" in value:
        return "Program"
    return "Other"


def normalize_grade(raw_grade):
    value = clean_text(raw_grade)
    if not value:
        return ""

    value = value.replace("&ndash;", "-").replace("&mdash;", "-")
    value = value.replace("–", "-").replace("—", "-")
    value = re.sub(r"\s+", " ", value)
    value = value.replace(" through ", "-")
    value = value.replace(" to ", "-")
    value = re.sub(r"\s*;\s*", "; ", value)
    value = re.sub(r"\s*:\s*", ": ", value)

    if value.lower().startswith("grade "):
        value = value[6:]
    elif value.lower().startswith("grades "):
        value = value[7:]
    elif value.lower().startswith("k-") or value.lower().startswith("pre-k"):
        pass

    return value.strip()


def normalize_age(raw_age):
    value = clean_text(raw_age)
    if not value:
        return ""
    value = value.replace("–", "-").replace("—", "-")
    return value


def slugify(value):
    text = clean_text(value).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def is_low_quality(record):
    name = clean_text(record.get("name", "")).lower()
    description = clean_text(record.get("description", "")).lower()
    org = clean_text(record.get("organization", "")).lower()
    text = f"{name} {description} {org}"

    if not name or not description:
        return True
    if len(description) < 30:
        return True
    if not record.get("official_url") and not record.get("source_url"):
        return True
    if any(pattern in text for pattern in LOW_QUALITY_PATTERNS):
        return True
    if text.startswith("www.") or text.startswith("scienceolympiad.org"):
        return True
    return False


def dedupe(records):
    seen = set()
    unique = []

    for record in records:
        key = ""
        for field in ("official_url", "source_url", "slug", "name"):
            value = normalize_url(record.get(field, "")) or record.get(field, "")
            if value:
                key = clean_text(str(value)).lower()
                break

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)
        unique.append(record)

    return unique


def clean_record(record):
    if not isinstance(record, dict):
        return None

    cleaned = {
        "name": clean_text(record.get("name", "")),
        "organization": clean_text(record.get("organization", "")),
        "description": clean_text(record.get("description", "")),
        "type": normalize_type(record.get("type", "")),
        "categories": normalize_categories(record.get("categories", [])),
        "location": clean_text(record.get("location", "")),
        "cost": clean_text(record.get("cost", "")),
        "deadline": clean_text(record.get("deadline", "")),
        "eligibility": clean_text(record.get("eligibility", "")),
        "grade": normalize_grade(record.get("grade", "")),
        "age": normalize_age(record.get("age", "")),
        "official_url": normalize_url(record.get("official_url", "")),
        "source_url": normalize_url(record.get("source_url", "")),
        "slug": slugify(record.get("slug") or record.get("name", "")),
    }

    if not cleaned["name"]:
        cleaned["name"] = clean_text(record.get("source_url", "")).split("/")[-1].replace("-", " ").title()

    if not cleaned["organization"]:
        source = cleaned["source_url"] or cleaned["official_url"]
        if source:
            for domain_name, org in {
                "firstinspires.org": "FIRST",
                "destinationimagination.org": "Destination Imagination",
                "mathcounts.org": "MATHCOUNTS Foundation",
                "vexrobotics.com": "VEX Robotics",
            }.items():
                if domain_name in source:
                    cleaned["organization"] = org
                    break

    if not cleaned["slug"] and cleaned["name"]:
        cleaned["slug"] = slugify(cleaned["name"])

    return cleaned


with INPUT_PATH.open("r", encoding="utf-8") as f:
    data = json.load(f)

cleaned = []
for item in data:
    record = clean_record(item)
    if not record:
        continue
    if is_low_quality(record):
        continue
    cleaned.append(record)

cleaned = dedupe(cleaned)

with OUTPUT_PATH.open("w", encoding="utf-8") as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=2)

print(f"Original records: {len(data)}")
print(f"Cleaned records: {len(cleaned)}")
print(f"Output written to: {OUTPUT_PATH}")
