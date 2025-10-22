import { defineComponent, h } from 'vue';
import { defineAsyncComponent } from 'vue';

// Loading component shown while view is loading
const LoadingComponent = defineComponent({
    name: 'AsyncLoading',
    render() {
        return h('div', { class: 'async-loading' }, 'Loading...');
    }
});

// Error component shown if view fails to load
const ErrorComponent = defineComponent({
    name: 'AsyncError',
    props: {
        error: { type: Error, required: true },
        retry: { type: Function, required: true }
    },
    render() {
        return h('div', { class: 'async-error' }, [
            h('p', `Error loading view: ${this.error.message}`),
            h('button', { onClick: this.retry }, 'Retry')
        ]);
    }
});

// Helper for dynamic view loading
export const views = {
    AudiobookView: defineAsyncComponent({
        loader: () => import('./AudiobookView').then(m => m.default),
        loadingComponent: LoadingComponent,
        errorComponent: ErrorComponent,
        delay: 200, // Show loading component after 200ms
        timeout: 10000 // Time out after 10s
    }),
    AvatarsView: defineAsyncComponent({
        loader: () => import('./AvatarsView').then(m => m.default),
        loadingComponent: LoadingComponent,
        errorComponent: ErrorComponent,
        delay: 200,
        timeout: 10000
    }),
    SentryTestPage: defineAsyncComponent({
        loader: () => import('../components/SentryTestPage').then(m => m.SentryTestPage),
        loadingComponent: LoadingComponent,
        errorComponent: ErrorComponent,
        delay: 200,
        timeout: 10000
    })
};

// Type-safe view name checking
export type ViewName = keyof typeof views;

export function loadView(name: ViewName) {
    return views[name];
}