import { PropType } from 'vue';
import { User } from 'firebase/auth';

// Common prop types
export interface BaseProps {
    class?: string;
    style?: string | Record<string, string | number>;
}

// User Profile Props
export interface UserProfileProps extends BaseProps {
    user: User | null;
    show: boolean;
}

// Auth Modal Props
export interface AuthModalProps extends BaseProps {
    show: boolean;
}

// Sentry Test Page Props
export interface SentryTestPageProps extends BaseProps {
    // Add any specific props for SentryTestPage
}