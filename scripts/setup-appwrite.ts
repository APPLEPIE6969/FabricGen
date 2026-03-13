import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('Missing required environment variables. Check .env file.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

const DB_NAME = 'ModGeneratorDB';

// Collection definitions
const COLLECTIONS = [
  {
    name: 'Profiles',
    attributes: [
      { key: 'user_id', type: 'string', size: 128, required: true },
      { key: 'username', type: 'string', size: 64, required: false },
      { key: 'bio', type: 'string', size: 512, required: false },
      { key: 'avatar_url', type: 'string', size: 512, required: false },
    ],
  },
  {
    name: 'User_Settings',
    attributes: [
      { key: 'user_id', type: 'string', size: 128, required: true },
      { key: 'dark_mode', type: 'boolean', required: false, default: true },
      { key: 'default_minecraft_version', type: 'string', size: 32, required: false },
    ],
  },
  {
    name: 'Generated_Mods',
    attributes: [
      { key: 'user_id', type: 'string', size: 128, required: true },
      { key: 'mod_name', type: 'string', size: 128, required: false },
      { key: 'mod_description', type: 'string', size: 1024, required: false },
      { key: 'minecraft_version', type: 'string', size: 32, required: false },
      { key: 'file_url', type: 'string', size: 512, required: false },
    ],
  },
];

async function setup() {
  console.log('🚀 Starting Appwrite Database Setup...\n');
  console.log(`   Endpoint:  ${ENDPOINT}`);
  console.log(`   Project:   ${PROJECT_ID}\n`);

  // 1. Create Database
  console.log('📦 Creating database...');
  const db = await databases.create(ID.unique(), DB_NAME);
  console.log(`   ✓ Database created: "${db.name}" (ID: ${db.$id})\n`);

  // 2. Create Collections & Attributes
  for (const col of COLLECTIONS) {
    console.log(`📁 Creating collection: ${col.name}...`);

    // Document-level security: users can CRUD their own documents
    const collection = await databases.createCollection(
      db.$id,
      ID.unique(),
      col.name,
      [
        Permission.read(Role.users()),     // Any authenticated user can read (we'll filter by user_id in queries)
        Permission.create(Role.users()),   // Any authenticated user can create
        Permission.update(Role.users()),   // Any authenticated user can update
        Permission.delete(Role.users()),   // Any authenticated user can delete
      ],
      true // Enable document-level security
    );
    console.log(`   ✓ Collection created: "${collection.name}" (ID: ${collection.$id})`);

    // Create attributes
    for (const attr of col.attributes) {
      if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(
          db.$id,
          collection.$id,
          attr.key,
          attr.required,
          attr.default ?? undefined
        );
      } else {
        await databases.createStringAttribute(
          db.$id,
          collection.$id,
          attr.key,
          attr.size!,
          attr.required
        );
      }
      console.log(`      + Attribute: ${attr.key} (${attr.type}, ${attr.required ? 'required' : 'optional'})`);
    }
    console.log('');
  }

  // 3. Summary
  console.log('═══════════════════════════════════════════');
  console.log('✅ Phase 1 Complete!');
  console.log(`   Database ID: ${db.$id}`);
  console.log('   Save this ID in your .env as APPWRITE_DATABASE_ID');
  console.log('═══════════════════════════════════════════');
}

setup().catch((err) => {
  console.error('❌ Setup failed:', err.message || err);
  process.exit(1);
});
