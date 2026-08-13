#!/usr/bin/env python3

import asyncio
import json
import re
import argparse
from urllib.parse import urlparse, urljoin
from playwright.async_api import async_playwright


async def extract_course_from_page(page, url):
    data = {
        "source_url": url,
        "name": "",
        "description": "",
        "organization": "",
        "type": "",
        "categories": [],
        "location": "",
        "cost": "",
        "deadline": "",
        "eligibility": "",
        "age": "",
        "grade": "",
        "official_url": ""
    }

    try:
        data["name"] = (
            await page.locator("h1").first.inner_text()
        ).strip()
    except Exception:
        pass

    try:
        body_text = await page.locator("body").inner_text()
    except Exception:
        body_text = ""

    lines = [
        line.strip()
        for line in body_text.splitlines()
        if line.strip()
    ]

    def find_after_label(labels):
        for i, line in enumerate(lines):
            lower = line.lower()

            for label in labels:
                label_lower = label.lower()

                if lower == label_lower:
                    if i + 1 < len(lines):
                        return lines[i + 1]

                if lower.startswith(label_lower + ":"):
                    return line.split(":", 1)[1].strip()

        return ""

    data["description"] = ""

    try:
        quick_answer = await page.locator("text=Quick Answer").first

        if await quick_answer.count():
            text = await quick_answer.evaluate("""
                element => {
                    let result = [];
                    let current = element.parentElement;

                    if (!current) return "";

                    let nodes = current.querySelectorAll("*");

                    for (const node of nodes) {
                        const text = node.innerText?.trim();

                        if (
                            text &&
                            text !== "Quick Answer" &&
                            text.length > 40
                        ) {
                            result.push(text);
                        }
                    }

                    return result.join(" ");
                }
            """)

            text = re.sub(r"\\s+", " ", text).strip()

            if text:
                data["description"] = text

    except Exception:
        pass

    if not data["description"]:
        try:
            paragraphs = await page.locator("p").all_inner_texts()

            paragraphs = [
                re.sub(r"\\s+", " ", p).strip()
                for p in paragraphs
                if len(p.strip()) >= 40
            ]

            for paragraph in paragraphs:
                lower = paragraph.lower()

                if (
                    "program overview" not in lower
                    and "key facts" not in lower
                    and "frequently asked questions" not in lower
                ):
                    data["description"] = paragraph
                    break

        except Exception:
            pass

    if not data["description"]:
        try:
            meta = await page.locator(
                'meta[name="description"]'
            ).first.get_attribute("content")

            if meta:
                data["description"] = meta.strip()

        except Exception:
            pass

    if not data["description"]:
        try:
            meta = await page.locator(
                'meta[name="description"]'
            ).first.get_attribute("content")

            if meta:
                data["description"] = meta.strip()
        except Exception:
            pass

    data["organization"] = find_after_label([
        "Organization",
        "Organizer",
        "Provider",
        "Offered by"
    ])

    data["location"] = find_after_label([
        "Location",
        "Where"
    ])

    data["cost"] = find_after_label([
        "Cost",
        "Price",
        "Fee"
    ])

    data["deadline"] = find_after_label([
        "Deadline",
        "Application Deadline"
    ])

    data["eligibility"] = find_after_label([
        "Eligibility",
        "Requirements"
    ])

    data["age"] = find_after_label([
        "Age",
        "Ages",
        "Age Range"
    ])

    data["grade"] = find_after_label([
        "Grade",
        "Grades",
        "Grade Level"
    ])

    data["type"] = find_after_label([
        "Type",
        "Category"
    ])

    known_categories = [
        "Computer Science",
        "STEM",
        "Competition",
        "Internship",
        "Research Program",
        "Summer Camp",
        "Pre-College",
        "Scholarship",
        "Community Service",
        "Mathematics",
        "Biology",
        "Engineering",
        "Robotics",
        "Physics",
        "Chemistry",
        "Medicine",
        "Business",
        "Economics",
        "Entrepreneurship",
        "Debate",
        "Writing",
        "Journalism",
        "Art",
        "Music",
        "Film",
        "Politics",
        "Law",
        "Psychology",
        "Environment"
    ]

    for line in lines:
        normalized = line.strip().lower()

        for category in known_categories:
            if normalized == category.lower():
                if category not in data["categories"]:
                    data["categories"].append(category)

    try:
        links = await page.locator("a").evaluate_all("""
            elements => elements.map(a => ({
                text: (a.innerText || '').trim(),
                href: a.href
            }))
        """)

        external_links = []

        for link in links:
            href = link.get("href", "")
            text = link.get("text", "").lower()

            if not href:
                continue

            parsed = urlparse(href)

            if parsed.netloc.lower().endswith(
                "extracurricularhub.com"
            ):
                continue

            external_links.append({
                "href": href,
                "text": text
            })

        priority_words = [
            "official website",
            "official site",
            "visit website",
            "apply",
            "application",
            "learn more",
            "website"
        ]

        for word in priority_words:
            for link in external_links:
                if word in link["text"]:
                    data["official_url"] = link["href"]
                    break

            if data["official_url"]:
                break

    except Exception:
        pass

    data["slug"] = re.sub(
        r"[^a-z0-9]+",
        "-",
        data["name"].lower()
    ).strip("-")

    return data


def is_opportunity_url(url):
    try:
        parsed = urlparse(url)

        if parsed.netloc.lower() != "extracurricularhub.com":
            return False

        path = parsed.path.rstrip("/")

        if not path.startswith(
            "/extracurriculars/"
        ):
            return False

        if parsed.query:
            return False

        slug = path.split(
            "/extracurriculars/",
            1
        )[1].strip("/")

        if not slug:
            return False

        if "/" in slug:
            return False

        excluded = {
            "computer-science",
            "mathematics",
            "biology",
            "engineering",
            "robotics",
            "physics",
            "chemistry",
            "medicine",
            "business",
            "economics",
            "entrepreneurship",
            "debate",
            "writing",
            "journalism",
            "art",
            "music",
            "film",
            "politics",
            "law",
            "psychology",
            "environment",
            "competitions",
            "internships",
            "research",
            "scholarships",
            "summer-programs",
            "volunteering",
            "stem"
        }

        return slug.lower() not in excluded

    except Exception:
        return False


async def discover_opportunity_urls(
    context,
    url,
    timeout
):
    discovered = set()
    visited = set()
    queue = [url]

    while queue:

        current_url = queue.pop(0)

        if current_url in visited:
            continue

        visited.add(current_url)

        page = await context.new_page()

        try:
            print("Visiting discovery page:", current_url)

            await page.goto(
                current_url,
                timeout=timeout,
                wait_until="domcontentloaded"
            )

            await page.wait_for_timeout(1500)

            links = await page.locator("a").evaluate_all("""
                elements => elements.map(a => ({
                    text: (a.innerText || '').trim(),
                    href: a.href
                }))
            """)

            for link in links:
                href = link.get("href", "")
                text = link.get("text", "").strip().lower()

                if not href:
                    continue

                parsed = urlparse(href)

                if parsed.netloc.lower() != "extracurricularhub.com":
                    continue

                if is_opportunity_url(href):
                    if href not in discovered:
                        discovered.add(href)

                        print(
                            "Found opportunity:",
                            href
                        )

                path = parsed.path.rstrip("/")

                if (
                    path.startswith(
                        "/extracurriculars"
                    )
                    and (
                        text in {
                            "next",
                            "next page",
                            "›",
                            "→"
                        }
                        or "page=" in parsed.query
                    )
                ):
                    normalized = href.split("#")[0]

                    if normalized not in visited:
                        queue.append(normalized)

            next_candidates = []

            for link in links:
                href = link.get("href", "")
                text = link.get("text", "").strip().lower()

                if not href:
                    continue

                if text in {
                    "next",
                    "next page",
                    "›",
                    "→"
                }:
                    next_candidates.append(href)

            for href in next_candidates:
                if href not in visited:
                    queue.append(href)

        except Exception as e:
            print(
                "Error discovering:",
                current_url,
                e
            )

        finally:
            try:
                await page.close()
            except Exception:
                pass

    return discovered


async def load_links(path):
    with open(
        path,
        "r",
        encoding="utf8"
    ) as f:
        lines = [
            l.strip()
            for l in f
            if l.strip()
        ]

    seen = []
    seen_set = set()

    for line in lines:
        if line not in seen_set:
            seen.append(line)
            seen_set.add(line)

    return seen


async def fetch_worker(
    context,
    url,
    out_path,
    timeout,
    semaphore,
    combined_json_path=None,
    lock=None,
    flush_every=1,
    counter=None
):
    async with semaphore:

        page = await context.new_page()

        async def route_handler(route, request):
            try:
                if request.resource_type in (
                    "image",
                    "media",
                    "font",
                    "stylesheet"
                ):
                    await route.abort()
                else:
                    await route.continue_()
            except Exception:
                try:
                    await route.continue_()
                except Exception:
                    pass

        try:
            await page.route(
                "**/*",
                route_handler
            )
        except Exception:
            pass

        try:
            page.set_default_navigation_timeout(
                timeout
            )

            page.set_default_timeout(
                10000
            )
        except Exception:
            pass

        results = []

        try:
            print("Visiting", url)

            if (
                "extracurricularhub.com"
                in url
            ):
                opportunity_urls = (
                    await discover_opportunity_urls(
                        context,
                        url,
                        timeout
                    )
                )

                print(
                    "Found",
                    len(opportunity_urls),
                    "unique opportunity URLs"
                )

                for opportunity_url in sorted(
                    opportunity_urls
                ):

                    opportunity_page = (
                        await context.new_page()
                    )

                    try:
                        print(
                            "Visiting opportunity:",
                            opportunity_url
                        )

                        await opportunity_page.goto(
                            opportunity_url,
                            timeout=timeout,
                            wait_until="domcontentloaded"
                        )

                        await opportunity_page.wait_for_timeout(
                            500
                        )

                        record = (
                            await extract_course_from_page(
                                opportunity_page,
                                opportunity_url
                            )
                        )

                        if record:
                            results.append(record)

                            print(
                                "✓",
                                record.get(
                                    "name",
                                    opportunity_url
                                )
                            )

                    except Exception as e:
                        print(
                            "Error fetching opportunity:",
                            opportunity_url,
                            e
                        )

                    finally:
                        try:
                            await opportunity_page.close()
                        except Exception:
                            pass

            else:
                record = (
                    await extract_course_from_page(
                        page,
                        url
                    )
                )

                if record:
                    results.append(record)

        except Exception as e:
            print(
                "Error fetching",
                url,
                e
            )

        finally:
            try:
                await page.close()
            except Exception:
                pass

        try:
            with open(
                out_path,
                "a",
                encoding="utf8"
            ) as fo:

                for record in results:
                    fo.write(
                        json.dumps(
                            record,
                            ensure_ascii=False
                        ) + "\n"
                    )

        except Exception as e:
            print(
                "Failed to write results:",
                e
            )

        return results


async def main(
    output,
    json_output,
    concurrency,
    delay,
    links_path,
    timeout,
    storage_state=None,
    flush_every=1
):
    links = await load_links(
        links_path
    )

    print(
        "Will scrape",
        len(links),
        "URLs from",
        links_path
    )

    async with async_playwright() as pw:

        browser = await pw.chromium.launch(
            headless=True
        )

        if storage_state:
            try:
                context = await browser.new_context(
                    storage_state=storage_state
                )
            except Exception:
                context = await browser.new_context()
        else:
            context = await browser.new_context()

        sem = asyncio.Semaphore(
            concurrency
        )

        tasks = []

        json_lock = (
            asyncio.Lock()
            if json_output
            else None
        )

        flush_counter = {
            "value": 0
        }

        for url in links:

            flush_counter["value"] += 1

            tasks.append(
                fetch_worker(
                    context,
                    url,
                    output,
                    timeout,
                    sem,
                    json_output,
                    json_lock,
                    flush_every=flush_every,
                    counter=flush_counter
                )
            )

            await asyncio.sleep(
                delay
            )

        results = await asyncio.gather(
            *tasks
        )

        try:
            await context.close()
        except Exception:
            pass

        await browser.close()

    final = []
    seen_urls = set()

    for result in results:

        if isinstance(result, list):

            for record in result:

                source_url = record.get(
                    "source_url",
                    ""
                )

                if source_url in seen_urls:
                    continue

                seen_urls.add(
                    source_url
                )

                final.append(record)

        elif result:

            source_url = result.get(
                "source_url",
                ""
            )

            if source_url not in seen_urls:

                seen_urls.add(
                    source_url
                )

                final.append(result)

    if json_output:

        with open(
            json_output,
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
            "Wrote",
            json_output
        )

    else:

        print(
            "Completed",
            len(final),
            "records"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--links",
        "-l",
        default="links.txt",
        help="Path to file with URLs (one per line)"
    )

    parser.add_argument(
        "--output",
        "-o",
        default="live_courses.jsonl",
        help="Line-delimited JSON output path"
    )

    parser.add_argument(
        "--json",
        default="live_courses.json",
        help="Final combined JSON output path"
    )

    parser.add_argument(
        "--concurrency",
        type=int,
        default=2,
        help="Number of concurrent browser pages"
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Stagger delay between starting tasks (seconds)"
    )

    parser.add_argument(
        "--timeout",
        type=int,
        default=30000,
        help="Navigation timeout in ms"
    )

    parser.add_argument(
        "--storage-state",
        default=None,
        help="Path to Playwright storage_state.json"
    )

    parser.add_argument(
        "--flush-every",
        type=int,
        default=1,
        help="Write combined JSON every N records"
    )

    args = parser.parse_args()

    asyncio.run(
        main(
            args.output,
            args.json,
            args.concurrency,
            args.delay,
            args.links,
            args.timeout,
            storage_state=args.storage_state,
            flush_every=args.flush_every
        )
    )