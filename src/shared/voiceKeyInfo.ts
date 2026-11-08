/** Whether an Inworld API key is saved, and whether the OS keychain encrypts it. */
export interface VoiceKeyInfo {
  hasKey: boolean;
  secure: boolean;
}
