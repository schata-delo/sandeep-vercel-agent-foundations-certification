import { Sandbox } from "@vercel/sandbox";

export const SANDBOX_NAME = "admin-agent-sandbox";

export const createOrGetSandbox = async (name: string) => {
  try {
    console.log(`[sandbox] getting "${name}"`);
    const sandbox = await Sandbox.get({ name });
    console.log(`[sandbox] reusing existing "${name}"`);
    return sandbox;
  } catch (getErr) {
    console.log(
      `[sandbox] get "${name}" failed, creating a new one:`,
      getErr instanceof Error ? getErr.message : getErr,
    );
    try {
      const sandbox = await Sandbox.create({
        name,
        // persistent: true is the beta default; auto-snapshots on stop, auto-resumes on next get
        snapshotExpiration: 7 * 24 * 60 * 60 * 1000, // 7 days
        timeout: 2700000, // 45 minutes
      });
      console.log(`[sandbox] created "${name}"`);
      return sandbox;
    } catch (createErr) {
      console.error(
        `[sandbox] create "${name}" failed:`,
        createErr instanceof Error ? createErr.message : createErr,
      );
      throw createErr;
    }
  }
};