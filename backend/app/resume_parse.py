"""Reads a resume into sections without AI (used before payment, and as a fallback).

Finds the name, contact details and location from the top lines, then splits the rest by common
headings (Skills, Experience, Education, Projects...). Skills are split into a list.
"""
import re

HEADINGS = {
    "summary": ["summary", "professional summary", "profile", "about me", "objective", "career objective"],
    "skills": ["skills", "technical skills", "core skills", "key skills", "technologies", "tech stack", "tools", "skills & tools"],
    "experience": ["experience", "work experience", "professional experience", "employment", "work history", "internships", "internship"],
    "projects": ["projects", "technical projects", "personal projects", "key projects", "academic projects"],
    "education": ["education", "academics", "education & certifications", "academic background"],
    "certifications": ["certifications", "certificates", "courses", "licenses"],
    "achievements": ["achievements", "awards", "honors", "accomplishments"],
}
LOOKUP = {h: k for k, names in HEADINGS.items() for h in names}
CITIES = ["hyderabad", "bengaluru", "bangalore", "mumbai", "pune", "chennai", "delhi", "new delhi", "noida", "gurugram", "gurgaon",
          "kolkata", "ahmedabad", "kochi", "jaipur", "remote", "india", "dubai", "london", "singapore", "new york", "san francisco"]


def _heading(line: str) -> str | None:
    clean = re.sub(r"[^a-z& ]", "", line.lower()).strip()
    if not clean or len(clean) > 40:
        return None
    return LOOKUP.get(clean)


def parse(text: str) -> dict:
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    phone = re.search(r"\+?\d[\d \-()]{8,15}\d", text)
    links = re.findall(r"(?:https?://)?(?:www\.)?(?:linkedin\.com/in|github\.com)/[\w\-/]+", text)

    name = ""
    for ln in lines[:4]:
        if _heading(ln) or "@" in ln or re.search(r"\d{5,}", ln):
            continue
        if 2 <= len(ln.split()) <= 6 and not re.search(r"[|:]", ln):
            name = ln.title() if ln.isupper() else ln
            break

    location = ""
    for ln in lines[:8]:
        low = ln.lower()
        for city in CITIES:
            if re.search(rf"\b{re.escape(city)}\b", low):
                part = next((p.strip() for p in re.split(r"[|•·]", ln) if city in p.lower()), ln)
                location = part[:60]
                break
        if location:
            break

    # Split into sections. A PDF wraps long lines, so a line that doesn't start a new bullet or title is joined to the one before.
    sections: dict[str, list[str]] = {}
    current = None
    for ln in lines:
        h = _heading(ln)
        if h:
            current = h
            sections.setdefault(h, [])
            continue
        if not current:
            continue
        bullet = bool(re.match(r"^[•●▪○◦\-–*]\s*", ln))
        body = re.sub(r"^[•●▪○◦\-–*]\s*", "", ln).strip()
        items = sections[current]
        title_like = "|" in body or re.search(r"\b(19|20)\d{2}\b", body) or re.match(r"^[A-Z][\w&/().,' -]{0,60}:", body)
        if items and not bullet and not title_like and current != "skills" and not re.search(r"[.!?:]$", items[-1]):
            items[-1] = f"{items[-1]} {body}"
        else:
            items.append(body)
    if sections.get("summary"):
        sections["summary"] = [" ".join(sections["summary"])]

    # Skills: drop "Category:" labels, then split on commas that are not inside brackets.
    label = r"[A-Za-z][\w &/+-]{1,40}:"
    raw = "".join((", " + it) if re.match(label, it) else (" " + it) for it in sections.get("skills", []))  # a "Group:" line starts a new group
    raw = re.sub(r"(?:^|,)\s*" + label + r"\s*", ", ", raw)
    skills: list[str] = []
    depth, cur = 0, ""
    for ch in raw + ",":
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth = max(0, depth - 1)
        if depth == 0 and ch in ",;|•·●":
            s = cur.strip(" .")
            if 1 < len(s) <= 45 and s.lower() not in (x.lower() for x in skills):
                skills.append(s)
            cur = ""
        else:
            cur += ch

    years = re.findall(r"(\d+)\+?\s*(?:years|yrs)", text, re.I)
    return {
        "name": name,
        "email": email.group(0) if email else None,
        "phone": phone.group(0).strip() if phone else None,
        "location": location or None,
        "links": list(dict.fromkeys(links))[:4],
        "skills": skills[:40],
        "experience_years_mentioned": max(map(int, years)) if years else None,
        "sections": {k: v[:25] for k, v in sections.items() if k != "skills" and v},
    }
