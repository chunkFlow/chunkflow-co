import { createApp } from 'vue';
import { ImagineComponent } from './components/ImagineComponent';
import { initializeApp } from './app';
import { validateEnvironment } from './config/env-validation';
import './styles/tailwind.css';

// Validate environment before starting
validateEnvironment();

// Create the app instance
const app = createApp(ImagineComponent);

// Initialize app features
initializeApp(app).then(() => {
    // Mount the app
    app.mount('#app');
}).catch((error) => {
    console.error('Failed to initialize app:', error);
});

// Development-only: expose test error trigger
if ((import.meta.env.MODE || 'development') !== 'production') {
    (window as any).triggerTestError = function triggerTestError() {
        throw new Error('Sentry test error - ChunkFlow test');
    };
}