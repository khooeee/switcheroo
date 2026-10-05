import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./terminalPanel.css";

/** Full-pane terminal for a child tab. Stays mounted while visited so scrollback is kept. */
export function TerminalPanel({ tabId, active }: { tabId: string; active: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 13,
      theme: {
        background: "#0d1117",
        foreground: "#e6edf3",
        cursor: "#e6edf3",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
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

    return () => {
      disposed = true;
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
      <div className="terminal-host" ref={hostRef} />
    </section>
  );
}
