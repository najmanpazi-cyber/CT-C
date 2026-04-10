// ROI Export — generates a printable HTML report showing errors caught and estimated savings.

import type { StoredValidation, UserMetrics } from "@/services/historyService";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function openRoiReport(
  validations: StoredValidation[],
  metrics: UserMetrics,
  userEmail: string,
): void {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const firstDate = validations.length > 0
    ? formatDate(validations[validations.length - 1].created_at)
    : now;
  const lastDate = validations.length > 0
    ? formatDate(validations[0].created_at)
    : now;

  const issueRows = validations
    .filter((v) => v.overall_status === "issues_found")
    .map((v) => `
      <tr>
        <td>${formatDate(v.created_at)}</td>
        <td class="code">${escapeHtml(v.input_data.cptCodes?.join(", ") ?? "—")}</td>
        <td class="fail">${v.errors_found} error${v.errors_found !== 1 ? "s" : ""}</td>
        <td class="warn">${v.warnings_found} warning${v.warnings_found !== 1 ? "s" : ""}</td>
        <td>$${(v.errors_found * 35).toLocaleString()}</td>
      </tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ClaimVex ROI Report — ${escapeHtml(userEmail)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 13px; color: #191c1e; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #003358; padding-bottom: 16px; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 800; color: #003358; letter-spacing: -0.5px; }
    .logo span { font-weight: 400; font-size: 14px; color: #42474f; display: block; margin-top: 2px; }
    .meta { text-align: right; color: #42474f; font-size: 12px; line-height: 1.8; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .metric { background: #f7f9fb; border: 1px solid #e0e3e5; border-radius: 12px; padding: 20px; text-align: center; }
    .metric .value { font-size: 36px; font-weight: 800; color: #003358; }
    .metric .value.green { color: #006b5e; }
    .metric .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #42474f; margin-top: 4px; }
    .summary { background: #006b5e; color: white; padding: 24px 32px; border-radius: 12px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between; }
    .summary .amount { font-size: 42px; font-weight: 800; }
    .summary .desc { font-size: 14px; opacity: 0.9; max-width: 300px; }
    h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #003358; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 32px; }
    th { background: #f2f4f6; color: #42474f; font-weight: 700; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e0e3e5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    td { padding: 8px 12px; border-bottom: 1px solid #e0e3e5; }
    .code { font-family: "Courier New", monospace; font-weight: 700; }
    .fail { color: #ba1a1a; font-weight: 700; }
    .warn { color: #E65100; font-weight: 700; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e3e5; font-size: 10px; color: #727780; line-height: 1.6; }
    @media print { body { padding: 20px; } @page { margin: 0.75in; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">ClaimVex<span>ROI Report</span></div>
    </div>
    <div class="meta">
      Generated: ${now}<br/>
      Account: ${escapeHtml(userEmail)}<br/>
      Period: ${firstDate} — ${lastDate}
    </div>
  </div>

  <div class="summary">
    <div>
      <div class="amount">$${metrics.estimatedSavings.toLocaleString()}</div>
      <div style="font-size:12px;opacity:0.8;margin-top:4px;">Estimated cost avoidance</div>
    </div>
    <div class="desc">
      Based on ${metrics.totalErrors} coding error${metrics.totalErrors !== 1 ? "s" : ""} caught across ${metrics.totalValidations} validation${metrics.totalValidations !== 1 ? "s" : ""}. Each error represents a potential claim denial averaging $35 in rework cost.
    </div>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="value">${metrics.totalValidations}</div>
      <div class="label">Validations Run</div>
    </div>
    <div class="metric">
      <div class="value" style="color:#ba1a1a;">${metrics.totalErrors}</div>
      <div class="label">Errors Caught</div>
    </div>
    <div class="metric">
      <div class="value green">${metrics.errorRate.toFixed(1)}%</div>
      <div class="label">Error Rate</div>
    </div>
  </div>

  ${issueRows ? `
  <h2>Claims with Issues Detected</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>CPT Codes</th>
        <th>Errors</th>
        <th>Warnings</th>
        <th>Est. Savings</th>
      </tr>
    </thead>
    <tbody>${issueRows}</tbody>
  </table>` : ""}

  <h2>Methodology</h2>
  <p style="font-size:12px;color:#42474f;line-height:1.8;margin-bottom:24px;">
    ClaimVex validates claims against 5 rule modules: NCCI PTP pair edits, MUE unit limits, Modifier 59/X requirements,
    Global Period conflict detection, and Documentation Sufficiency checks. All rules are sourced from CMS NCCI edit files
    and AMA CPT guidelines. The $35 per-error cost estimate is based on industry-average claim rework costs
    (MGMA 2024 Cost Survey). Actual savings depend on practice volume, payer mix, and baseline error rate.
  </p>

  <div class="footer">
    This report was generated by ClaimVex (claimvex.com). It provides estimated cost avoidance based on coding errors detected
    during validation. These figures are estimates and do not constitute financial or legal advice. All codes should be verified
    by a qualified coder before claim submission. &copy; 2026 ClaimVex.
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
