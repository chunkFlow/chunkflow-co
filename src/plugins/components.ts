import { App } from 'vue';
import { AuthModal, UserProfile, SentryTestPage } from '../components';

// Register all global components
export function registerComponents(app: App) {
    app.component('AuthModal', AuthModal);
    app.component('UserProfile', UserProfile);
    app.component('SentryTestPage', SentryTestPage);
}