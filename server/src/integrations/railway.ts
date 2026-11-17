// Railway's public GraphQL API — used only to show "how much credit is
// left" on the admin dashboard, nothing else (no deploy/service control).
// Needs an Account API token (Railway dashboard → Account Settings →
// Tokens) in RAILWAY_API_TOKEN; without it the tile just says "not
// connected", same zero-config pattern as the other integrations.
//
// Railway reports an auth failure as HTTP 200 with a GraphQL `errors` array,
// not a 4xx — both are checked below.
const ENDPOINT = "https://backboard.railway.com/graphql/v2";
const TIMEOUT_MS = 10_000;
const CACHE_MS = 60_000;

export function isRailwayConfigured(): boolean {
  return !!process.env.RAILWAY_API_TOKEN;
}

export interface RailwayUsage {
  planName: string | null;
  currentUsage: number;
  creditBalance: number;
  remainingUsageCreditBalance: number;
  usageLimit: { softLimit: number | null; hardLimit: number | null; isOverLimit: boolean } | null;
  billingPeriod: { start: string; end: string } | null;
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RAILWAY_API_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as { data?: T; errors?: { message?: string }[] } | null;
  if (body?.errors?.length) throw new Error(body.errors.map((e) => e.message ?? "Unknown error").join("; "));
  if (!res.ok || !body?.data) throw new Error(`Railway API error (${res.status})`);
  return body.data;
}

async function resolveWorkspaceId(): Promise<string> {
  const configured = process.env.RAILWAY_WORKSPACE_ID?.trim();
  if (configured) return configured;
  const data = await graphql<{ me: { workspaces: { id: string }[] } }>(
    `query Me { me { workspaces { id } } }`
  );
  const id = data.me.workspaces[0]?.id;
  if (!id) throw new Error("No Railway workspace found for this token");
  return id;
}

let cache: { at: number; data: RailwayUsage } | null = null;

export async function getRailwayUsage(): Promise<RailwayUsage> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const workspaceId = await resolveWorkspaceId();
  const data = await graphql<{
    workspace: {
      plan: string | null;
      customer: {
        currentUsage: number;
        creditBalance: number;
        remainingUsageCreditBalance: number;
        billingPeriod: { start: string; end: string } | null;
        usageLimit: { softLimit: number | null; hardLimit: number | null; isOverLimit: boolean } | null;
      };
    };
  }>(
    `query WorkspaceBilling($workspaceId: String!) {
      workspace(workspaceId: $workspaceId) {
        plan
        customer {
          currentUsage
          creditBalance
          remainingUsageCreditBalance
          billingPeriod { start end }
          usageLimit { softLimit hardLimit isOverLimit }
        }
      }
    }`,
    { workspaceId }
  );
  const usage: RailwayUsage = {
    planName: data.workspace.plan,
    currentUsage: data.workspace.customer.currentUsage,
    creditBalance: data.workspace.customer.creditBalance,
    remainingUsageCreditBalance: data.workspace.customer.remainingUsageCreditBalance,
    usageLimit: data.workspace.customer.usageLimit,
    billingPeriod: data.workspace.customer.billingPeriod,
  };
  cache = { at: Date.now(), data: usage };
  return usage;
}
