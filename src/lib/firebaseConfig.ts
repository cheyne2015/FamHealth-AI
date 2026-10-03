/// <reference types="vite/client" />

// Safe loader for Firebase configuration
// In local/production it reads from firebase-applet-config.json or environment variables
// Prevents exposing sensitive cloud credentials in public GitHub repositories

const meta = import.meta as any;
const env = meta.env || {};

let resolvedConfig: any = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'famhealth-demo-project',
  appId: env.VITE_FIREBASE_APP_ID || '1:123456789:web:demo',
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoApiKeyForOpenSourceDemo',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'famhealth-demo.firebaseapp.com',
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'famhealth-demo.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  measurementId: '',
  oAuthClientId: '',
  recaptchaSiteKey: ''
};

try {
  // Dynamically import local config if it exists
  if (typeof meta.glob === 'function') {
    const localModules = meta.glob('../../firebase-applet-config.json', { eager: true });
    const localConfig = (localModules['../../firebase-applet-config.json'] as any)?.default;
    if (localConfig) {
      resolvedConfig = { ...resolvedConfig, ...localConfig };
    }
  }
} catch (e) {
  // Gracefully fallback to environment or demo configuration
}

export const firebaseConfig = resolvedConfig;
export default firebaseConfig;
