import { inworldRequest } from "./inworldRequest";

/** Create the realtime call: post the renderer's SDP offer and return Inworld's answer. */
export async function exchangeVoiceSdp(key: string, offer: string): Promise<string> {
  const res = await inworldRequest(key, "/v1/realtime/calls", {
    method: "POST",
    contentType: "application/sdp",
    body: offer,
    signal: AbortSignal.timeout(20_000),
  });
  return res.text();
}
