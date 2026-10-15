import { memo, useCallback, useState } from "react";
import { transcriptImageUrl } from "./transcriptImageUrl";
import "./images.css";

/** Images an agent's tools returned or viewed; click one to toggle full size. */
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
  if (missing) return <div className="transcript-image-missing">Image unavailable</div>;
  return (
    <button
      type="button"
      className={`transcript-image${expanded ? " expanded" : ""}`}
      onClick={toggle}
      aria-label={expanded ? "Shrink image" : "Expand image"}
    >
      <img src={transcriptImageUrl(name)} alt="" loading="lazy" onError={markMissing} />
    </button>
  );
});
