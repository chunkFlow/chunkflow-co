import { App } from 'vue';
import { initSentry } from './sentry';

// Initialize app plugins and features
export async function initializeApp(app: App) {
    // Initialize Sentry first
    try {
        await initSentry(app);
    } catch (e) {
        console.warn('Sentry initialization failed:', e);
    }

    // Return the initialized app
    return app;
}