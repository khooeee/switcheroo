import * as fs from "node:fs/promises";
import * as path from "node:path";
import type * as acp from "@agentclientprotocol/sdk";

export class SessionFiles {
  constructor(private cwd: string) {}

  async read(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse> {
    return { content: await fs.readFile(this.resolvePath(params.path), "utf8") };
  }

  async write(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse> {
    const filePath = this.resolvePath(params.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.content, "utf8");
    return {};
  }

  private resolvePath(p: string): string {
    const resolved = path.isAbsolute(p) ? path.normalize(p) : path.resolve(this.cwd, p);
    const root = path.resolve(this.cwd);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      throw new Error("Path escapes workspace");
    }
    return resolved;
  }
}
