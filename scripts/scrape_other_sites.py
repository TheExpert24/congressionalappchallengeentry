#!/usr/bin/env python3

import asyncio
import json
import re
import argparse
from urllib.parse import urlparse
from playwright.async_api import async_playwright


def clean_text(text):
    return re.sub(r"\s+", " ", text or "").strip()


def extract_first_match(text, patterns):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if match:
            return clean_text(match.group(1))
    return ""


def extract_cost(text):
    patterns = [
        r"(?:cost|price|fee|registration fee|program fee)\s*[:\-]?\s*(free|no cost)",
        r"(?:cost|price|fee|registration fee|program fee)\s*[:\-]?\s*(\$\s?\d+(?:[,.]\d{2})?)",
        r"(free)\s+(?:to participate|program|registration|of charge)",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return clean_text(match.group(1))

    return ""


def extract_age(text):
    patterns = [
        r"(ages?\s+\d+\s*[-–]\s*\d+)",
        r"(ages?\s+\d+\s*(?:and up|\+))",
        r"(age\s+\d+\s*[-–]\s*\d+)",
        r"(ages?\s+\d+)",
    ]

    values = []

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            value = clean_text(match.group(1))
            if value not in values:
                values.append(value)

    if values:
        return "; ".join(values[:3])

    return ""


def extract_grade(text):
    patterns = [
        r"(grades?\s+(?:pre[- ]?k|k)\s*[-–]\s*\d+)",
        r"(grades?\s+\d+\s*[-–]\s*\d+)",
        r"(grades?\s+\d+)",
        r"(grade\s+\d+)",
        r"((?:pre[- ]?k|k)\s*[-–]\s*\d+)",
    ]

    values = []

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            value = clean_text(match.group(1))
            if value not in values:
                values.append(value)

    if values:
        return "; ".join(values[:3])

    return ""


def extract_eligibility(text):
    patterns = [
        r"(?:eligible|eligibility)\s*[:\-]?\s*([^.!?\n]{10,150})",
        r"(?:open to)\s+([^.!?\n]{10,150})",
        r"(?:for)\s+(pre[- ]?k[^.!?\n]{0,100}(?:students|children|youth))",
        r"((?:pre[- ]?k|k)[,\s]*(?:and\s+)?k?[-–]?\d*\s+(?:students|children|youth))",
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = clean_text(match.group(1))
            if len(value) >= 5:
                return value

    return ""


def detect_categories(text):
    text_lower = text.lower()

    category_keywords = {
        "Computer Science": [
            "computer science",
            "programming",
            "coding",
            "software development"
        ],
        "STEM": [
            "stem",
            "science, technology, engineering",
            "science technology engineering mathematics"
        ],
        "Robotics": [
            "robotics",
            "robot",
            "lego robot"
        ],
        "Engineering": [
            "engineering",
            "engineer",
            "design and build"
        ],
        "Mathematics": [
            "mathematics",
            "math",
            "mathematical"
        ],
        "Science": [
            "science",
            "scientific",
            "biology",
            "chemistry",
            "physics"
        ],
        "Art": [
            "visual art",
            "drawing",
            "painting",
            "sculpture",
            "fine art",
            "art program",
            "arts program"
        ],
        "Music": [
            "music",
            "musical",
            "instrument",
            "orchestra",
            "band",
            "choir"
        ],
        "Writing": [
            "creative writing",
            "writing competition",
            "essay",
            "poetry"
        ],
        "Journalism": [
            "journalism",
            "student newspaper",
            "news writing"
        ],
        "Sports": [
            "sports",
            "athletics",
            "soccer",
            "basketball",
            "baseball",
            "football",
            "volleyball",
            "tennis",
            "swimming"
        ],
        "Competition": [
            "competition",
            "contest",
            "compete",
            "competitive"
        ],
        "Tournament": [
            "tournament",
            "tournaments"
        ],
        "Environment": [
            "environment",
            "environmental",
            "climate",
            "biodiversity",
            "conservation"
        ],
        "Entrepreneurship": [
            "entrepreneurship",
            "entrepreneur",
            "startup",
            "business competition"
        ],
        "Debate": [
            "debate",
            "debating"
        ]
    }

    categories = []

    for category, keywords in category_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            categories.append(category)

    return categories


def get_specific_data(url, title, body):
    data = {
        "name": "",
        "organization": "",
        "description": "",
        "type": "",
        "categories": [],
        "location": "",
        "cost": "",
        "deadline": "",
        "eligibility": "",
        "grade": "",
        "age": "",
        "official_url": url,
    }

    if "firstinspires.org" in url:
        data["name"] = "FIRST LEGO League"
        data["organization"] = "FIRST"
        data["type"] = "STEM Program"
        data["categories"] = [
            "Computer Science",
            "STEM",
            "Robotics",
            "Engineering",
            "Mathematics",
            "Science"
        ]
        data["eligibility"] = "Grades K-8; Ages 5-16"
        data["grade"] = "Grades K-8"
        data["age"] = "Ages 5-16"

        match = re.search(
            r"FIRST®?\s+LEGO®?\s+League introduces.*?(?:\.)",
            body,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            data["description"] = clean_text(match.group(0))
        else:
            data["description"] = (
                "FIRST LEGO League introduces STEM to children "
                "through hands-on learning, teamwork, creativity, "
                "and problem-solving."
            )

        return data

    if "destinationimagination.org" in url:
        data["name"] = "Destination Imagination Challenge Experience"
        data["organization"] = "Destination Imagination"
        data["type"] = "Competition"
        data["categories"] = [
            "STEM",
            "Engineering",
            "Science",
            "Art",
            "Competition"
        ]

        match = re.search(
            r"The Challenge Experience is.*?(?:tournaments\.)",
            body,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            data["description"] = clean_text(match.group(0))

        data["eligibility"] = "Pre-K through university"
        data["grade"] = "Pre-K through 12"
        data["age"] = ""

        return data

    if "mathcounts.org" in url:
        data["name"] = "MATHCOUNTS Competition Series"
        data["organization"] = "MATHCOUNTS Foundation"
        data["type"] = "Competition"
        data["categories"] = [
            "Mathematics",
            "Competition"
        ]
        data["eligibility"] = "Grades 6-8"
        data["grade"] = "Grades 6-8"

        match = re.search(
            r"A national program that.*?(?:peers\.)",
            body,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            data["description"] = clean_text(match.group(0))

        return data

    if "ayso.org" in url:
        data["name"] = "AYSO Tournaments"
        data["organization"] = "American Youth Soccer Organization"
        data["type"] = "Tournament"
        data["categories"] = [
            "Sports",
            "Tournament"
        ]
        data["age"] = "9U-14U"

        match = re.search(
            r"AYSO Sections, Areas and Regions host tournaments.*?(?:team\.)",
            body,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            data["description"] = clean_text(match.group(0))
        else:
            data["description"] = (
                "AYSO Sections, Areas and Regions host soccer "
                "tournaments throughout the year."
            )

        return data

    if "cafirst.org" in url:
        data["name"] = "FIRST LEGO League"
        data["organization"] = "FIRST Robotics - California"
        data["type"] = "STEM Program"
        data["categories"] = [
            "Computer Science",
            "STEM",
            "Robotics",
            "Engineering",
            "Mathematics",
            "Science"
        ]
        data["eligibility"] = "Pre-K through Grade 8; Ages 4-16"
        data["grade"] = "Pre-K through Grade 8"
        data["age"] = "Ages 4-16"

        match = re.search(
            r"Introducing science, technology, engineering, and math.*?(?:Challenge\.)",
            body,
            re.IGNORECASE | re.DOTALL
        )

        if match:
            data["description"] = clean_text(match.group(0))

        return data

    return data


async def extract_generic(page, url):
    title = ""
    h1 = ""
    body = ""

    try:
        title = await page.title()
    except Exception:
        pass

    try:
        h1s = await page.locator("h1").all_inner_texts()
        h1s = [clean_text(x) for x in h1s if clean_text(x)]
        if h1s:
            h1 = h1s[0]
    except Exception:
        pass

    try:
        body = await page.locator("body").inner_text()
        body = clean_text(body)
    except Exception:
        pass

    data = get_specific_data(url, title, body)

    if not data["name"]:
        data["name"] = h1 or title

    if not data["description"]:
        try:
            paragraphs = await page.locator("p").all_inner_texts()

            candidates = []

            for paragraph in paragraphs:
                paragraph = clean_text(paragraph)

                if len(paragraph) < 60:
                    continue

                lower = paragraph.lower()

                if any(x in lower for x in [
                    "privacy policy",
                    "terms of use",
                    "cookie policy",
                    "copyright",
                    "subscribe",
                    "newsletter",
                    "sign up",
                    "login"
                ]):
                    continue

                candidates.append(paragraph)

            if candidates:
                data["description"] = candidates[0]

        except Exception:
            pass

    if not data["description"]:
        try:
            meta = await page.locator(
                'meta[name="description"]'
            ).first.get_attribute("content")

            if meta:
                data["description"] = clean_text(meta)

        except Exception:
            pass

    if not data["organization"]:
        data["organization"] = extract_first_match(
            body,
            [
                r"(?:organization|organizer|provider|sponsor|host)\s*[:\-]\s*([^|.!?\n]{3,100})",
                r"(?:offered by)\s+([^|.!?\n]{3,100})"
            ]
        )

    if not data["grade"]:
        data["grade"] = extract_grade(body)

    if not data["age"]:
        data["age"] = extract_age(body)

    if not data["eligibility"]:
        data["eligibility"] = extract_eligibility(body)

    if not data["cost"]:
        data["cost"] = extract_cost(body)

    if not data["categories"]:
        data["categories"] = detect_categories(body)

    if not data["type"]:
        if "competition" in body.lower():
            data["type"] = "Competition"
        elif "tournament" in body.lower():
            data["type"] = "Tournament"
        elif "program" in body.lower():
            data["type"] = "Program"
        else:
            data["type"] = "Other"

    return data


async def scrape_url(browser, url, timeout):
    page = await browser.new_page()

    try:
        page.set_default_navigation_timeout(timeout)
        page.set_default_timeout(10000)

        await page.goto(
            url,
            timeout=timeout,
            wait_until="domcontentloaded"
        )

        await page.wait_for_timeout(1000)

        data = await extract_generic(page, url)

        data["source_url"] = url

        data["slug"] = re.sub(
            r"[^a-z0-9]+",
            "-",
            data["name"].lower()
        ).strip("-")

        return data

    finally:
        await page.close()


async def load_links(path):
    with open(path, "r", encoding="utf8") as f:
        links = [
            line.strip()
            for line in f
            if line.strip()
        ]

    seen = set()
    result = []

    for link in links:
        if link not in seen:
            seen.add(link)
            result.append(link)

    return result


async def main(
    links_path,
    output,
    timeout,
    concurrency
):
    links = await load_links(links_path)

    print(
        "Will scrape",
        len(links),
        "official URLs"
    )

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True
        )

        semaphore = asyncio.Semaphore(
            concurrency
        )

        async def worker(url):
            async with semaphore:
                try:
                    print("\nVisiting:", url)

                    record = await scrape_url(
                        browser,
                        url,
                        timeout
                    )

                    print(
                        "EXTRACTED:",
                        record["name"]
                    )

                    return record

                except Exception as e:
                    print(
                        "ERROR:",
                        url,
                        e
                    )
                    return None

        results = await asyncio.gather(
            *(worker(url) for url in links)
        )

        await browser.close()

    final = [
        result
        for result in results
        if result
    ]

    with open(
        output,
        "w",
        encoding="utf8"
    ) as f:
        json.dump(
            final,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        "\nWrote",
        len(final),
        "records to",
        output
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--links",
        "-l",
        default="newlink.txt"
    )

    parser.add_argument(
        "--output",
        "-o",
        default="new_courses.json"
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=30000
    )

    parser.add_argument(
        "--concurrency",
        type=int,
        default=2
    )

    args = parser.parse_args()

    asyncio.run(
        main(
            args.links,
            args.output,
            args.timeout,
            args.concurrency
        )
    )