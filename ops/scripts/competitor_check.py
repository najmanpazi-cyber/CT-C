#!/usr/bin/env python3
"""Track competitor page changes via hash comparison."""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

DEFAULT_BASE = os.path.expanduser("~/.openclaw/claimvex")


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


def check_target(target, state):
    name = target["name"]
    url = target["url"]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        req = Request(url, headers={"User-Agent": "ClaimVex-CompetitorCheck/1.0"})
        response = urlopen(req, timeout=15)
        body = response.read()
        new_hash = hashlib.sha256(body).hexdigest()
    except (HTTPError, URLError, Exception) as e:
        print(f"  {name}: fetch failed -- {e}", file=sys.stderr)
        return False

    prev = state.get(name, {})
    prev_hash = prev.get("last_hash")

    if prev_hash is None:
        # First run — record baseline
        state[name] = {
            "last_hash": new_hash,
            "last_checked": now,
            "last_changed": None,
            "change_detected": False,
        }
        return False
    elif new_hash != prev_hash:
        state[name] = {
            "last_hash": new_hash,
            "last_checked": now,
            "last_changed": now,
            "change_detected": True,
        }
        return True
    else:
        state[name]["last_checked"] = now
        state[name]["change_detected"] = False
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Check competitor pages for changes",
        epilog="Examples:\n"
               "  python3 competitor_check.py\n"
               "  python3 competitor_check.py --name=Optum360\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--name", help="Check a specific competitor only")
    parser.add_argument("--config-dir", help="Override config directory")
    parser.add_argument("--data-dir", help="Override data directory")
    args = parser.parse_args()

    config_dir = args.config_dir or os.path.join(DEFAULT_BASE, "config")
    data_dir = args.data_dir or os.path.join(DEFAULT_BASE, "data")

    config = load_json(os.path.join(config_dir, "competitors.json"))
    state_path = os.path.join(data_dir, "competitors_state.json")
    state = load_json(state_path, default={})

    targets = config.get("targets", [])
    if args.name:
        targets = [t for t in targets if t["name"] == args.name]
        if not targets:
            print(f"Error: Competitor '{args.name}' not found in config.", file=sys.stderr)
            sys.exit(1)

    changes = []
    for target in targets:
        changed = check_target(target, state)
        if changed:
            changes.append(target["name"])

    save_json(state_path, state)

    if changes:
        for name in changes:
            print(f"  [!] {name} -- page content changed")
    else:
        print("No competitor changes detected.")

    print()
    search_query = config.get("search_query", "orthopedic CPT validation tool")
    print(f"Manual check needed: search '{search_query}' for new entrants.")


if __name__ == "__main__":
    main()
