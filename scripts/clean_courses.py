import json
import argparse

EXCLUDED_SLUGS = {
    "coding",
    "ai",
    "arts",
    "leadership",
    "community",
    "free",
    "virtual"
}

def clean_courses(input_path, output_path):
    with open(input_path, "r", encoding="utf-8") as f:
        courses = json.load(f)

    cleaned = []
    seen_urls = set()
    removed = 0

    for course in courses:
        name = course.get("name", "").strip()
        source_url = course.get("source_url", "").strip()

        if not name or not source_url:
            removed += 1
            continue

        slug = source_url.rstrip("/").split("/")[-1].lower()

        if slug in EXCLUDED_SLUGS:
            removed += 1
            continue

        if source_url in seen_urls:
            removed += 1
            continue

        seen_urls.add(source_url)
        cleaned.append(course)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            cleaned,
            f,
            indent=2,
            ensure_ascii=False
        )

    print("Original records:", len(courses))
    print("Removed records:", removed)
    print("Final records:", len(cleaned))
    print("Wrote:", output_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default="live_courses.json"
    )
    parser.add_argument(
        "--output",
        default="opportunities.json"
    )

    args = parser.parse_args()

    clean_courses(
        args.input,
        args.output
    )