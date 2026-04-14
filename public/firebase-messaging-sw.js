importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "REAL_API_KEY",
  authDomain: "REAL_AUTH_DOMAIN",
  projectId: "REAL_PROJECT_ID",
  storageBucket: "REAL_STORAGE_BUCKET",
  messagingSenderId: "REAL_MESSAGING_SENDER_ID",
  appId: "REAL_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "New Notification";

  self.registration.showNotification(title, {
    body: payload?.notification?.body || "",
    icon: "/favicon.png",
    data: payload?.data || {},
  });
});
