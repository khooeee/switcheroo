import { BrowserWindow, clipboard, Menu } from "electron";
import { saveMarkdownFile } from "../files/saveMarkdownFile";
import type { SaveMarkdownView } from "../../shared/saveMarkdownView";

const SAVE_VIEW_LABELS: Record<SaveMarkdownView, string> = {
  session: "Save Session as Markdown…",
  switchboard: "Save Switchboard as Markdown…",
  "turn-details": "Save Turn Details as Markdown…",
  subagent: "Save Subagent as Markdown…",
};

/** Native Copy (+ optional Copy Link / Copy Code / Copy Message / Save Message as Markdown / Find / Turn Details / Save <view> as Markdown). */
export function showEditContextMenu(
  win: BrowserWindow | null,
  opts: {
    link?: string;
    code?: string;
    markdown?: string;
    canCopy?: boolean;
    canFind?: boolean;
    turnDetails?: { turnId: string; eventId: string };
    saveView?: SaveMarkdownView;
  } = {},
): void {
  if (!win || win.isDestroyed()) return;
  const items: Electron.MenuItemConstructorOptions[] = [];
  if (opts.link) {
    items.push(
      { label: "Copy Link", click: () => void clipboard.writeText(opts.link!) },
      { type: "separator" },
    );
  }
  items.push({ role: "copy", enabled: !!opts.canCopy });
  if (opts.code) {
    items.push({
      label: "Copy Code",
      click: () => void clipboard.writeText(opts.code!),
    });
  }
  if (opts.markdown) {
    items.push({
      label: "Copy Message",
      click: () => void clipboard.writeText(opts.markdown!),
    }, {
      label: "Save Message as Markdown…",
      click: () => void saveMarkdownFile(win, opts.markdown!).catch(console.error),
    });
  }
  if (opts.saveView) {
    const view = opts.saveView;
    items.push({
      label: SAVE_VIEW_LABELS[view],
      click: () => win.webContents.send("markdown:save-view", view),
    });
  }
  if (opts.canFind || opts.turnDetails) {
    items.push({ type: "separator" });
  }
  if (opts.canFind) {
    items.push({
      label: "Find in Message",
      click: () => win.webContents.send("find:open-scoped"),
    });
  }
  if (opts.turnDetails) {
    items.push({
      label: "Turn Details",
      click: () => win.webContents.send("turn:details", opts.turnDetails),
    });
  }
  Menu.buildFromTemplate(items).popup({ window: win });
}
