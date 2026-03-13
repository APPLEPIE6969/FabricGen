import { NextResponse } from 'next/server';
import { createSessionClient, databases, DB_ID, COLLECTIONS, Query } from '@/utils/appwrite-server';
import { cookies } from 'next/headers';

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

// GET /api/profile — Fetch user's profile
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = await databases.listDocuments(DB_ID, COLLECTIONS.PROFILES, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);

    if (result.documents.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: result.documents[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT /api/profile — Update user's profile
// Body: { username?, bio?, avatar_url? }
export async function PUT(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const allowedFields = ['username', 'bio', 'avatar_url'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Find the user's profile document
    const result = await databases.listDocuments(DB_ID, COLLECTIONS.PROFILES, [
      Query.equal('user_id', userId),
      Query.limit(1),
    ]);

    if (result.documents.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const updated = await databases.updateDocument(
      DB_ID,
      COLLECTIONS.PROFILES,
      result.documents[0].$id,
      updates
    );

    return NextResponse.json({ profile: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
