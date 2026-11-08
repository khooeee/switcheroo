/** Main → renderer instruction for the voice WebRTC connection. */
export type VoiceCommand =
  | { type: "connect"; iceServers: RTCIceServer[] }
  | { type: "disconnect" };
