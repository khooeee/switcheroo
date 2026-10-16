import { app, net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TRANSCRIPT_IMAGE_SCHEME } from "../../shared/transcriptImageScheme";
import { imagesDir } from "../storage/userDataPaths";

/** Only names storeImage writes, so a URL can never reach outside the images dir. */
const IMAGE_NAME = /^[a-f0-9]{64}\.(png|jpg|gif|webp)$/;

/**
 * Serve saved transcript images as switcheroo-image://images/<name>.
 * Call before app ready: the scheme must be registered as privileged first.
 */
export function installImageProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: TRANSCRIPT_IMAGE_SCHEME, privileges: { standard: true, secure: true } },
  ]);
  void app.whenReady().then(() => {
    protocol.handle(TRANSCRIPT_IMAGE_SCHEME, async (request) => {
      const name = path.posix.basename(new URL(request.url).pathname);
      if (!IMAGE_NAME.test(name)) return notFound();
      return net.fetch(pathToFileURL(path.join(imagesDir(), name)).toString()).catch(notFound);
    });
  });
}

function notFound(): Response {
  return new Response(null, { status: 404 });
}
