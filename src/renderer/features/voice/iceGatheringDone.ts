/** Resolve once ICE gathering finishes (or settles), so the posted offer carries its candidates. */
export function iceGatheringDone(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    let settle: number | undefined;
    const done = () => {
      window.clearTimeout(settle);
      window.clearTimeout(cap);
      pc.removeEventListener("icecandidate", onCandidate);
      pc.removeEventListener("icegatheringstatechange", onState);
      resolve();
    };
    // Inworld's sample: stop 500 ms after the last candidate, or after 3 s regardless.
    const cap = window.setTimeout(done, 3000);
    const onCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) return;
      window.clearTimeout(settle);
      settle = window.setTimeout(done, 500);
    };
    const onState = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    pc.addEventListener("icecandidate", onCandidate);
    pc.addEventListener("icegatheringstatechange", onState);
  });
}
