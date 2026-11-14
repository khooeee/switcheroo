import themeCss from "../../renderer/features/theme/theme.css?raw";
import type { Theme } from "../../shared/appSettings";
import type { ReminderAlert } from "./ReminderAlert";

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * The toast page, styled with the app's own theme tokens. Clicks report back by setting the title to
 * `open` or `dismiss`; there is no preload.
 */
export function reminderToastHtml(alert: ReminderAlert, theme: Theme): string {
  const head = [alert.title, alert.subtitle].filter(Boolean).map((part) => escapeHtml(part!)).join(" · ");
  return `<!doctype html>
<html data-theme="${theme}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(alert.title)}</title>
<style>
${themeCss}
html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
body { color: var(--text); cursor: pointer; user-select: none; }
.toast { box-sizing: border-box; position: relative; height: 100%; padding: 11px 34px 11px 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-1); }
.head { font: 600 var(--font-ui-size)/1.35 var(--font-ui); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.body { margin-top: 5px; font: var(--font-mono-weight) var(--font-mono-size)/1.35 var(--font-mono); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; white-space: pre-line; }
.close { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: var(--text-dim); font: 16px/22px var(--font-ui); cursor: pointer; }
.close:hover { background: var(--bg-3); color: var(--text); }
</style>
</head>
<body>
<div class="toast">
<div class="head">${head}</div>
<div class="body">${escapeHtml(alert.body)}</div>
<button class="close" aria-label="Dismiss">×</button>
</div>
<script>
document.body.addEventListener("click", () => { document.title = "open"; });
document.querySelector(".close").addEventListener("click", (event) => {
  event.stopPropagation();
  document.title = "dismiss";
});
</script>
</body>
</html>`;
}
