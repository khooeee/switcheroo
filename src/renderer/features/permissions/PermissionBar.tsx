import type { PermissionRequest } from "../../../shared/types";

interface Props {
  request: PermissionRequest;
  onRespond: (optionId: string | "cancelled") => void;
}

export function PermissionBar({ request, onRespond }: Props) {
  return (
    <div className="permission-bar">
      <strong>Permission:</strong>
      <span>{request.toolCallTitle}</span>
      <div style={{ flex: 1 }} />
      {request.options.map((opt) => (
        <button
          key={opt.optionId}
          type="button"
          className="btn"
          onClick={() => onRespond(opt.optionId)}
        >
          {opt.name}
        </button>
      ))}
      <button type="button" className="btn danger" onClick={() => onRespond("cancelled")}>
        Cancel
      </button>
    </div>
  );
}
