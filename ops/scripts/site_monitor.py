#!/usr/bin/env python3
"""HTTP health check for ClaimVex."""

import argparse
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


def main():
    parser = argparse.ArgumentParser(
        description="Check ClaimVex site health",
        epilog="Examples:\n"
               "  python3 site_monitor.py\n"
               "  python3 site_monitor.py --config-dir=~/.openclaw/claimvex/config\n",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--config-dir", help="Override config directory")
    parser.add_argument("--data-dir", help="Override data directory")
    args = parser.parse_args()

    config_dir = args.config_dir or os.path.join(DEFAULT_BASE, "config")
    data_dir = args.data_dir or os.path.join(DEFAULT_BASE, "data")

    config_path = os.path.join(config_dir, "monitor_config.json")
    config = load_json(config_path)

    url = config.get("url", "https://claimvex.com")
    check_string = config.get("check_string", "ClaimVex")
    timeout = config.get("timeout_seconds", 10)

    log_path = os.path.join(data_dir, "monitor_log.json")
    log = load_json(log_path, default=[])

    now = datetime.now(timezone.utc)
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    display_time = now.strftime("%Y-%m-%d %H:%M ET")

    try:
        req = Request(url, headers={"User-Agent": "ClaimVex-Monitor/1.0"})
        response = urlopen(req, timeout=timeout)
        http_code = response.getcode()
        body = response.read().decode("utf-8", errors="replace")

        if http_code != 200:
            error_msg = f"HTTP {http_code}"
            log.append({"timestamp": timestamp, "status": "fail", "error": error_msg, "http_code": http_code})
            save_json(log_path, log)
            print("[ALERT] CLAIMVEX MONITOR ALERT")
            print(f"Time: {display_time}")
            print(f"URL: {url}")
            print(f"Error: {error_msg}")
            print(f"Action needed: Check Vercel deployment status")
            sys.exit(1)

        if check_string not in body:
            error_msg = f"Content check failed -- '{check_string}' not found in response"
            log.append({"timestamp": timestamp, "status": "fail", "error": error_msg, "http_code": http_code})
            save_json(log_path, log)
            print("[ALERT] CLAIMVEX MONITOR ALERT")
            print(f"Time: {display_time}")
            print(f"URL: {url}")
            print(f"Error: {error_msg}")
            print(f"Action needed: Check Vercel deployment status")
            sys.exit(1)

        # Success — silent
        log.append({"timestamp": timestamp, "status": "ok"})
        save_json(log_path, log)

    except HTTPError as e:
        error_msg = f"HTTP {e.code} -- {e.reason}"
        log.append({"timestamp": timestamp, "status": "fail", "error": error_msg, "http_code": e.code})
        save_json(log_path, log)
        print("[ALERT] CLAIMVEX MONITOR ALERT")
        print(f"Time: {display_time}")
        print(f"URL: {url}")
        print(f"Error: {error_msg}")
        print(f"Action needed: Check Vercel deployment status")
        sys.exit(1)

    except URLError as e:
        error_msg = f"Connection failed -- {e.reason}"
        log.append({"timestamp": timestamp, "status": "fail", "error": error_msg, "http_code": 0})
        save_json(log_path, log)
        print("[ALERT] CLAIMVEX MONITOR ALERT")
        print(f"Time: {display_time}")
        print(f"URL: {url}")
        print(f"Error: {error_msg}")
        print(f"Action needed: Check Vercel deployment status")
        sys.exit(1)

    except Exception as e:
        error_msg = str(e)
        log.append({"timestamp": timestamp, "status": "fail", "error": error_msg, "http_code": 0})
        save_json(log_path, log)
        print("[ALERT] CLAIMVEX MONITOR ALERT")
        print(f"Time: {display_time}")
        print(f"URL: {url}")
        print(f"Error: {error_msg}")
        print(f"Action needed: Check Vercel deployment status")
        sys.exit(1)


if __name__ == "__main__":
    main()
