export async function register() {
  // Fail-fast at server startup (not during `next build`) if production infra env is missing.
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    try {
      const { assertProductionEnv } = await import('./lib/envGuard');
      assertProductionEnv();
      const { assertSessionSecretValid } = await import('./lib/server/session');
      assertSessionSecretValid();
    } catch (err) {
      console.error('[FATAL] Production server startup validation failed:', err);
      process.exit(1);
    }
  }
}
