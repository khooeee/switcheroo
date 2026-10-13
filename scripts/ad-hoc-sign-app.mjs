import { execFileSync } from "node:child_process";

/**
 * Re-seal the packaged bundle with an ad-hoc signature.
 *
 * Packager rewrites Info.plist, renames helpers, and patches binaries after
 * Electron's prebuilt signature was made, leaving the bundle seal invalid.
 * Gatekeeper reports quarantined downloads with an invalid seal as "damaged";
 * a valid ad-hoc seal gets the normal "unidentified developer" prompt instead.
 * Must run last: any later change inside the bundle (or Finder icon xattrs on
 * it) breaks the seal again.
 * @param {string} appDir
 */
export function adHocSignApp(appDir) {
  if (process.platform !== "darwin") return;

  execFileSync(
    "codesign",
    [
      "--sign",
      "-",
      "--force",
      "--deep",
      "--preserve-metadata=entitlements,requirements,flags,runtime",
      appDir,
    ],
    { stdio: "pipe" },
  );
  execFileSync("codesign", ["--verify", "--deep", "--strict", appDir], { stdio: "pipe" });
}
