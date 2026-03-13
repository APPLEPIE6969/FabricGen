import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function verify() {
  const lines: string[] = [];
  const dbList = await databases.list();
  const db = dbList.databases[0];
  lines.push('APPWRITE_DATABASE_ID=' + db.$id);
  
  const colList = await databases.listCollections(db.$id);
  for (const col of colList.collections) {
    const envKey = 'APPWRITE_COLLECTION_' + col.name.toUpperCase() + '_ID';
    lines.push(envKey + '=' + col.$id);
  }
  
  const outPath = path.resolve(process.cwd(), 'appwrite-ids.txt');
  fs.writeFileSync(outPath, lines.join('\n'));
}

verify().catch(console.error);
