// Serves the JobsQ Connector file (one copy, kept in the project's connector/ folder) for users to download.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const body = await readFile(join(process.cwd(), "..", "connector", "jobsq-connector.mjs"), "utf8");
  return new Response(body, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Content-Disposition": 'attachment; filename="jobsq-connector.mjs"' },
  });
}
