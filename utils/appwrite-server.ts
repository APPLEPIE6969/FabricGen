import { Client, Databases, Users, Account, Query } from 'node-appwrite';

// ── Server-side Appwrite Admin Client ──────────────────────────────────
// Uses the API key for admin-level operations (creating users, querying
// all collections, etc.). Only use in API routes, NEVER on the client.

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/+$/, '') || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '69af5ae2000dfd855871')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const users = new Users(client);

// Database & Collection IDs (from Phase 1 setup)
export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
export const COLLECTIONS = {
  PROFILES: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_PROFILES_ID || '',
  USER_SETTINGS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USER_SETTINGS_ID || '',
  GENERATED_MODS: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_GENERATED_MODS_ID || '',
};

// ── Helper: Create a session-scoped client ─────────────────────────────
// For verifying the logged-in user from a session token passed via cookie.
export function createSessionClient(sessionToken: string) {
  const sessionClient = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.replace(/\/+$/, '') || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '69af5ae2000dfd855871')
    .setSession(sessionToken);

  return {
    account: new Account(sessionClient),
    databases: new Databases(sessionClient),
  };
}

export { client, databases, users, Query };
