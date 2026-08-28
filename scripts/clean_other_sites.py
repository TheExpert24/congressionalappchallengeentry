import json
import re

INPUT_FILE = "new_courses.json"
OUTPUT_FILE = "new_courses_clean.json"

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
    "Tournament"
}

BAD_NAMES = {
    "",
    "HOW IT WORKS",
    "WHERE IT WORKS"
}

def clean_text(value):
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value).strip()

def normalize_grade(value):
    value = clean_text(value)
    if not value:
        return ""

    value = value.replace("grade ", "Grade ")
    value = value.replace("grades ", "Grades ")
    value = value.replace("Grade ", "Grade ")
    value = value.replace("Grades ", "Grades ")

    return value

def normalize_age(value):
    value = clean_text(value)
    if not value:
        return ""

    value = value.replace("ages ", "Ages ")
    value = value.replace("age ", "Age ")

    return value

def clean_categories(categories):
    if not isinstance(categories, list):
        return []

    cleaned = []

    for category in categories:
        category = clean_text(category)

        if category in ALLOWED_CATEGORIES and category not in cleaned:
            cleaned.append(category)

    return cleaned

def clean_record(record):
    cleaned = {
        "name": clean_text(record.get("name")),
        "organization": clean_text(record.get("organization")),
        "description": clean_text(record.get("description")),
        "type": clean_text(record.get("type")),
        "categories": clean_categories(record.get("categories")),
        "location": clean_text(record.get("location")),
        "cost": clean_text(record.get("cost")),
        "deadline": clean_text(record.get("deadline")),
        "eligibility": clean_text(record.get("eligibility")),
        "grade": normalize_grade(record.get("grade")),
        "age": normalize_age(record.get("age")),
        "official_url": clean_text(record.get("official_url")),
        "source_url": clean_text(record.get("source_url")),
        "slug": clean_text(record.get("slug"))
    }

    if not cleaned["name"] or cleaned["name"] in BAD_NAMES:
        title = cleaned["source_url"].rstrip("/").split("/")[-1]
        title = title.replace("-", " ").strip()

        if title:
            cleaned["name"] = title.title()

    if not cleaned["organization"]:
        if "firstinspires.org" in cleaned["source_url"]:
            cleaned["organization"] = "FIRST"
        elif "destinationimagination.org" in cleaned["source_url"]:
            cleaned["organization"] = "Destination Imagination"
        elif "mathcounts.org" in cleaned["source_url"]:
            cleaned["organization"] = "MATHCOUNTS Foundation"
        elif "ayso.org" in cleaned["source_url"]:
            cleaned["organization"] = "American Youth Soccer Organization"
        elif "cafirst.org" in cleaned["source_url"]:
            cleaned["organization"] = "FIRST Robotics - California"

    if not cleaned["slug"] and cleaned["name"]:
        cleaned["slug"] = re.sub(
            r"[^a-z0-9]+",
            "-",
            cleaned["name"].lower()
        ).strip("-")

    if cleaned["grade"] and not cleaned["eligibility"]:
        cleaned["eligibility"] = cleaned["grade"]

    return cleaned

def deduplicate(records):
    seen = set()
    result = []

    for record in records:
        key = (
            record.get("official_url", "").lower().rstrip("/")
            or record.get("name", "").lower()
        )

        if key in seen:
            continue

        seen.add(key)
        result.append(record)

    return result

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

cleaned = []

for record in data:
    if not isinstance(record, dict):
        continue

    record = clean_record(record)

    if not record["name"]:
        continue

    if not record["description"]:
        continue

    cleaned.append(record)

cleaned = deduplicate(cleaned)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(cleaned, f, indent=2, ensure_ascii=False)

print(f"Wrote {len(cleaned)} cleaned records to {OUTPUT_FILE}")