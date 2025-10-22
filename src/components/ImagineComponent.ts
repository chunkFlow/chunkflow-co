import { defineComponent, ref, computed, onMounted, reactive } from 'vue';
import { useAuth } from '../composables/useAuth';
import { loadView } from '../views';
import { AuthModal, UserProfile, SentryTestPage } from '.';

export const ImagineComponent = defineComponent({
    name: 'ImagineComponent',
    setup() {
        // Authentication state
        const { currentUser, isAuthenticated, loading: authLoading } = useAuth();
        const showAuthModal = ref(false);
        const showProfileModal = ref(false);
        const authMode = ref<'login' | 'signup' | 'reset'>('login');
        const currentView = ref<'avatars' | 'audiobook' | 'sentry-test'>('avatars');

        // Load and cache views
        const views = reactive({
            avatars: null as any,
            audiobook: null as any
        });

        // Handle view switching
        const switchView = async (view: 'avatars' | 'audiobook' | 'sentry-test') => {
            currentView.value = view;
            if (view === 'avatars' && !views.avatars) {
                views.avatars = await loadView('AvatarsView');
            } else if (view === 'audiobook' && !views.audiobook) {
                views.audiobook = await loadView('AudiobookView');
            }
        }; return {
            // Auth state
            currentUser,
            isAuthenticated,
            authLoading,
            showAuthModal,
            showProfileModal,
            authMode,

            // View management
            currentView,
            views,
            switchView,

            // Components
            AuthModal,
            UserProfile,
            SentryTestPage
        };
    },
    template: `
    <div class="bg-blue w-full h-full flex flex-col items-center p-2 lg:p-4 text-black overflow-hidden font-sans">
      <header class="w-full flex justify-between items-center mb-2 lg:mb-4 px-2">
        <div class="flex items-center space-x-2">
          <h1 class="text-xl lg:text-3xl font-bold">Audio Avatars</h1>
        </div>
        <div class="flex items-center space-x-4">
          <div class="bg-white/50 p-1 rounded-full flex text-sm">
             <button @click="switchView('avatars')" class="px-3 py-1 rounded-full transition-colors" :class="currentView === 'avatars' ? 'bg-black text-white' : 'hover:bg-black/10'">Avatars</button>
             <button @click="switchView('audiobook')" class="px-3 py-1 rounded-full transition-colors" :class="currentView === 'audiobook' ? 'bg-black text-white' : 'hover:bg-black/10'">Audiobook Creator</button>
             <button @click="switchView('sentry-test')" class="px-3 py-1 rounded-full transition-colors" :class="currentView === 'sentry-test' ? 'bg-black text-white' : 'hover:bg-black/10'">Test Errors</button>
          </div>
          <div class="flex items-center space-x-2">
            <button
              v-if="!isAuthenticated && !authLoading"
              @click="authMode = 'login'; showAuthModal = true"
              class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-full transition"
            >
              Sign In
            </button>
            <button
              v-if="isAuthenticated"
              @click="showProfileModal = true"
              class="bg-white/50 hover:bg-white text-black font-bold p-2 rounded-full aspect-square flex items-center justify-center"
              :title="currentUser?.displayName || 'Profile'"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- View container -->
      <main class="w-full flex-grow">
        <template v-if="currentView === 'avatars'">
          <component v-if="views.avatars" :is="views.avatars" />
          <div v-else class="w-full flex-grow flex items-center justify-center p-8 text-gray-500">Loading avatars...</div>
        </template>
        <template v-else-if="currentView === 'audiobook'">
          <component v-if="views.audiobook" :is="views.audiobook" />
          <div v-else class="w-full flex-grow flex items-center justify-center p-8 text-gray-500">Loading audiobook...</div>
        </template>
        <template v-else-if="currentView === 'sentry-test'">
          <SentryTestPage />
        </template>
      </main>

      <!-- Auth Modal -->
      <AuthModal 
        v-if="showAuthModal"
        :show="showAuthModal"
        :mode="authMode"
        @close="showAuthModal = false"
      />

      <!-- Profile Modal -->
      <UserProfile
        v-if="showProfileModal"
        :show="showProfileModal"
        :user="currentUser"
        @close="showProfileModal = false"
      />
    </div>
  `
});