import type { Session } from "../../../shared/types";
import { groupMatchesFilter } from "../../../shared/tabNav";

/** True when a chat group (parent or any child) matches the rail filter. */
export function sessionMatchesFilter(session: Session, query: string): boolean {
  return groupMatchesFilter(session, query);
}
