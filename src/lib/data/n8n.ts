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

/** Latest execution for many workflows, fetched in parallel and cached as one unit. */
export function makeExecutionsFetcher(workflowIds: string[]) {
  return cachedFetcher("n8n-executions", TTL.n8n, async () => {
    const results = await Promise.all(
      workflowIds.map(async (id) => {
        try {
          return [id, await fetchLatestExecution(id)] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    return Object.fromEntries(results) as Record<string, N8nExecution | null>;
  });
}
