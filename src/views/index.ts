import { defineAsyncComponent } from 'vue';
import { loadView, views } from './viewLoader';

// Re-export views and loader
export { loadView, views } from './viewLoader';
export type { ViewName } from './viewLoader';