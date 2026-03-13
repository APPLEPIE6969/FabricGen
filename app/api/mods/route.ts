import { NextResponse } from 'next/server';
import { createSessionClient, databases, DB_ID, COLLECTIONS, Query } from '@/utils/appwrite-server';
import { cookies } from 'next/headers';
import { ID, Permission, Role } from 'node-appwrite';

// Helper: get user ID from session cookie
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('appwrite-session')?.value;
  if (!sessionToken) return null;

  try {
    const { account } = createSessionClient(sessionToken);
    const user = await account.get();
    return user.$id;
  } catch {
    return null;
  }
}

// GET /api/mods — List all saved mods for the current user
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await databases.listDocuments(DB_ID, COLLECTIONS.GENERATED_MODS, [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);

    return NextResponse.json({ mods: result.documents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch mods' }, { status: 500 });
  }
}

// POST /api/mods — Save a new generated mod
// Body: { mod_name, mod_description?, minecraft_version?, file_url? }
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.mod_name) {
      return NextResponse.json({ error: 'mod_name is required' }, { status: 400 });
    }

    const doc = await databases.createDocument(
      DB_ID,
      COLLECTIONS.GENERATED_MODS,
      ID.unique(),
      {
        user_id: userId,
        mod_name: body.mod_name,
        mod_description: body.mod_description || '',
        minecraft_version: body.minecraft_version || '1.21.11',
        file_url: body.file_url || '',
      },
      [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ]
    );

    return NextResponse.json({ mod: doc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save mod' }, { status: 500 });
  }
}

// DELETE /api/mods — Delete a saved mod
// Body: { documentId }
export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    // Verify ownership before deleting
    const doc = await databases.getDocument(DB_ID, COLLECTIONS.GENERATED_MODS, body.documentId);
    if (doc.user_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await databases.deleteDocument(DB_ID, COLLECTIONS.GENERATED_MODS, body.documentId);
    return NextResponse.json({ success: true, message: 'Mod deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete mod' }, { status: 500 });
  }
}
