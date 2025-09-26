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
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Account Settings</h1>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      {message && <div className="mb-3 text-green-700">{message}</div>}

      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium mb-3">Profile</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Middle name (optional)</label>
              <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-medium mb-3">Change Password</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div className="flex gap-2">
            <button onClick={changePassword} disabled={saving || !newPassword} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  );
}




