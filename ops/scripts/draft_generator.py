#!/usr/bin/env python3
"""Generate personalized outreach email drafts from prospect data + template."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

DEFAULT_BASE = os.path.expanduser("~/.openclaw/claimvex")


def load_json(path):
    if not os.path.exists(path):
        print(f"Error: File not found: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def find_prospect(prospects, pid):
    for p in prospects:
        if p["id"] == pid:
            return p
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Generate outreach email draft for a prospect",
        epilog="Examples:\n"
               "  python3 draft_generator.py prospect_001\n"
               "  python3 draft_generator.py prospect_001 --template=custom.md\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("prospect_id", help="Prospect ID")
    parser.add_argument("--template", help="Path to template file")
    parser.add_argument("--data-dir", help="Override data directory")
    parser.add_argument("--template-dir", help="Override template directory")
    args = parser.parse_args()

    data_dir = args.data_dir or os.path.join(DEFAULT_BASE, "data")
    template_dir = args.template_dir or os.path.join(DEFAULT_BASE, "templates")

    prospects = load_json(os.path.join(data_dir, "prospects.json"))
    prospect = find_prospect(prospects, args.prospect_id)
    if not prospect:
        print(f"Error: Prospect '{args.prospect_id}' not found.", file=sys.stderr)
        sys.exit(1)

    if prospect["status"] not in ("draft_ready", "researching"):
        print(f"Warning: Prospect status is '{prospect['status']}' (expected 'draft_ready' or 'researching'). Generating anyway.", file=sys.stderr)

    template_path = args.template or os.path.join(template_dir, "outreach_email_v1.md")
    if not os.path.exists(template_path):
        print(f"Error: Template not found: {template_path}", file=sys.stderr)
        sys.exit(1)

    with open(template_path, "r", encoding="utf-8") as f:
        template_text = f.read()

    template_name = os.path.basename(template_path)

    # Extract subject line (first line after "Subject: ")
    subject = ""
    body_lines = []
    in_body = False
    for line in template_text.splitlines():
        if line.startswith("Subject: ") and not in_body:
            subject = line[len("Subject: "):]
            in_body = True
            continue
        if in_body:
            body_lines.append(line)
    body = "\n".join(body_lines).strip()

    # Variable substitution
    contact_name = prospect.get("contact_name", "").strip()
    contact_title = prospect.get("contact_title", "").strip()

    # Handle greeting: {contact_name} in "Hi {contact_name},"
    if contact_name:
        greeting_name = contact_name
    elif contact_title:
        greeting_name = contact_title
    else:
        greeting_name = "there"

    body = body.replace("Hi {contact_name},", f"Hi {greeting_name},")
    body = body.replace("{contact_name}", greeting_name)
    body = body.replace("{contact_title}", contact_title or "")
    body = body.replace("{company}", prospect.get("company", ""))
    body = body.replace("{outreach_angle}", prospect.get("outreach_angle", ""))
    body = body.replace("{website}", prospect.get("website", ""))

    subject = subject.replace("{company}", prospect.get("company", ""))
    subject = subject.replace("{contact_name}", greeting_name)

    # Build draft output
    draft = {
        "prospect_id": prospect["id"],
        "subject": subject,
        "body": body,
        "prospect_context": {
            "company": prospect["company"],
            "contact_name": prospect.get("contact_name", ""),
            "contact_title": prospect.get("contact_title", ""),
            "score_tier": prospect["score"]["tier"],
            "score_total": prospect["score"]["total"],
        },
        "template_used": template_name,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "pending_review",
    }

    # Save draft
    drafts_dir = os.path.join(data_dir, "outreach_drafts")
    os.makedirs(drafts_dir, exist_ok=True)
    draft_path = os.path.join(drafts_dir, f"draft_{prospect['id']}.json")
    save_json(draft_path, draft)

    # Print readable output
    print(f"Subject: {subject}")
    print()
    print(body)
    print()
    print(f"--- Draft saved to {draft_path} ---")


if __name__ == "__main__":
    main()
