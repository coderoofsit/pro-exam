<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth";
  import ProfileCreateForm from "$lib/components/profile/ProfileCreateForm.svelte";
  import { createMembershipProfile } from "$lib/api/auth";
  import { getExamsClient } from "$lib/api/exams";
  import type { Exam } from "$lib/api/exams";
  import type { ProfileCreateSubmitPayload } from "$lib/components/profile/ProfileCreateForm.svelte";

  let { data } = $props<{
    data: { exams: Exam[]; examsLoadError?: string | null };
  }>();

  let loading = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");
  let profileExams = $state<Exam[]>([...(data.exams ?? [])]);
  let examsLoadError = $state<string | null>(data.examsLoadError ?? null);

  const exams = $derived(profileExams);

  onMount(async () => {
    authStore.restore();

    if (!$authStore.profileId) {
      await goto("/login");
      return;
    }

    if (profileExams.length > 0) {
      return;
    }

    const res = await getExamsClient();
    if (res.success) {
      profileExams = res.exams;
      examsLoadError = null;
    } else {
      examsLoadError = res.message;
    }
  });

  async function handleSubmit(event: CustomEvent<ProfileCreateSubmitPayload>) {
    const userId = $authStore.profileId;
    if (!userId) {
      await goto("/login");
      return;
    }

    loading = true;
    submitError = "";
    submitSuccess = "";

    const payload = event.detail;

    try {
      const response = await createMembershipProfile({
        userId,
        role: "institute",
        firstName: payload.firstName,
        lastName: payload.lastName,
        preferredExamIds: payload.preferredExamIds,
        imageFile: payload.imageFile,
        token: $authStore.token,
      });

      if (!response.success) {
        submitError = response.message || "Failed to create profile";
        return;
      }

      const membershipResponse = response.data;
      const apiUsers = membershipResponse?.data?.users ?? [];
      const token = membershipResponse?.data?.token ?? null;
      if (token) {
        const sessionRes = await fetch("/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, role: "institute" })
        });
        if (!sessionRes.ok) {
          submitError = "Could not activate login session. Please login again.";
          return;
        }
      }

      authStore.setAuthAfterMembership({
        token,
        role: "institute",
        users: apiUsers.map((user) => ({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          image: user.image,
          instituteId: user.instituteId ?? null,
          teacherId: user.teacherId ?? null,
          adminId: user.adminId ?? null,
        })),
      });

      submitSuccess =
        membershipResponse?.message || "Profile created successfully";
      await goto("/institute/dashboard");
    } catch (error) {
      submitError =
        error instanceof Error ? error.message : "Something went wrong";
    } finally {
      loading = false;
    }
  }
</script>

{#if examsLoadError}
  <div
    class="mx-auto mb-4 max-w-2xl rounded-xl border border-[var(--pc-error-border)] bg-[var(--pc-error-bg)] px-4 py-3 text-sm text-[var(--pc-error-text)]"
    role="alert"
  >
    Could not load the exam list ({examsLoadError}). Check your connection, refresh the page, or
    ensure <code class="rounded bg-black/10 px-1">VITE_PUBLIC_API_URL</code> is set for the app.
  </div>
{/if}

<ProfileCreateForm
  role="institute"
  {exams}
  {loading}
  {submitError}
  {submitSuccess}
  on:submit={handleSubmit}
/>
