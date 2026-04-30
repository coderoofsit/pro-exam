import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { getAuthTokenFromCookies } from "$lib/auth/cookieToken";
import { getTeacherStudents, blockStudents, unblockStudents, removeStudents } from "$lib/api/studentManagement";

export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  const token = getAuthTokenFromCookies(cookies) ?? null;
  const pageNum = Math.max(parseInt(url.searchParams.get("page") ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "15", 10) || 15, 1),
    15,
  );
  const search = (url.searchParams.get("search") ?? "").trim();
  const isActiveRaw = url.searchParams.get("isActive");

  return {
    ssrAuthMissing: !token?.trim(),
    actionError: url.searchParams.get("actionError"),
    streamed: {
      studentsData: token?.trim()
        ? getTeacherStudents({
            token,
            fetchFn: fetch,
            page: pageNum,
            limit,
            search: search || undefined,
            isActive: isActiveRaw ?? undefined,
          }).then((res) => (res.success ? res.data?.data ?? null : null))
        : Promise.resolve(null),
    },
  };
};

export const actions: Actions = {
  block: async ({ request, cookies, fetch }) => {
    const token = getAuthTokenFromCookies(cookies) ?? null;
    if (!token?.trim()) return fail(401, { message: "Missing auth token" });

    const form = await request.formData();
    const ids = form
      .getAll("students")
      .map((v) => String(v).trim())
      .filter(Boolean);

    if (!ids.length) return fail(400, { message: "Missing students" });

    const res = await blockStudents({ token, students: ids, fetchFn: fetch });
    if (!res.success) {
      return fail(400, { message: res.message || "Block failed" });
    }

    return { success: true };
  },

  unblock: async ({ request, cookies, fetch }) => {
    const token = getAuthTokenFromCookies(cookies) ?? null;
    if (!token?.trim()) return fail(401, { message: "Missing auth token" });

    const form = await request.formData();
    const ids = form
      .getAll("students")
      .map((v) => String(v).trim())
      .filter(Boolean);

    if (!ids.length) return fail(400, { message: "Missing students" });

    const res = await unblockStudents({ token, students: ids, fetchFn: fetch });
    if (!res.success) {
      return fail(400, { message: res.message || "Unblock failed" });
    }

    return { success: true };
  },

  remove: async ({ request, cookies, fetch }) => {
    const token = getAuthTokenFromCookies(cookies) ?? null;
    if (!token?.trim()) return fail(401, { message: "Missing auth token" });

    const form = await request.formData();
    const ids = form
      .getAll("students")
      .map((v) => String(v).trim())
      .filter(Boolean);

    if (!ids.length) return fail(400, { message: "Missing students" });

    const res = await removeStudents({ token, students: ids, fetchFn: fetch });
    if (!res.success) {
      return fail(400, { message: res.message || "Remove failed" });
    }

    return { success: true };
  }
};

