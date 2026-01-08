
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { User, Dispensary, Driver } from '@/lib/types';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

const NotifyDriversInputSchema = z.object({
  orderId: z.string().describe('The ID of the order that is ready for pickup.'),
  dispensaryId: z.string().describe('The ID of the dispensary where the order is ready.'),
});

export type NotifyDriversInput = z.infer<typeof NotifyDriversInputSchema>;

export async function notifyDrivers(input: NotifyDriversInput): Promise<{ success: boolean; notificationsSent: number }> {
    return notifyDriversFlow(input);
}

const notifyDriversFlow = ai.defineFlow(
  {
    name: 'notifyDriversFlow',
    inputSchema: NotifyDriversInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      notificationsSent: z.number(),
    }),
  },
  async ({ orderId, dispensaryId }) => {
    try {
      // 1. Get Dispensary details for the message
      const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
      if (!dispensaryDoc.exists) {
        throw new Error(`Dispensary with ID ${dispensaryId} not found.`);
      }
      const dispensary = dispensaryDoc.data() as Dispensary;

      // 2. Find all online drivers, regardless of state
      const driversQuery = db.collection('drivers')
        .where('availabilityStatus', '==', 'online');
      
      const driversSnapshot = await driversQuery.get();
      if (driversSnapshot.empty) {
        console.log(`No online drivers found.`);
        return { success: true, notificationsSent: 0 };
      }

      // 3. Get FCM tokens for each driver
      const driverTokens: string[] = [];
      for (const driverDoc of driversSnapshot.docs) {
        const driver = driverDoc.data() as Driver;
        const userDoc = await db.collection('users').doc(driver.userId).get();
        if (userDoc.exists) {
          const user = userDoc.data() as User;
          if (user.fcmTokens && user.fcmTokens.length > 0) {
            driverTokens.push(...user.fcmTokens);
          }
        }
      }
      
      const uniqueTokens = [...new Set(driverTokens)];
      if (uniqueTokens.length === 0) {
        console.log('Found online drivers, but none have registered for push notifications.');
        return { success: true, notificationsSent: 0 };
      }

      // 4. Send Notifications
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: 'New Delivery Available!',
          body: `An order from ${dispensary.name} is ready for pickup.`,
        },
        webpush: {
          fcmOptions: {
            link: '/driver/dashboard/deliveries' // This opens the app to the specified page
          },
          notification: {
              icon: '/icons/icon-192x192.png'
          }
        },
        tokens: uniqueTokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      console.log(`Successfully sent ${response.successCount} messages.`);
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(uniqueTokens[idx]);
          }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
        // Here you might want to implement logic to clean up invalid tokens
      }

      return { success: true, notificationsSent: response.successCount };

    } catch (error) {
      console.error('Error in notifyDriversFlow:', error);
      return { success: false, notificationsSent: 0 };
    }
  }
);
