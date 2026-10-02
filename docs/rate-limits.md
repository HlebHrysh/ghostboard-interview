# Ghostboard v2 — Rate Limiting & Anti-Abuse Architecture

This document describes the rate limiting architecture using `@upstash/ratelimit` and `@upstash/redis`.

## Tier Limits

| Tier | Monthly AI Requests | Max Call Duration | Burst Protection (per min) |
|---|---|---|---|
| **Free Trial** | 60 requests / month | 60 minutes session | 10 requests / min |
| **Pro Pass** | 3,000 requests / month | Unlimited | 30 requests / min |
| **Lifetime Pass** | 3,000 requests / month | Unlimited | 30 requests / min |

## Edge Middleware Implementation

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "ghostboard_ratelimit",
});
```

When a user exceeds the threshold, the server returns HTTP status `429 Too Many Requests` with a standard `Retry-After: 60` header and human-readable Ukrainian message guiding the candidate to upgrade.
