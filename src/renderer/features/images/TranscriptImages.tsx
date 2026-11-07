import { memo, useCallback, useState, type MouseEvent } from "react";
import { transcriptImageUrl } from "./transcriptImageUrl";
import "./images.css";

/** Images an agent's tools returned or viewed; click one to toggle full size, right-click to save it. */
export const TranscriptImages = memo(function TranscriptImages({ names }: { names?: string[] }) {
  if (!names?.length) return null;
  return (
    <div className="transcript-images">
      {names.map((name) => <TranscriptImage key={name} name={name} />)}
    </div>
  );
});

const TranscriptImage = memo(function TranscriptImage({ name }: { name: string }) {
  const [expanded, setExpanded] = useState(false);
  const [missing, setMissing] = useState(false);
  const toggle = useCallback(() => setExpanded((value) => !value), []);
  const markMissing = useCallback(() => setMissing(true), []);
  const openMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    void window.switcheroo.showImageContextMenu(name);
  }, [name]);
  if (missing) return <div className="transcript-image-missing">Image unavailable</div>;
  return (
    <button
      type="button"
      className={`transcript-image${expanded ? " expanded" : ""}`}
      onClick={toggle}
      onContextMenu={openMenu}
      aria-label={expanded ? "Shrink image" : "Expand image"}
    >
      <img src={transcriptImageUrl(name)} alt="" loading="lazy" onError={markMissing} />
    </button>
  );
});
