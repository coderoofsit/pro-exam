<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { dismissNotification } from '$lib/api/auth';
  import { authStore } from '$lib/stores/auth';

  let { type, onDismiss }: { 
    type: 'freeTrial' | 'goingToEnd' | 'expired', 
    onDismiss: () => void 
  } = $props();

  let isSubmitting = $state(false);

  const content = {
    freeTrial: {
      title: 'Experience Premium',
      message: 'You are currently on a free trial. Upgrade now to unlock all premium features and personalized exams!',
      icon: '✨',
      btnText: 'Upgrade Plan',
      btnClass: 'bg-gradient-to-r from-purple-600 to-indigo-600'
    },
    goingToEnd: {
      title: 'Subscription Expiring',
      message: 'Your subscription is ending within 24 hours. Renew today to avoid any interruption in your learning journey.',
      icon: '⏰',
      btnText: 'Renew Now',
      btnClass: 'bg-gradient-to-r from-orange-500 to-red-500'
    },
    expired: {
      title: 'Plan Expired',
      message: 'Your subscription has expired. Please choose a plan to continue accessing your tests and reports.',
      icon: '⚠️',
      btnText: 'Choose Plan',
      btnClass: 'bg-gradient-to-r from-red-600 to-rose-600'
    }
  }[type];

  async function handleDismiss() {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      await dismissNotification({ type, token: $authStore.token });
      onDismiss();
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
      onDismiss(); // Close anyway to avoid stuck modal
    } finally {
      isSubmitting = false;
    }
  }

  function handleAction() {
    // Navigate to pricing or subscription page
    window.location.href = '/student/subscription';
  }
</script>

<div 
  class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  transition:fade={{ duration: 200 }}
>
  <div 
    class="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl"
    transition:scale={{ duration: 300, delay: 100, easing: quintOut, start: 0.9 }}
  >
    <!-- Background Decoration -->
    <div class="absolute top-0 left-0 w-full h-32 opacity-10 bg-gradient-to-br from-indigo-500 to-purple-500"></div>
    
    <div class="relative p-8 pt-10 text-center">
      <div class="inline-flex items-center justify-center w-20 h-20 mb-6 text-4xl bg-slate-100 dark:bg-slate-800 rounded-full shadow-inner">
        {content.icon}
      </div>

      <h2 class="mb-3 text-2xl font-bold text-slate-900 dark:text-white">
        {content.title}
      </h2>
      
      <p class="mb-8 text-slate-600 dark:text-slate-400 leading-relaxed">
        {content.message}
      </p>

      <div class="flex flex-col gap-3">
        <button
          onclick={handleAction}
          class="w-full py-3.5 px-6 rounded-xl text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] {content.btnClass}"
        >
          {content.btnText}
        </button>
        
        <button
          onclick={handleDismiss}
          disabled={isSubmitting}
          class="w-full py-3 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          {isSubmitting ? 'Processing...' : 'Remind me later'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  /* Optional: Custom glassmorphism or shadows */
</style>
