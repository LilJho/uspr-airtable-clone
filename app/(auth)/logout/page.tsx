"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Sign out the user on mount
    const signOut = async () => {
      await supabase.auth.signOut();
      // Redirect to login after logout
      router.replace("/login");
    };
    signOut();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">Logging out...</h1>
      </div>
    </div>
  );
}