<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth";
  import { examStore } from "$lib/stores/exam";
  import ProfileCreateForm from "$lib/components/profile/ProfileCreateForm.svelte";
  import { createMembershipProfile } from "$lib/api/auth";
  import type { Exam } from "$lib/api/exams";
  import type { ProfileCreateSubmitPayload } from "$lib/components/profile/ProfileCreateForm.svelte";

  let { data } = $props<{ data: { exams: Exam[] } }>();

  let loading = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");

  const exams = $derived(
    $examStore.loaded && $examStore.exams.length > 0
      ? $examStore.exams
      : data.exams,
  );

  $effect(() => {
    if (!$examStore.loaded && data.exams.length > 0) {
      examStore.setExams(data.exams);
    }
  });

  $effect(() => {
    if (!$authStore.profileId) {
      goto("/login");
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

<ProfileCreateForm
  role="institute"
  {exams}
  {loading}
  {submitError}
  {submitSuccess}
  on:submit={handleSubmit}
/>
