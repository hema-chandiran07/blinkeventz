import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CircuitBreaker } from '../ai-planner/utils/circuit-breaker';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly circuitBreaker: CircuitBreaker;

  constructor() {
    this.circuitBreaker = new CircuitBreaker('firebase', {
      failureThreshold: 5,
      resetTimeoutSeconds: 30,
      successThreshold: 1,
    });
  }

  onModuleInit() {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  /**
   * Send push notification with reliability features:
   * - 10-second timeout wrapper using Promise.race
   * - Circuit breaker protection to prevent cascading failures
   */
  async sendPush(token: string, title: string, body: string) {
    const msg = {
      token,
      notification: { title, body },
    };

    // Timeout wrapper: reject after 10 seconds
    const sendWithTimeout = () =>
      Promise.race([
        admin.messaging().send(msg),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Firebase timeout after 10 seconds')), 10000),
        ),
      ]);

    // Execute with circuit breaker
    return this.circuitBreaker.execute(sendWithTimeout);
  }
}
