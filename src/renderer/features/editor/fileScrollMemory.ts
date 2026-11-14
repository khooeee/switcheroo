/** Document position at the top of each open file's viewport, keyed `${sessionId}\0${path}`. */
export const fileScrollMemory = new Map<string, number>();
