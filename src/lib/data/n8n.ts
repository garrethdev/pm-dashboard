import { TTL, cachedFetcher } from "@/lib/data/cache";

/**
 * n8n public REST API — latest execution per tracked workflow. Parser built
 * from the observed response of GET /api/v1/executions?workflowId=…&limit=1
 * on 2026-08-31: {data: [{id, finished, mode, status, startedAt, stoppedAt}]}.
 */
export interface N8nExecution {
  id: string;
  status: string; // "success" | "error" | "crashed" | "running" | "waiting" | ...
  startedAt: string;
  stoppedAt: string | null;
  finished: boolean;
}

async function fetchLatestExecution(workflowId: string): Promise<N8nExecution | null> {
  const res = await fetch(
    `${process.env.N8N_BASE_URL}/api/v1/executions?workflowId=${workflowId}&limit=1`,
    {
      headers: { "X-N8N-API-KEY": process.env.N8N_API_KEY! },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`n8n HTTP ${res.status}`);
  const body = (await res.json()) as { data: N8nExecution[] };
  return body.data?.[0] ?? null;
}

/**
 * What a read of one workflow produced.
 *
 * The third case is the point. `null` used to mean both "n8n answered, this
 * workflow has never run" AND "n8n could not be reached", and the automation
 * card rendered both as "No runs" -- so an unreachable n8n looked like a fleet
 * of idle workflows rather than a blind dashboard. UNREACHABLE keeps the two
 * apart all the way to the pill.
 */
export const UNREACHABLE = "unreachable" as const;
export type ExecutionRead = N8nExecution | null | typeof UNREACHABLE;

/** Latest execution for many workflows, fetched in parallel and cached as one unit. */
export function makeExecutionsFetcher(workflowIds: string[]) {
  return cachedFetcher("n8n-executions", TTL.n8n, async () => {
    const results = await Promise.all(
      workflowIds.map(async (id) => {
        try {
          return [id, await fetchLatestExecution(id)] as const;
        } catch (err) {
          console.error(`n8n execution read failed for workflow ${id}`, err);
          return [id, UNREACHABLE] as const;
        }
      }),
    );
    return Object.fromEntries(results) as Record<string, ExecutionRead>;
  });
}
