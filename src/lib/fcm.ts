import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";

export async function requestNotificationPermissionAndToken() {
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return { success: false, error: "Messaging not supported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, error: "Permission not granted" };
  }

  let registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");

  if (!registration) {
    registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  }

  await navigator.serviceWorker.ready;

  const activeRegistration =
    (await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")) || registration;

  if (!activeRegistration?.active) {
    return { success: false, error: "No active service worker" };
  }

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: activeRegistration,
  });

  if (!token) {
    return { success: false, error: "Failed to get token" };
  }

  return { success: true, token };
}

export async function listenForegroundMessages(
  callback: (payload: any) => void,
) {
  console.log("[FCM][Foreground] Initializing foreground listener...");
  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    console.warn("[FCM][Foreground] Messaging instance unavailable.");
    return null;
  }
  console.log("[FCM][Foreground] Messaging ready, attaching onMessage.");
  return onMessage(messaging, (payload) => {
    console.log("[FCM][Foreground] Push payload received in app:", payload);
    callback(payload);
  });
}
