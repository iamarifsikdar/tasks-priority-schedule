// Beautiful HTML email template for the priority task digest.
// Inline styles only — email clients have inconsistent CSS support.

export interface DigestTask {
  title: string;
  description: string | null;
  priority: "urgent" | "high" | "medium" | "low";
  due_date: string | null;
}

const PRIORITY_META: Record<
  DigestTask["priority"],
  { label: string; color: string; bg: string; border: string; order: number }
> = {
  urgent: { label: "Urgent", color: "#8a6914", bg: "#fdf6e3", border: "#e6c66a", order: 1 },
  high: { label: "High", color: "#b91c1c", bg: "#fef2f2", border: "#fca5a5", order: 2 },
  medium: { label: "Medium", color: "#c2410c", bg: "#fff7ed", border: "#fdba74", order: 3 },
  low: { label: "Low", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1", order: 4 },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function renderDigestHtml(opts: {
  subject: string;
  appName: string;
  recipientName?: string | null;
  tasks: DigestTask[];
  appUrl: string;
}): string {
  const { subject, appName, recipientName, tasks, appUrl } = opts;

  const grouped: Record<DigestTask["priority"], DigestTask[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  for (const t of tasks) grouped[t.priority].push(t);

  const totalCount = tasks.length;
  const urgentCount = grouped.urgent.length;

  const greeting = recipientName ? `Hi ${escapeHtml(recipientName)},` : "Hi there,";

  const sections = (Object.keys(grouped) as DigestTask["priority"][])
    .sort((a, b) => PRIORITY_META[a].order - PRIORITY_META[b].order)
    .filter((p) => grouped[p].length > 0)
    .map((priority) => {
      const meta = PRIORITY_META[priority];
      const items = grouped[priority]
        .map(
          (t, i) => `
          <tr>
            <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f3; vertical-align: top;">
              <div style="display: flex; align-items: flex-start;">
                <div style="font-size: 13px; color: #94a3b8; font-weight: 600; min-width: 24px;">${i + 1}.</div>
                <div style="flex: 1;">
                  <div style="font-size: 15px; font-weight: 600; color: #0f172a; line-height: 1.4;">
                    ${escapeHtml(t.title)}
                  </div>
                  ${
                    t.description
                      ? `<div style="font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.5;">${escapeHtml(t.description)}</div>`
                      : ""
                  }
                  ${
                    t.due_date
                      ? `<div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">Due ${escapeHtml(formatDueDate(t.due_date))}</div>`
                      : ""
                  }
                </div>
              </div>
            </td>
          </tr>`,
        )
        .join("");

      return `
        <tr>
          <td style="padding: 24px 0 8px;">
            <div style="display: inline-block; padding: 5px 12px; border-radius: 999px; background: ${meta.bg}; color: ${meta.color}; border: 1px solid ${meta.border}; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;">
              ${meta.label} · ${grouped[priority].length}
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
              ${items}
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const emptyState = `
    <tr>
      <td style="padding: 40px 24px; text-align: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
        <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
        <div style="font-size: 16px; font-weight: 600; color: #0f172a;">No pending tasks</div>
        <div style="font-size: 14px; color: #64748b; margin-top: 6px;">You're all caught up. Enjoy your day!</div>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${urgentCount > 0 ? `${urgentCount} urgent · ` : ""}${totalCount} pending task${totalCount === 1 ? "" : "s"}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px;">
              <div style="font-size: 13px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #64748b;">
                ${escapeHtml(appName)}
              </div>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 32px 28px; box-shadow: 0 1px 3px rgba(15,23,42,0.04);">
              <div style="font-size: 14px; color: #64748b;">${greeting}</div>
              <h1 style="margin: 8px 0 0; font-size: 24px; font-weight: 700; line-height: 1.3; color: #0f172a;">
                ${
                  totalCount === 0
                    ? "You're all caught up"
                    : `You have <span style="background: linear-gradient(135deg,#d4af37,#b8941f); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${totalCount}</span> pending task${totalCount === 1 ? "" : "s"}`
                }
              </h1>
              ${
                urgentCount > 0
                  ? `<div style="margin-top: 14px; padding: 12px 16px; background: #fdf6e3; border-left: 4px solid #d4af37; border-radius: 6px; font-size: 14px; color: #8a6914;">
                      <strong>${urgentCount} urgent</strong> ${urgentCount === 1 ? "task needs" : "tasks need"} your attention.
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Sections -->
          ${tasks.length === 0 ? emptyState : sections}

          <!-- CTA -->
          <tr>
            <td style="padding: 28px 0 8px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: #0f172a; border-radius: 10px;">
                    <a href="${escapeHtml(appUrl)}" style="display: inline-block; padding: 12px 22px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">
                      Open ${escapeHtml(appName)} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 0 0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6;">
              You're receiving this because you enabled email digests in ${escapeHtml(appName)}.<br>
              <a href="${escapeHtml(appUrl)}/settings" style="color: #64748b; text-decoration: underline;">Manage preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderDigestText(tasks: DigestTask[], appName: string): string {
  if (tasks.length === 0) return `${appName}\n\nNo pending tasks. You're all caught up!`;
  const grouped: Record<DigestTask["priority"], DigestTask[]> = { urgent: [], high: [], medium: [], low: [] };
  for (const t of tasks) grouped[t.priority].push(t);
  const out = [`${appName}`, ``, `You have ${tasks.length} pending task${tasks.length === 1 ? "" : "s"}.`, ``];
  for (const p of ["urgent", "high", "medium", "low"] as const) {
    if (grouped[p].length === 0) continue;
    out.push(`== ${PRIORITY_META[p].label.toUpperCase()} (${grouped[p].length}) ==`);
    grouped[p].forEach((t, i) => {
      out.push(`${i + 1}. ${t.title}`);
      if (t.description) out.push(`   ${t.description}`);
    });
    out.push(``);
  }
  return out.join("\n");
}