import type { FindInSessionsHit } from "../../../shared/types";
import { formatDetailTimestamp } from "../settings/formatDetailTimestamp";
import { boldQueryMatches } from "./boldQueryMatches";
import type { useFindInHistorySearch } from "./useFindInHistorySearch";

type Search = ReturnType<typeof useFindInHistorySearch>;

export function FindInHistoryResults({
  search,
  onSelect,
}: {
  search: Search;
  onSelect: (hit: FindInSessionsHit) => void;
}) {
  return (
    <>
      {(search.searching || search.showToggleAll) && (
        <div className={`find-sessions-toolbar${search.searching ? " centered" : ""}`}>
          {search.searching ? (
            <button type="button" className="find-sessions-toggle-all" onClick={search.stopSearch}>
              Show results now
            </button>
          ) : null}
          {search.showToggleAll ? (
            <button type="button" className="find-sessions-toggle-all" onClick={search.toggleAllGroups}>
              {search.allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          ) : null}
        </div>
      )}
      {search.searching ? (
        <div className="find-sessions-empty">
          {search.scanComplete
            ? "Loading results…"
            : search.totalSessions > 0
              ? `Searching ${search.scanned.toLocaleString()} of ${search.totalSessions.toLocaleString()} sessions`
              : "Searching…"}
        </div>
      ) : search.emptyLabel ? (
        <div className="find-sessions-empty">{search.emptyLabel}</div>
      ) : (
        search.groups.map((group) => {
          const groupOpen = !search.collapsed.has(group.sessionId);
          return (
            <div key={group.sessionId} className="find-sessions-group">
              <button
                type="button"
                className="find-sessions-group-toggle"
                aria-expanded={groupOpen}
                onClick={() => search.toggleGroup(group.sessionId)}
              >
                <svg
                  className={`find-sessions-group-chevron${groupOpen ? " open" : ""}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="find-sessions-group-title">{group.title}</span>
                {!groupOpen && (
                  <span className="find-sessions-group-time">
                    {formatDetailTimestamp(group.hits[0]?.at ?? 0)}
                  </span>
                )}
              </button>
              {groupOpen && group.hits.map((hit) => {
                const index = search.visibleHits.indexOf(hit);
                return (
                  <button
                    key={`${hit.sessionId}:${hit.eventId}`}
                    type="button"
                    role="option"
                    aria-selected={index === search.selected}
                    data-selected={index === search.selected}
                    className={`find-sessions-hit${index === search.selected ? " selected" : ""}`}
                    onMouseEnter={() => search.setSelected(index)}
                    onClick={() => onSelect(hit)}
                  >
                    <span className="kind-pill">{hit.role}</span>
                    <div className="find-sessions-hit-snippet">
                      {boldQueryMatches(hit.snippet, search.searchedQuery ?? "")}
                    </div>
                    <span className="find-sessions-hit-time">{formatDetailTimestamp(hit.at)}</span>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </>
  );
}
