import { inworldRequest } from "./inworldRequest";

/** STUN/TURN servers for the voice peer connection. */
export async function fetchIceServers(key: string): Promise<RTCIceServer[]> {
  const res = await inworldRequest(key, "/v1/realtime/ice-servers", { signal: AbortSignal.timeout(10_000) });
  const body = (await res.json()) as { ice_servers?: RTCIceServer[] };
  return Array.isArray(body.ice_servers) ? body.ice_servers : [];
}
