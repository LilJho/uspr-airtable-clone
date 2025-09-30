"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { ProfileService, type Profile } from "@/lib/services/profile-service";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  useEffect(() => {
    async function load() {
      try {
        const p = await ProfileService.getMyProfile();
        setProfile(p);
        setFirstName(p?.first_name ?? "");
        setMiddleName(p?.middle_name ?? "");
        setLastName(p?.last_name ?? "");
        setPhone(p?.phone ?? "");
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile');
      }
    }
    if (user) void load();
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await ProfileService.updateMyProfile({ first_name: firstName, middle_name: middleName, last_name: lastName, phone });
      setMessage('Profile updated');
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await ProfileService.updatePassword(newPassword);
      setMessage('Password updated');
      setNewPassword('');
    } catch (e: any) {
      setError(e?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const profileCompletionPercent = (() => {
    const fields = [firstName, lastName, phone];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  })();

  const avatarInitial = (() => {
    const source = firstName || user?.email || '?';
    return source.charAt(0).toUpperCase();
  })();

  const passwordStrength = (() => {
    const lengthScore = newPassword.length >= 12 ? 2 : newPassword.length >= 8 ? 1 : 0;
    const varietyScore = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].reduce((acc, r) => acc + (r.test(newPassword) ? 1 : 0), 0);
    const score = lengthScore + (varietyScore >= 3 ? 2 : varietyScore >= 2 ? 1 : 0);
    if (!newPassword) return { label: 'Set a strong password', color: 'text-gray-500' };
    if (score >= 3) return { label: 'Strong', color: 'text-green-600' };
    if (score === 2) return { label: 'Medium', color: 'text-amber-600' };
    return { label: 'Weak', color: 'text-red-600' };
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-700">Please log in to view your account.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-gray-600">Manage your personal information and security preferences.</p>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div role="alert" className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          {message}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white text-lg font-semibold">
              {avatarInitial}
            </div>
            <div>
              <div className="text-sm text-gray-500">Signed in as</div>
              <div className="text-base font-medium">{user?.email ?? '—'}</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Profile completion</div>
            <div className="text-xs text-gray-600">{profileCompletionPercent}%</div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full bg-blue-600" style={{ width: `${profileCompletionPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200">
        <button
          className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('profile')}
          aria-selected={activeTab === 'profile'}
          role="tab"
        >
          Profile
        </button>
        <button
          className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium ${activeTab === 'security' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => setActiveTab('security')}
          aria-selected={activeTab === 'security'}
          role="tab"
        >
          Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <div role="tabpanel" className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">Middle name (optional)</label>
              <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">Email</label>
              <input value={user?.email ?? ''} disabled className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className={`inline-flex items-center rounded-md px-4 py-2 text-white ${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div role="tabpanel" className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <label className="mb-1 block text-sm text-gray-600">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className={`mt-1 text-xs ${passwordStrength.color}`}>{passwordStrength.label}</div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={changePassword}
              disabled={saving || !newPassword}
              className={`inline-flex items-center rounded-md px-4 py-2 text-white ${saving || !newPassword ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




