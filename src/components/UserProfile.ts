/**
 * User Profile Component
 *
 * Displays user information, subscription status, and usage statistics
 */

import { defineComponent, ref, computed, onMounted, PropType } from 'vue';
import { User } from 'firebase/auth';
import { signOutUser, getUserProfile, UserProfile as UserProfileType } from '../firebase';
import type { UserProfileProps } from '../types/components';

export const UserProfile = defineComponent<UserProfileProps>({
  name: 'UserProfile',
  props: {
    user: {
      type: Object as PropType<User | null>,
      required: true
    },
    show: {
      type: Boolean,
      required: true
    },
    class: String,
    style: [String, Object]
  },
  emits: ['close', 'signedOut'],
  setup(props, { emit }) {
    const userProfile = ref<UserProfileType | null>(null);
    const loading = ref(true);
    const error = ref('');

    const displayName = computed(() => {
      return props.user?.displayName || userProfile.value?.displayName || 'User';
    });

    const email = computed(() => {
      return props.user?.email || 'No email';
    });

    const subscriptionPlan = computed(() => {
      return userProfile.value?.subscription?.plan || 'free';
    });

    const subscriptionStatus = computed(() => {
      return userProfile.value?.subscription?.status || 'active';
    });

    const usage = computed(() => {
      return userProfile.value?.usage || {
        audioBooksCreated: 0,
        audioMinutesGenerated: 0,
        imagesGenerated: 0,
        storageUsedMB: 0,
      };
    });

    const planBadgeColor = computed(() => {
      switch (subscriptionPlan.value) {
        case 'pro':
          return 'bg-purple-100 text-purple-800';
        case 'basic':
          return 'bg-blue-100 text-blue-800';
        case 'enterprise':
          return 'bg-yellow-100 text-yellow-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    });

    const statusBadgeColor = computed(() => {
      switch (subscriptionStatus.value) {
        case 'active':
          return 'bg-green-100 text-green-800';
        case 'canceled':
          return 'bg-orange-100 text-orange-800';
        case 'expired':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    });

    async function loadUserProfile() {
      if (!props.user) return;

      try {
        loading.value = true;
        error.value = '';
        const profile = await getUserProfile(props.user.uid);
        userProfile.value = profile;
      } catch (err: any) {
        console.error('Failed to load user profile:', err);
        error.value = 'Failed to load profile data';
      } finally {
        loading.value = false;
      }
    }

    async function handleSignOut() {
      try {
        await signOutUser();
        emit('signedOut');
        emit('close');
      } catch (err: any) {
        console.error('Sign out failed:', err);
        error.value = 'Failed to sign out';
      }
    }

    function close() {
      emit('close');
    }

    onMounted(() => {
      if (props.user) {
        loadUserProfile();
      }
    });

    return {
      userProfile,
      loading,
      error,
      displayName,
      email,
      subscriptionPlan,
      subscriptionStatus,
      usage,
      planBadgeColor,
      statusBadgeColor,
      handleSignOut,
      close,
    };
  },
  template: `
    <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="close">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Profile</h2>
          <button @click="close" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
          {{ error }}
        </div>

        <!-- Profile Content -->
        <div v-else class="space-y-6">
          <!-- User Info -->
          <div class="flex items-center space-x-4 pb-6 border-b">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {{ displayName.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="text-xl font-semibold text-gray-800">{{ displayName }}</h3>
              <p class="text-gray-600">{{ email }}</p>
            </div>
          </div>

          <!-- Subscription Info -->
          <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-gray-800 mb-3">Subscription</h4>
            <div class="flex items-center gap-3 mb-2">
              <span :class="planBadgeColor" class="px-3 py-1 rounded-full text-sm font-medium uppercase">
                {{ subscriptionPlan }}
              </span>
              <span :class="statusBadgeColor" class="px-3 py-1 rounded-full text-sm font-medium">
                {{ subscriptionStatus }}
              </span>
            </div>
            <p class="text-sm text-gray-600 mt-2">
              <span v-if="subscriptionPlan === 'free'">
                Upgrade to unlock unlimited audiobook creation and advanced features.
              </span>
              <span v-else>
                Thank you for being a {{ subscriptionPlan }} member!
              </span>
            </p>
          </div>

          <!-- Usage Statistics -->
          <div>
            <h4 class="text-lg font-semibold text-gray-800 mb-3">Usage Statistics</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-3xl font-bold text-blue-600">{{ usage.audioBooksCreated }}</div>
                <div class="text-sm text-gray-600 mt-1">Audiobooks Created</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-3xl font-bold text-purple-600">{{ usage.audioMinutesGenerated }}</div>
                <div class="text-sm text-gray-600 mt-1">Audio Minutes</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-3xl font-bold text-green-600">{{ usage.imagesGenerated }}</div>
                <div class="text-sm text-gray-600 mt-1">Images Generated</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="text-3xl font-bold text-orange-600">{{ usage.storageUsedMB.toFixed(1) }}</div>
                <div class="text-sm text-gray-600 mt-1">MB Storage Used</div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-4 border-t space-y-3">
            <button
              v-if="subscriptionPlan === 'free'"
              class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-medium"
            >
              Upgrade to Pro
            </button>
            <button
              @click="handleSignOut"
              class="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
});
