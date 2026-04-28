<script lang="ts">
  import { goto } from "$app/navigation";
  import { authStore } from "$lib/stores/auth";
  import ProfileCreateForm from "$lib/components/profile/ProfileCreateForm.svelte";
  import { createMembershipProfile } from "$lib/api/auth";
  import type { ProfileCreateSubmitPayload } from "$lib/components/profile/ProfileCreateForm.svelte";

  let loading = $state(false);
  let submitError = $state("");
  let submitSuccess = $state("");

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
        role: "teacher",
        firstName: payload.firstName,
        lastName: payload.lastName,
        preferredSubjectIds: payload.preferredSubjectIds,
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
        role: "tutor",
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
      await goto("/teacher/dashboard");
    } catch (error) {
      submitError =
        error instanceof Error ? error.message : "Something went wrong";
    } finally {
      loading = false;
    }
  }
</script>

<ProfileCreateForm
  role="teacher"
  {loading}
  {submitError}
  {submitSuccess}
  on:submit={handleSubmit}
/>
