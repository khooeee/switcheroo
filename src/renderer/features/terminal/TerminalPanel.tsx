import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { terminalXtermTheme } from "./terminalTheme";
import { installTerminalLinks } from "./terminalLinks";
import "./terminalPanel.css";

/** Full-pane terminal for a child tab. Stays mounted while visited so scrollback is kept. */
export function TerminalPanel({
  tabId,
  active,
  parentTitle,
  title,
  cwd,
}: {
  tabId: string;
  active: boolean;
  parentTitle: string;
  title: string;
  cwd: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const mono =
      rootStyle.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace";
    const fontWeight =
      rootStyle.getPropertyValue("--font-mono-weight").trim() || "500";
    const fontSize = Number.parseFloat(
      rootStyle.getPropertyValue("--font-mono-size").trim(),
    ) || 13;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: mono,
      fontWeight,
      fontSize,
      theme: terminalXtermTheme(),
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    installTerminalLinks(term);
    term.open(host);
    fit.fit();
    fitRef.current = fit;
    termRef.current = term;

    // Let app tab-switching win over the terminal textarea.
    term.attachCustomKeyEventHandler((event) => {
      if (event.key === "Tab" && event.ctrlKey && !event.metaKey && !event.altKey) {
        return false;
      }
      return true;
    });

    let disposed = false;
    void window.switcheroo.attachTerminal(tabId).then(() => {
      if (disposed) return;
      const { cols, rows } = term;
      void window.switcheroo.resizeTerminal(tabId, cols, rows);
    });

    const unsubData = window.switcheroo.onTerminalData(({ tabId: id, data }) => {
      if (id !== tabId) return;
      term.write(data);
    });

    const onData = term.onData((data) => {
      void window.switcheroo.writeTerminal(tabId, data);
    });

    const observer = new ResizeObserver(() => {
      if (host.offsetParent === null) return;
      fit.fit();
      void window.switcheroo.resizeTerminal(tabId, term.cols, term.rows);
    });
    observer.observe(host);

    const themeObserver = new MutationObserver(() => {
      term.options.theme = terminalXtermTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      disposed = true;
      themeObserver.disconnect();
      observer.disconnect();
      onData.dispose();
      unsubData();
      fitRef.current = null;
      termRef.current = null;
      term.dispose();
    };
  }, [tabId]);

  useEffect(() => {
    if (!active) return;
    const fit = fitRef.current;
    const term = termRef.current;
    if (!fit || !term) return;
    // display:none panels need a fit pass when shown again.
    requestAnimationFrame(() => {
      fit.fit();
      void window.switcheroo.resizeTerminal(tabId, term.cols, term.rows);
      term.focus();
    });
  }, [active, tabId]);

  return (
    <section
      className="terminal-panel"
      aria-label="Terminal"
      hidden={!active}
      aria-hidden={!active}
    >
      <div className="panel-header">
        <div>
          <h2>{`${parentTitle} > ${title}`}</h2>
          <div className="meta">{cwd}</div>
        </div>
      </div>
      <div className="terminal-host" ref={hostRef} />
    </section>
  );
}
