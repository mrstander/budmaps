
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

const PushNotificationManager = () => {
  const firebaseApp = useFirebaseApp();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && firebaseApp && user && firestore) {
      const messaging = getMessaging(firebaseApp);

      // Listener for incoming messages when the app is in the foreground
      const unsubscribeOnMessage = onMessage(messaging, (payload) => {
        console.log('Foreground message received.', payload);
        toast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body || '',
        });
      });

      const requestPermissionAndToken = async () => {
        // --- VAPID key from Firebase project settings ---
        const vapidKey = 'BNv4-cD2ZqlminB_wXXtMiqCD-EoK-NLuQslvz6yIs44eoZqFSDfIu3gKWidWdZtLYbNJWaOIgzooqvQNw3bkLw'; 

        if (!vapidKey || vapidKey === 'YOUR_VAPID_KEY_HERE') {
            console.warn("VAPID key is not set in PushNotificationManager.tsx. Push notifications will not work.");
            return;
        }

        try {
          console.log('Requesting notification permission...');
          const permission = await Notification.requestPermission();

          if (permission === 'granted') {
            console.log('Notification permission granted.');
            const currentToken = await getToken(messaging, { vapidKey });

            if (currentToken) {
              console.log('FCM Token:', currentToken);
              // Save the token to the user's profile in Firestore
              const userDocRef = doc(firestore, 'users', user.uid);
              const userDoc = await getDoc(userDocRef);

              if (userDoc.exists()) {
                const userData = userDoc.data();
                const existingTokens = userData.fcmTokens || [];
                if (!existingTokens.includes(currentToken)) {
                    await updateDoc(userDocRef, {
                        fcmTokens: arrayUnion(currentToken)
                    });
                    console.log('FCM token saved to user profile.');
                } else {
                    console.log('FCM token already exists for this user.');
                }
              }

            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          } else {
            console.log('Unable to get permission to notify.');
          }
        } catch (err: any) {
            if (err.code === 'messaging/token-subscribe-failed') {
                console.warn(
                    `%c Push Notification Error: %c The FCM Registration API is likely disabled for your project. Please enable it to use push notifications.
                    %c 1. Visit: https://console.developers.google.com/apis/api/fcmregistrations.googleapis.com/overview?project=${firebaseApp.options.projectId}
                    %c 2. Click "Enable".
                    %c 3. Wait a few minutes and refresh the app.`,
                    'font-weight: bold; color: orange;',
                    'color: inherit;',
                    'font-weight: bold; color: #3b82f6;',
                    'font-weight: bold; color: #3b82f6;',
                    'font-weight: bold; color: #3b82f6;'
                );
            } else {
                console.error('An error occurred while retrieving token. ', err);
            }
        }
      };

      requestPermissionAndToken();

      return () => {
        unsubscribeOnMessage(); // Unsubscribe from the foreground message listener
      };
    }
  }, [firebaseApp, toast, user, firestore]);

  return null; // This component does not render anything
};

export default PushNotificationManager;
