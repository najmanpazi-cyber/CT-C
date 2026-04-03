# ClaimVex /ops

Operations tooling for ClaimVex. Scripts are built and tested here by Claude Code. Pazi delivers them to Lu (OpenClaw agent) who runs them on a separate machine.

## How it works
- Claude Code builds and maintains all scripts in /ops/scripts/
- Pazi downloads scripts and sends them to Lu
- Lu stores them at ~/.openclaw/claimvex/scripts/ and runs them locally
- Lu stores operational data at ~/.openclaw/claimvex/data/
- Lu stores config at ~/.openclaw/claimvex/config/
- If a script has a bug, Lu reports to Pazi, Pazi routes here for a fix

## Scripts
- prospect_manager.py — manage prospect database (add, update, score, list, log sends)
- draft_generator.py — generate personalized outreach drafts from template + prospect data
- site_monitor.py — check claimvex.com health (HTTP 200 + content verification)
- competitor_check.py — track competitor page changes via hash comparison
- weekly_report.py — compile weekly/monthly ops report from local data files

## Local data structure (on Lu's machine)
~/.openclaw/claimvex/
├── scripts/        — these scripts
├── templates/      — email templates
├── config/         — configuration (competitors, monitor settings)
└── data/           — ALL operational data
    ├── prospects.json
    ├── outreach_log.json
    ├── outreach_drafts/
    ├── monitor_log.json
    └── competitors_state.json

## Default paths
All scripts default to ~/.openclaw/claimvex/ with overrides:
  --data-dir     Override data directory
  --config-dir   Override config directory
  --template-dir Override template directory
