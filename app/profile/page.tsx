'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { User, Hammer, Calendar, Package, Trash2, Loader2, ArrowLeft, LogIn } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import UserMenu from '@/components/UserMenu';
import Link from 'next/link';

interface SavedMod {
  $id: string;
  mod_name: string;
  mod_description: string;
  minecraft_version: string;
  file_url: string;
  $createdAt: string;
}

interface Profile {
  username: string;
  bio: string;
  avatar_url: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mods, setMods] = useState<SavedMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, modsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/mods'),
        ]);
        const profileData = await profileRes.json();
        const modsData = await modsRes.json();

        if (profileData.profile) setProfile(profileData.profile);
        if (modsData.mods) setMods(modsData.mods);
      } catch (err) {
        console.error('Failed to fetch profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleDeleteMod = async (docId: string) => {
    setDeleting(docId);
    try {
      const res = await fetch('/api/mods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });
      if (res.ok) {
        setMods(prev => prev.filter(m => m.$id !== docId));
      }
    } catch (err) {
      console.error('Failed to delete mod:', err);
    } finally {
      setDeleting(null);
    }
  };

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
            <User className="w-10 h-10 text-zinc-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black mb-2">Sign in to view your profile</h1>
            <p className="text-zinc-500 text-sm">Create an account to save and manage your generated mods.</p>
          </div>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all"
          >
            <LogIn className="w-4 h-4" /> Sign In
          </button>
          <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="bg-linear-to-br from-orange-500 to-orange-700 p-2 rounded-xl shadow-lg shadow-orange-900/20">
                <Hammer className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter uppercase">FabricGen</span>
            </Link>
          </div>
          <UserMenu />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Profile Header */}
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg shadow-orange-900/20">
                {profile?.username
                  ? profile.username.slice(0, 2).toUpperCase()
                  : user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-black tracking-tight">{profile?.username || user?.name || 'User'}</h1>
                <p className="text-zinc-500 text-sm mt-1">{user?.email}</p>
                {profile?.bio && (
                  <p className="text-zinc-400 text-sm mt-3">{profile.bio}</p>
                )}
              </div>
              <Link
                href="/settings"
                className="text-xs font-bold text-zinc-500 hover:text-orange-500 transition-colors border border-zinc-800 px-4 py-2 rounded-xl hover:border-orange-500/30"
              >
                Edit Profile
              </Link>
            </div>

            {/* Generated Mods */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black flex items-center gap-2">
                  <Package className="w-5 h-5 text-orange-500" /> Generated Mods
                </h2>
                <span className="text-xs text-zinc-600 font-bold">{mods.length} mod{mods.length !== 1 ? 's' : ''}</span>
              </div>

              {mods.length === 0 ? (
                <div className="border border-zinc-800 rounded-2xl p-12 text-center">
                  <Package className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500 text-sm">No saved mods yet.</p>
                  <Link href="/" className="text-orange-500 text-sm font-bold hover:underline mt-2 inline-block">
                    Generate your first mod →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {mods.map((mod) => (
                    <div key={mod.$id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-start justify-between group hover:border-zinc-700 transition-colors">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-zinc-100">{mod.mod_name}</h3>
                        {mod.mod_description && (
                          <p className="text-xs text-zinc-500 mt-1 truncate">{mod.mod_description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(mod.$createdAt).toLocaleDateString()}
                          </span>
                          <span>MC {mod.minecraft_version}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMod(mod.$id)}
                        disabled={deleting === mod.$id}
                        className="p-2 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete mod"
                      >
                        {deleting === mod.$id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
