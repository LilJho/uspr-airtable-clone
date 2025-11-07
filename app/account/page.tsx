"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { ProfileService, type Profile } from "@/lib/services/profile-service";
import { supabase } from "@/lib/supabaseClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import zxcvbn from "zxcvbn";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { writeStoredTimezone, useTimezone } from "@/lib/hooks/useTimezone";
import { formatInTimezone } from "@/lib/utils/date-helpers";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  type AuthUserDetails = {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
    last_sign_in_at: string | null;
    identities: Array<{ provider: string }>;
  };
  const [authDetails, setAuthDetails] = useState<AuthUserDetails | null>(null);
  const { timezone } = useTimezone();

  const ProfileSchema = useMemo(() => z.object({
    first_name: z.string().min(1, "First name is required"),
    middle_name: z.string().optional(),
    last_name: z.string().min(1, "Last name is required"),
    phone: z.string().optional().refine((val) => {
      if (!val) return true;
      const parsed = parsePhoneNumberFromString(val);
      return Boolean(parsed?.isValid());
    }, { message: "Invalid phone number" }),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    email_product: z.boolean().optional(),
    email_activity: z.boolean().optional(),
  }), []);

  type ProfileFormValues = z.infer<typeof ProfileSchema>;

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    mode: "onChange",
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      phone: "",
      timezone: "America/New_York",
      locale: "",
      email_product: true,
      email_activity: true,
    }
  });

  const PasswordSchema = useMemo(() => z.object({
    newPassword: z.string().min(8, "Password must be at least 8 characters")
  }), []);

  type PasswordFormValues = z.infer<typeof PasswordSchema>;

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(PasswordSchema),
    mode: "onChange",
    defaultValues: { newPassword: "" }
  });

  const EmailSchema = useMemo(() => z.object({
    email: z.string().email("Enter a valid email")
  }), []);

  type EmailFormValues = z.infer<typeof EmailSchema>;

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(EmailSchema),
    mode: "onChange",
    defaultValues: { email: "" }
  });

  useEffect(() => {
    async function load() {
      setLoadingProfile(true);
      try {
        const p = await ProfileService.getMyProfile();
        setProfile(p);
        const prefs = await ProfileService.getMyPreferences();
        profileForm.reset({
          first_name: p?.first_name ?? "",
          middle_name: p?.middle_name ?? "",
          last_name: p?.last_name ?? "",
          phone: p?.phone ?? "",
          timezone: (p && 'timezone' in p ? (p as { timezone?: string }).timezone : undefined) ?? "",
          locale: (p && 'locale' in p ? (p as { locale?: string }).locale : undefined) ?? "",
          email_product: prefs?.email_product ?? true,
          email_activity: prefs?.email_activity ?? true,
        });
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setAuthDetails({
            id: data.user.id,
            email: data.user.email ?? null,
            email_confirmed_at: (data.user as unknown as { email_confirmed_at?: string | null }).email_confirmed_at ?? null,
            last_sign_in_at: (data.user as unknown as { last_sign_in_at?: string | null }).last_sign_in_at ?? null,
            identities: ((data.user as unknown as { identities?: Array<{ provider: string }> }).identities ?? []).map((i) => ({ provider: i.provider }))
          });
          emailForm.reset({ email: data.user.email ?? "" });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    }
    if (user) void load();
  }, [user, profileForm, emailForm]);

  const onSubmitProfile = profileForm.handleSubmit(async (values) => {
    setMessage(null);
    setError(null);
    // Normalize phone to E.164 if provided
    const normalizedPhone = (() => {
      if (!values.phone) return null;
      const parsed = parsePhoneNumberFromString(values.phone);
      return parsed?.isValid() ? parsed.number : values.phone;
    })();
    try {
      await ProfileService.updateMyProfile({
        first_name: values.first_name,
        middle_name: values.middle_name ?? null,
        last_name: values.last_name,
        phone: normalizedPhone ?? null,
        timezone: values.timezone ?? null,
        locale: values.locale ?? null,
      });
      if (values.timezone) {
        writeStoredTimezone(values.timezone);
      }
      await ProfileService.upsertMyPreferences({
        email_product: values.email_product ?? true,
        email_activity: values.email_activity ?? true,
      });
      setMessage('Profile updated');
      profileForm.reset(values);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile');
    }
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    setMessage(null);
    setError(null);
    try {
      await ProfileService.updatePassword(values.newPassword);
      setMessage('Password updated');
      passwordForm.reset({ newPassword: "" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
    }
  });

  const onSubmitEmail = emailForm.handleSubmit(async (values) => {
    setMessage(null);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.updateUser({
        email: values.email,
        options: { emailRedirectTo: redirectTo }
      } as unknown as { email: string });
      if (error) throw error;
      setMessage('Email update requested. Please check your inbox to confirm.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update email');
    }
  });

  const signOutEverywhere = async () => {
    setMessage(null);
    setError(null);
    try {
      const confirmed = window.confirm('Sign out from all devices?');
      if (!confirmed) return;
      // global scope: invalidate across all sessions
      await supabase.auth.signOut({ scope: 'global' } as unknown as { scope?: 'global' });
      setMessage('Signed out from all devices.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to sign out globally');
    }
  };

  const watchedFirstName = profileForm.watch('first_name');
  const watchedLastName = profileForm.watch('last_name');
  const watchedPhone = profileForm.watch('phone');

  const profileCompletionPercent = useMemo(() => {
    const fields = [watchedFirstName, watchedLastName, watchedPhone];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [watchedFirstName, watchedLastName, watchedPhone]);

  const avatarInitial = useMemo(() => {
    const source = watchedFirstName || user?.email || '?';
    return source.charAt(0).toUpperCase();
  }, [watchedFirstName, user?.email]);

  const watchedPassword = passwordForm.watch('newPassword');
  const passwordStrength = useMemo(() => {
    if (!watchedPassword) return { label: 'Set a strong password', color: 'text-gray-500', score: -1 as number, suggestions: [] as string[] };
    const result = zxcvbn(watchedPassword);
    const label = result.score >= 3 ? 'Strong' : result.score === 2 ? 'Medium' : 'Weak';
    const color = result.score >= 3 ? 'text-green-600' : result.score === 2 ? 'text-amber-600' : 'text-red-600';
    return { label, color, score: result.score, suggestions: result.feedback.suggestions };
  }, [watchedPassword]);

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

      <div aria-live="polite" className="sr-only">{message || error || ''}</div>
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
            <label className="relative block">
              <input
                type="file"
                accept="image/*"
                aria-label="Upload avatar"
                className="sr-only"
                onChange={async (e) => {
                  const inputEl = e.currentTarget as HTMLInputElement;
                  const file = inputEl.files?.[0];
                  if (!file) return;
                  try {
                    setMessage(null); setError(null);
                    const url = await ProfileService.uploadAvatar(file);
                    setProfile(p => p ? { ...p, avatar_url: url } as Profile : p);
                    // Notify listeners (e.g., TopBar) to refresh avatar
                    window.dispatchEvent(new CustomEvent('app:profile-avatar-changed', { detail: { url } }));
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Failed to upload avatar');
                  } finally {
                    inputEl.value = '';
                  }
                }}
              />
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-white text-lg font-semibold">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-white p-1 shadow ring-1 ring-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-700">
                  <path d="M4 5a2 2 0 012-2h1l1-1h4l1 1h1a2 2 0 012 2v1H4V5z" />
                  <path fillRule="evenodd" d="M4 8h12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V8zm6 6a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            </div>
            </label>
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

      {authDetails && (
        <div className="mb-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                <div><span className="font-medium text-gray-700">User ID:</span> <span className="break-all">{authDetails.id}</span></div>
                <div><span className="font-medium text-gray-700">Email verified:</span> {authDetails.email_confirmed_at ? 'Yes' : 'No'}</div>
                <div><span className="font-medium text-gray-700">Last sign in:</span> {authDetails.last_sign_in_at ? formatInTimezone(authDetails.last_sign_in_at, timezone, { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }) : '—'}</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={signOutEverywhere} className="inline-flex items-center rounded-md bg-gray-800 px-3 py-2 text-sm text-white hover:bg-black cursor-pointer">Sign out everywhere</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200">
        <button
          className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => { setActiveTab('profile'); setMessage(null); setError(null); }}
          aria-selected={activeTab === 'profile'}
          role="tab"
        >
          Profile
        </button>
        <button
          className={`-mb-px rounded-t-md px-3 py-2 text-sm font-medium ${activeTab === 'security' ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
          onClick={() => { setActiveTab('security'); setMessage(null); setError(null); }}
          aria-selected={activeTab === 'security'}
          role="tab"
        >
          Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <div role="tabpanel" className="rounded-lg border border-gray-200 bg-white p-5">
          {loadingProfile ? (
            <div className="animate-pulse">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="h-10 rounded-md bg-gray-100" />
                <div className="h-10 rounded-md bg-gray-100" />
                <div className="h-10 rounded-md bg-gray-100" />
              </div>
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="h-10 rounded-md bg-gray-100" />
                <div className="h-10 rounded-md bg-gray-100" />
              </div>
              <div className="flex justify-end">
                <div className="h-9 w-32 rounded-md bg-gray-100" />
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmitProfile} noValidate>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
                  <label htmlFor="first_name" className="mb-1 block text-sm text-gray-600">First name</label>
                  <input id="first_name" {...profileForm.register('first_name')} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  {profileForm.formState.errors.first_name && (
                    <div className="mt-1 text-xs text-red-600">{profileForm.formState.errors.first_name.message}</div>
                  )}
            </div>
            <div>
                  <label htmlFor="middle_name" className="mb-1 block text-sm text-gray-600">Middle name (optional)</label>
                  <input id="middle_name" {...profileForm.register('middle_name')} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
                  <label htmlFor="last_name" className="mb-1 block text-sm text-gray-600">Last name</label>
                  <input id="last_name" {...profileForm.register('last_name')} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  {profileForm.formState.errors.last_name && (
                    <div className="mt-1 text-xs text-red-600">{profileForm.formState.errors.last_name.message}</div>
                  )}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
                  <label htmlFor="phone" className="mb-1 block text-sm text-gray-600">Phone</label>
                  <input id="phone" {...profileForm.register('phone')} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  {profileForm.formState.errors.phone && (
                    <div className="mt-1 text-xs text-red-600">{profileForm.formState.errors.phone.message}</div>
                  )}
            </div>
            <div>
                  <label htmlFor="email" className="mb-1 block text-sm text-gray-600">Email</label>
                  <input id="email" value={user?.email ?? ''} disabled className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600" />
            </div>
          </div>

              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="timezone" className="mb-1 block text-sm text-gray-600">Timezone</label>
                  <select id="timezone" {...profileForm.register('timezone')} className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
                    <option value="America/New_York">EST (America/New_York)</option>
                    <option value="Asia/Manila">Philippines GMT+8 (Asia/Manila)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="locale" className="mb-1 block text-sm text-gray-600">Locale</label>
                  <input id="locale" {...profileForm.register('locale')} placeholder="e.g., en-US" className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Email preferences</label>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" {...profileForm.register('email_product')} /> Product updates</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" {...profileForm.register('email_activity')} /> Workspace activity</label>
                  </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={!profileForm.formState.isDirty || !profileForm.formState.isValid || profileForm.formState.isSubmitting}
                  className={`inline-flex items-center rounded-md px-4 py-2 text-white ${(!profileForm.formState.isDirty || !profileForm.formState.isValid || profileForm.formState.isSubmitting) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
                >
                  {profileForm.formState.isSubmitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div role="tabpanel" className="rounded-lg border border-gray-200 bg-white p-5">
          <form onSubmit={onSubmitPassword} noValidate>
          <div className="mb-4">
              <label htmlFor="newPassword" className="mb-1 block text-sm text-gray-600">New password</label>
            <input
                id="newPassword"
              type="password"
                {...passwordForm.register('newPassword')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
              {passwordForm.formState.errors.newPassword && (
                <div className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</div>
              )}
            <div className={`mt-1 text-xs ${passwordStrength.color}`}>{passwordStrength.label}</div>
              {passwordStrength.suggestions.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-xs text-gray-600">
                  {passwordStrength.suggestions.map((s: string, i: number) => (<li key={i}>{s}</li>))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={!passwordForm.formState.isValid || passwordForm.formState.isSubmitting || (passwordStrength.score >= 0 && passwordStrength.score < 3)}
                className={`inline-flex items-center rounded-md px-4 py-2 text-white ${(!passwordForm.formState.isValid || passwordForm.formState.isSubmitting || (passwordStrength.score >= 0 && passwordStrength.score < 3)) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
              >
                {passwordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>

          <div className="my-6 h-px w-full bg-gray-200" />

          <form onSubmit={onSubmitEmail} noValidate>
            <div className="mb-4">
              <label htmlFor="newEmail" className="mb-1 block text-sm text-gray-600">Change email</label>
              <input
                id="newEmail"
                type="email"
                {...emailForm.register('email')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              {emailForm.formState.errors.email && (
                <div className="mt-1 text-xs text-red-600">{emailForm.formState.errors.email.message}</div>
              )}
              <div className="mt-1 text-xs text-gray-600">You will need to confirm this change via email.</div>
          </div>
          <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={!emailForm.formState.isValid || emailForm.formState.isSubmitting}
                className={`inline-flex items-center rounded-md px-4 py-2 text-white ${(!emailForm.formState.isValid || emailForm.formState.isSubmitting) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
              >
                {emailForm.formState.isSubmitting ? 'Requesting…' : 'Request email change'}
              </button>
            </div>
          </form>

          {authDetails && (
            <>
              <div className="my-6 h-px w-full bg-gray-200" />
              <div>
                <div className="mb-2 text-sm font-medium text-gray-700">Connected identities</div>
                <div className="mb-3 text-xs text-gray-600">Linked providers: {authDetails.identities.length > 0 ? authDetails.identities.map(i => i.provider).join(', ') : 'None'}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const redirectTo = `${window.location.origin}/auth/callback`;
                        type LinkIdentityFn = (params: { provider: string; options: { redirectTo: string } }) => Promise<unknown>;
                        const authWithLink = supabase.auth as unknown as { linkIdentity?: LinkIdentityFn };
                        if (authWithLink.linkIdentity) {
                          await authWithLink.linkIdentity({ provider: 'google', options: { redirectTo } });
                        } else {
                          await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  >
                    Connect Google
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const redirectTo = `${window.location.origin}/auth/callback`;
                        type LinkIdentityFn = (params: { provider: string; options: { redirectTo: string } }) => Promise<unknown>;
                        const authWithLink = supabase.auth as unknown as { linkIdentity?: LinkIdentityFn };
                        if (authWithLink.linkIdentity) {
                          await authWithLink.linkIdentity({ provider: 'github', options: { redirectTo } });
                        } else {
                          await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo } });
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                  >
                    Connect GitHub
            </button>
          </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}




