#!/usr/bin/env python3
"""Manage the ClaimVex prospect database."""

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone

DEFAULT_BASE = os.path.expanduser("~/.openclaw/claimvex")
VALID_STATUSES = [
    "researching", "draft_ready", "pending_review",
    "approved", "sent", "responded", "closed",
]


def resolve_paths(args):
    data_dir = getattr(args, "data_dir", None) or os.path.join(DEFAULT_BASE, "data")
    config_dir = getattr(args, "config_dir", None) or os.path.join(DEFAULT_BASE, "config")
    return data_dir, config_dir


def load_json(path, default=None):
    if not os.path.exists(path):
        if default is not None:
            return default
        print(f"Error: File not found: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def calc_tier(total):
    if total == 0:
        return "unscored"
    if total >= 7:
        return "high"
    if total >= 4:
        return "medium"
    return "low"


def find_prospect(prospects, pid):
    for p in prospects:
        if p["id"] == pid:
            return p
    return None


def cmd_init(args):
    data_dir, config_dir = resolve_paths(args)
    seed = args.seed or os.path.join(config_dir, "prospects_seed.json")
    dest = os.path.join(data_dir, "prospects.json")
    if os.path.exists(dest):
        print(f"prospects.json already exists at {dest}. Use --force to overwrite.")
        if not args.force:
            sys.exit(1)
    if not os.path.exists(seed):
        print(f"Error: Seed file not found: {seed}", file=sys.stderr)
        sys.exit(1)
    os.makedirs(data_dir, exist_ok=True)
    shutil.copy2(seed, dest)
    data = load_json(dest)
    print(f"Initialized {len(data)} prospects in {dest}")


def cmd_list(args):
    data_dir, _ = resolve_paths(args)
    prospects = load_json(os.path.join(data_dir, "prospects.json"))
    if args.status:
        prospects = [p for p in prospects if p["status"] == args.status]
    if args.tier:
        prospects = [p for p in prospects if p["score"]["tier"] == args.tier]
    if not prospects:
        print("No prospects match the filter.")
        return
    print(f"{'ID':<15} {'Company':<40} {'Type':<18} {'Tier':<10} {'Status'}")
    print("-" * 100)
    for p in prospects:
        print(f"{p['id']:<15} {p['company']:<40} {p['type']:<18} {p['score']['tier']:<10} {p['status']}")


def cmd_show(args):
    data_dir, _ = resolve_paths(args)
    prospects = load_json(os.path.join(data_dir, "prospects.json"))
    p = find_prospect(prospects, args.id)
    if not p:
        print(f"Error: Prospect '{args.id}' not found.", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(p, indent=2))


def cmd_update(args, extra_args):
    data_dir, _ = resolve_paths(args)
    path = os.path.join(data_dir, "prospects.json")
    prospects = load_json(path)
    p = find_prospect(prospects, args.id)
    if not p:
        print(f"Error: Prospect '{args.id}' not found.", file=sys.stderr)
        sys.exit(1)
    if not extra_args:
        print("Error: No fields provided. Use --field=value (e.g. --contact_name='Jane Smith').", file=sys.stderr)
        sys.exit(1)
    for kv in extra_args:
        if "=" not in kv:
            print(f"Error: Invalid field format '{kv}'. Use --field=value.", file=sys.stderr)
            sys.exit(1)
        key, value = kv.split("=", 1)
        key = key.lstrip("-")
        if key == "status" and value not in VALID_STATUSES:
            print(f"Error: Invalid status '{value}'. Allowed: {', '.join(VALID_STATUSES)}", file=sys.stderr)
            sys.exit(1)
        if key in p:
            p[key] = value
            print(f"Updated {args.id}: {key} = {value}")
        else:
            print(f"Warning: Field '{key}' does not exist on prospect. Adding it.")
            p[key] = value
    save_json(path, prospects)


def cmd_score(args):
    data_dir, _ = resolve_paths(args)
    path = os.path.join(data_dir, "prospects.json")
    prospects = load_json(path)
    p = find_prospect(prospects, args.id)
    if not p:
        print(f"Error: Prospect '{args.id}' not found.", file=sys.stderr)
        sys.exit(1)
    icp = args.icp
    contact = args.contact
    email = args.email
    total = icp + contact + email
    tier = calc_tier(total)
    p["score"] = {
        "icp_fit": icp,
        "contact_confidence": contact,
        "email_confidence": email,
        "total": total,
        "tier": tier,
    }
    save_json(path, prospects)
    print(f"Scored {args.id}: icp={icp} contact={contact} email={email} -> total={total} tier={tier}")


def cmd_log_send(args):
    data_dir, _ = resolve_paths(args)
    path = os.path.join(data_dir, "prospects.json")
    prospects = load_json(path)
    p = find_prospect(prospects, args.id)
    if not p:
        print(f"Error: Prospect '{args.id}' not found.", file=sys.stderr)
        sys.exit(1)
    p["status"] = "sent"
    save_json(path, prospects)

    log_path = os.path.join(data_dir, "outreach_log.json")
    log = load_json(log_path, default=[])
    entry = {
        "prospect_id": p["id"],
        "company": p["company"],
        "contact_name": p["contact_name"],
        "contact_email": p["contact_email"],
        "sent_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "type": "initial",
        "template": "outreach_email_v1.md",
    }
    log.append(entry)
    save_json(log_path, log)
    print(f"Logged send for {args.id} ({p['company']}). Status -> sent.")


def main():
    parser = argparse.ArgumentParser(
        description="ClaimVex prospect manager",
        epilog="Examples:\n"
               "  python3 prospect_manager.py init --seed=config/prospects_seed.json\n"
               "  python3 prospect_manager.py list --status=researching\n"
               "  python3 prospect_manager.py show prospect_001\n"
               "  python3 prospect_manager.py update prospect_001 --contact_name='Jane Smith'\n"
               "  python3 prospect_manager.py score prospect_001 --icp=3 --contact=2 --email=1\n"
               "  python3 prospect_manager.py log-send prospect_001\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--data-dir", help="Override data directory")
    parser.add_argument("--config-dir", help="Override config directory")
    sub = parser.add_subparsers(dest="command")

    p_init = sub.add_parser("init", help="Initialize prospects from seed file")
    p_init.add_argument("--seed", help="Path to seed JSON file")
    p_init.add_argument("--force", action="store_true", help="Overwrite existing prospects.json")

    p_list = sub.add_parser("list", help="List prospects")
    p_list.add_argument("--status", help="Filter by status")
    p_list.add_argument("--tier", help="Filter by score tier")

    p_show = sub.add_parser("show", help="Show prospect details")
    p_show.add_argument("id", help="Prospect ID")

    p_update = sub.add_parser("update", help="Update prospect fields (e.g. update prospect_001 contact_name='Jane Smith' status=draft_ready)")
    p_update.add_argument("id", help="Prospect ID")

    p_score = sub.add_parser("score", help="Set prospect score")
    p_score.add_argument("id", help="Prospect ID")
    p_score.add_argument("--icp", type=int, required=True, help="ICP fit (0-3)")
    p_score.add_argument("--contact", type=int, required=True, help="Contact confidence (0-3)")
    p_score.add_argument("--email", type=int, required=True, help="Email confidence (0-3)")

    p_log = sub.add_parser("log-send", help="Record email sent to prospect")
    p_log.add_argument("id", help="Prospect ID")

    args, extra = parser.parse_known_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "update":
        cmd_update(args, extra)
    else:
        if extra:
            parser.error(f"Unrecognized arguments: {' '.join(extra)}")
        cmd_map = {
            "init": cmd_init,
            "list": cmd_list,
            "show": cmd_show,
            "score": cmd_score,
            "log-send": cmd_log_send,
        }
        cmd_map[args.command](args)


if __name__ == "__main__":
    main()
