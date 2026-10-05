import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./terminalPanel.css";

/** Full-pane terminal for a child tab. PTY stays alive in main across remounts. */
export function TerminalPanel({ tabId }: { tabId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

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
    const unsubExit = window.switcheroo.onTerminalExit(({ tabId: id }) => {
      if (id !== tabId) return;
      term.writeln("\r\n[Process exited]");
    });

    const onData = term.onData((data) => {
      void window.switcheroo.writeTerminal(tabId, data);
    });

    const observer = new ResizeObserver(() => {
      fit.fit();
      void window.switcheroo.resizeTerminal(tabId, term.cols, term.rows);
    });
    observer.observe(host);
    term.focus();

    return () => {
      disposed = true;
      observer.disconnect();
      onData.dispose();
      unsubData();
      unsubExit();
      term.dispose();
    };
  }, [tabId]);

  return (
    <section className="terminal-panel" aria-label="Terminal">
      <div className="terminal-host" ref={hostRef} />
    </section>
  );
}
