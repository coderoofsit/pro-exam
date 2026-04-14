import { apiRequest } from "../../http/api";
import { resolveApiToken } from "./authToken";

export type NotificationSender = {
  _id: string;
  firstName?: string;
  lastName?: string;
};

export type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  subType: string;
  isRead: boolean;
  createdDateIst: string;
  senderId?: NotificationSender | null;
};

export type NotificationsApiResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    items: NotificationItem[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type UnreadCountApiResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: number;
};

export async function fetchNotifications(
  params: { page: number; limit: number },
  fetchFn?: typeof fetch,
  options?: { token?: string | null },
) {
  const q = new URLSearchParams({
    page: String(Math.max(1, params.page)),
    limit: String(Math.max(1, Math.min(100, params.limit))),
  });

  const token = resolveApiToken(options?.token ?? null);
  return apiRequest<NotificationsApiResponse>({
    endpoint: `/api/v1/notifications?${q.toString()}`,
    method: "GET",
    fetch: fetchFn,
    token,
  });
}

export async function fetchUnreadNotificationCount(
  fetchFn?: typeof fetch,
  options?: { token?: string | null },
) {
  const token = resolveApiToken(options?.token ?? null);
  return apiRequest<UnreadCountApiResponse>({
    endpoint: "/api/v1/notifications/get-unread-count",
    method: "GET",
    fetch: fetchFn,
    token,
  });
}
