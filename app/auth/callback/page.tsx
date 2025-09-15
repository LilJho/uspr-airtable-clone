"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
          <p className="text-gray-600">Please wait while we redirect you.</p>
        </div>
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Auth callback error:", error);
        router.push("/login?error=auth_failed");
        return;
      }

      if (data.session) {
        const origin = searchParams.get("origin");
        // Determine if this looks like an existing account coming from signup
        let provider: string | undefined;
        try {
          const { data: userData } = await supabase.auth.getUser();
          provider = userData.user?.app_metadata?.provider as string | undefined;
          const createdAtIso = userData.user?.created_at ?? null;
          const createdAt = createdAtIso ? new Date(createdAtIso).getTime() : null;
          const now = Date.now();
          const isLikelyExistingUser = createdAt !== null && now - createdAt > 2 * 60 * 1000; // older than 2 minutes

          if (origin === "signup" && isLikelyExistingUser) {
            // If user tried to sign up with an account that already exists, sign out and redirect to login with a message
            await supabase.auth.signOut();
            try {
              localStorage.removeItem("sb-access-token");
              localStorage.removeItem("sb-expires-at");
            } catch {}
            const providerParam = provider ? `&provider=${encodeURIComponent(provider)}` : "";
            router.push(`/login?error=oauth_account_exists${providerParam}`);
            return;
          }
        } catch {}

        // Persist a snapshot to localStorage for fast checks
        try {
          localStorage.setItem("sb-access-token", data.session.access_token);
          localStorage.setItem("sb-expires-at", String(data.session.expires_at ?? 0));
        } catch {}
        // Successfully authenticated, redirect to dashboard
        router.push("/dashboard");
      } else {
        // No session found, redirect to login
        router.push("/login");
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}
