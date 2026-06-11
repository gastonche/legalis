/**
 * Worker bindings. The Worker is now a stateless proxy — all secrets + agent
 * state live in the Mastra brain service. BRAIN_URL is set in wrangler.jsonc
 * (dev) / as a var on deploy.
 */
export interface Env {
  BRAIN_URL: string;
  /** Shared bearer token the brain requires when publicly exposed. */
  BRAIN_TOKEN?: string;
}
