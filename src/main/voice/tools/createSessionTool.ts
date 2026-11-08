import * as path from "node:path";
import { AGENT_LABELS } from "../../../shared/agentLabels";
import { supportsSwitcherooAware } from "../../../shared/supportsSwitcherooAware";
import { clipText } from "../clipText";
import { railSessions } from "../railSessions";
import { resolveAgentKind } from "../resolveAgentKind";
import { resolveProjectCwd } from "../resolveProjectCwd";
import { toolArgs } from "../toolArgs";
import type { VoiceToolContext } from "../VoiceToolContext";

/** Start and select a session in a known project, and send it the first prompt, if any. */
export async function createSessionTool(ctx: VoiceToolContext, args: Record<string, unknown>): Promise<unknown> {
  const prompt = toolArgs.string(args, "prompt");
  const settings = ctx.sessions.getSettings();
  const focusCwd = ctx.focus.sessionId ? ctx.sessions.getSession(ctx.focus.sessionId)?.cwd : undefined;
  const project = resolveProjectCwd(railSessions(ctx.sessions), toolArgs.string(args, "project"), focusCwd ?? settings.lastCwd);
  if (!project.ok) return project;
  const agent = resolveAgentKind(toolArgs.string(args, "agent"), settings.lastAgent);
  if (!agent.ok) return agent;

  const title = toolArgs.string(args, "title") ?? (prompt ? clipText(prompt, 60) : undefined);
  const session = await ctx.sessions.createSession({
    agent: agent.agent,
    cwd: project.cwd,
    title,
    pin: true,
    switcherooAware: settings.lastSwitcherooAware && supportsSwitcherooAware(agent.agent),
  });
  if (session.status === "error") return { ok: false, error: session.error ?? "The session failed to start." };
  ctx.focus.sessionId = session.id;
  if (prompt) await ctx.sessions.enqueuePrompt(session.id, prompt);
  return { ok: true, title: session.title, project: path.basename(project.cwd), agent: AGENT_LABELS[agent.agent] };
}
