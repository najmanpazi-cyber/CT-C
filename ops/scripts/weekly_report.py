#!/usr/bin/env python3
"""Compile weekly/monthly ops report from local data files."""

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta

DEFAULT_BASE = os.path.expanduser("~/.openclaw/claimvex")


def load_json(path, default=None):
    if not os.path.exists(path):
        return default if default is not None else []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_iso(s):
    """Parse ISO 8601 timestamp to datetime."""
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Generate ClaimVex operations report",
        epilog="Examples:\n"
               "  python3 weekly_report.py\n"
               "  python3 weekly_report.py --monthly\n"
               "  python3 weekly_report.py --days=14\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--monthly", action="store_true", help="Report for last 30 days")
    parser.add_argument("--days", type=int, help="Custom number of days")
    parser.add_argument("--data-dir", help="Override data directory")
    args = parser.parse_args()

    data_dir = args.data_dir or os.path.join(DEFAULT_BASE, "data")

    if args.days:
        period_days = args.days
    elif args.monthly:
        period_days = 30
    else:
        period_days = 7

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=period_days)
    period_start = cutoff.strftime("%b %-d" if os.name != "nt" else "%b %d")
    period_end = now.strftime("%b %-d, %Y" if os.name != "nt" else "%b %d, %Y")
    period_label = "Monthly" if period_days == 30 else f"{period_days}-Day" if period_days != 7 else "Weekly"

    # --- Prospects ---
    prospects = load_json(os.path.join(data_dir, "prospects.json"), default=[])
    total_prospects = len(prospects)
    high = sum(1 for p in prospects if p.get("score", {}).get("tier") == "high")
    medium = sum(1 for p in prospects if p.get("score", {}).get("tier") == "medium")
    researching = sum(1 for p in prospects if p.get("status") == "researching")
    responded = sum(1 for p in prospects if p.get("status") == "responded")

    # --- Drafts pending review ---
    drafts_dir = os.path.join(data_dir, "outreach_drafts")
    drafts_pending = 0
    if os.path.isdir(drafts_dir):
        for fname in os.listdir(drafts_dir):
            if fname.endswith(".json"):
                try:
                    with open(os.path.join(drafts_dir, fname), "r", encoding="utf-8") as f:
                        d = json.load(f)
                    if d.get("status") == "pending_review":
                        drafts_pending += 1
                except (json.JSONDecodeError, KeyError):
                    pass

    # --- Outreach log ---
    outreach_log = load_json(os.path.join(data_dir, "outreach_log.json"), default=[])
    emails_sent_period = 0
    for entry in outreach_log:
        sent_at = parse_iso(entry.get("sent_at", ""))
        if sent_at and sent_at >= cutoff:
            emails_sent_period += 1

    # --- Monitor log ---
    monitor_log = load_json(os.path.join(data_dir, "monitor_log.json"), default=[])
    checks_period = 0
    failures_period = 0
    issues = []
    for entry in monitor_log:
        ts = parse_iso(entry.get("timestamp", ""))
        if ts and ts >= cutoff:
            checks_period += 1
            if entry.get("status") == "fail":
                failures_period += 1
                issues.append(entry.get("error", "Unknown"))

    # --- Competitors ---
    comp_state = load_json(os.path.join(data_dir, "competitors_state.json"), default={})
    comp_changes = [name for name, info in comp_state.items() if info.get("change_detected")]

    # --- Output ---
    print(f"[REPORT] ClaimVex {period_label} Report -- {period_start}-{period_end}")
    print()

    print("PIPELINE")
    print(f"- Total prospects: {total_prospects}")
    print(f"- Scored High: {high}")
    print(f"- Scored Medium: {medium}")
    print(f"- Drafts pending review: {drafts_pending}")
    print(f"- Emails sent (this period): {emails_sent_period}")
    print(f"- Responses received: {responded}")
    print()

    print("MONITORING")
    print(f"- Health checks run: {checks_period}")
    print(f"- Failures: {failures_period}")
    if issues:
        for issue in issues[-3:]:  # Show last 3
            print(f"  - {issue}")
    else:
        print("- Issues: None")
    print()

    print("COMPETITORS")
    if comp_changes:
        for name in comp_changes:
            print(f"- {name}: page changed")
    else:
        print("- Changes detected: None")
    print()

    print("ACTION ITEMS")
    print(f"- {researching} prospects still need research")
    print(f"- {drafts_pending} drafts awaiting Pazi's review")
    print(f"- 0 follow-ups due (Phase 2)")


if __name__ == "__main__":
    main()
