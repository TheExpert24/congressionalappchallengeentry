import json

FILES = [
    "new_courses_clean.json",
    "opportunities.json",
]

OUTPUT = "all_opportunities.json"

opportunities = []

for filename in FILES:
    with open(filename, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        opportunities.extend(data)

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(opportunities, f, indent=2, ensure_ascii=False)

print(f"Combined {len(opportunities)} opportunities")
print(f"Wrote {OUTPUT}")