'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Settings, User, Palette, Save, Loader2, Check, Hammer, LogIn, ChevronDown } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import UserMenu from '@/components/UserMenu';
import Link from 'next/link';

interface UserProfile {
  username: string;
  bio: string;
  avatar_url: string;
}

interface UserSettings {
  dark_mode: boolean;
  default_minecraft_version: string;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({ username: '', bio: '', avatar_url: '' });
  const [settings, setSettings] = useState<UserSettings>({ dark_mode: true, default_minecraft_version: '1.21.11' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [error, setError] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  
  const minecraftVersions = [
    { value: '1.21.11', label: '1.21.11 (Latest)' },
    { value: '1.21.4', label: '1.21.4' },
    { value: '1.21.3', label: '1.21.3' },
    { value: '1.21.1', label: '1.21.1' },
    { value: '1.21', label: '1.21' },
    { value: '1.20.6', label: '1.20.6' },
    { value: '1.20.4', label: '1.20.4' }
  ];

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [profileRes, settingsRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/settings'),
        ]);
        const profileData = await profileRes.json();
        const settingsData = await settingsRes.json();

        if (profileData.profile) {
          setProfile({
            username: profileData.profile.username || '',
            bio: profileData.profile.bio || '',
            avatar_url: profileData.profile.avatar_url || '',
          });
        }
        if (settingsData.settings) {
          setSettings({
            dark_mode: settingsData.settings.dark_mode ?? true,
            default_minecraft_version: settingsData.settings.default_minecraft_version || '1.21.11',
          });
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
            <Settings className="w-10 h-10 text-zinc-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black mb-2">Sign in to access settings</h1>
            <p className="text-zinc-500 text-sm">Manage your profile and preferences.</p>
          </div>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all active:scale-95 cursor-pointer"
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
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-3xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="space-y-10">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-1">Settings</h1>
              <p className="text-zinc-500 text-sm">Manage your profile and mod preferences.</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Profile Section */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
                <User className="w-4 h-4 text-orange-500" />
                <h2 className="font-bold text-sm">Profile</h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
                    placeholder="Your display name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all resize-none h-24"
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : profileSaved ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {profileSaved ? 'Saved!' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </section>

            {/* Preferences Section */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-500" />
                <h2 className="font-bold text-sm">Preferences</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-zinc-100">Dark Mode</p>
                    <p className="text-xs text-zinc-600">Toggle dark theme for the interface</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, dark_mode: !settings.dark_mode })}
                    className={`w-12 h-7 rounded-full transition-colors cursor-pointer active:scale-95 relative ${
                      settings.dark_mode ? 'bg-orange-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.dark_mode ? 'left-6' : 'left-1'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    Default Minecraft Version
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all flex items-center justify-between hover:bg-zinc-900 active:scale-[0.99] cursor-pointer"
                    >
                      {minecraftVersions.find(v => v.value === settings.default_minecraft_version)?.label || settings.default_minecraft_version}
                      <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isVersionDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isVersionDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {minecraftVersions.map((version) => (
                          <button
                            key={version.value}
                            onClick={() => {
                              setSettings({ ...settings, default_minecraft_version: version.value });
                              setIsVersionDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-800 cursor-pointer ${
                              settings.default_minecraft_version === version.value 
                                ? 'text-orange-500 font-bold bg-orange-500/10' 
                                : 'text-zinc-300'
                            }`}
                          >
                            {version.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {savingSettings ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : settingsSaved ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {settingsSaved ? 'Saved!' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </section>

            {/* Account Info */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-500" />
                <h2 className="font-bold text-sm">Account</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Email</p>
                    <p className="text-sm text-zinc-300">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">User ID</p>
                    <p className="text-sm text-zinc-500 font-mono">{user?.id}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
