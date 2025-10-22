import type { App } from 'vue';

export async function initSentry(app: App) {
    const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';
    const SENTRY_ENV = import.meta.env.VITE_SENTRY_ENV || (process.env.NODE_ENV || 'production');

    if (!SENTRY_DSN) {
        // no-op when DSN not provided
        return false;
    }

    try {
        // dynamic import so projects without Sentry don't fail at runtime
        const Sentry = await import('@sentry/vue');
        const Tracing = await import('@sentry/tracing');

        Sentry.init({
            app,
            dsn: SENTRY_DSN,
            environment: SENTRY_ENV,
            integrations: [new Tracing.Integrations.BrowserTracing()],
            tracesSampleRate: 0.05, // conservative default
        });

        // eslint-disable-next-line no-console
        console.log('Sentry initialized');
        return true;
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn('Sentry init failed:', err?.message || err);
        return false;
    }
}

export default initSentry;
