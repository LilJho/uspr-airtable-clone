"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { MembershipService } from "@/lib/services/membership-service";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params?.token[0] : params?.token;
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Accepting invite...");

  useEffect(() => {
    async function accept() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus("error");
          setMessage("You must be signed in to accept an invite.");
          return;
        }
        await MembershipService.acceptInvite(String(token), user.id, user.email);
        setStatus("success");
        setMessage("Invite accepted. Redirecting to Dashboard...");
        setTimeout(() => router.push("/dashboard"), 1200);
      } catch (e: unknown) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Failed to accept invite.");
      }
    }
    if (token) void accept();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md text-center">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">Accept Invite</h1>
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>{message}</p>
      </div>
    </div>
  );
}





