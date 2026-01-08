// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-2096677728-ba1ec",
  "appId": "1:540932544168:web:91f5d7dcbf8d72c6c7d49d",
  "storageBucket": "studio-2096677728-ba1ec.appspot.com",
  "apiKey": "AIzaSyCfsiE0KNHNsY2fl2lV7yVhiRN3vP9gWoc",
  "authDomain": "studio-2096677728-ba1ec.firebaseapp.com",
  "messagingSenderId": "540932544168"
};


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
