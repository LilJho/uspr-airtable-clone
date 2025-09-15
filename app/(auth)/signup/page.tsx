"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  // Handles signup with Supabase
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setEmailAlreadyExists(false);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const message = error.message ?? "Signup failed";
      const alreadyExists = /already\s*registered|already\s*exists/i.test(message);
      if (alreadyExists) {
        setEmailAlreadyExists(true);
        setError("An account with this email already exists. Please log in instead.");
        toast.error("Email already registered. Please log in instead.");
      } else {
        setError(message);
        toast.error(message);
      }
    } else {
      setSuccess(true);
      toast.success("Signup successful! Check your email to confirm.");
    }
    setLoading(false);
  };

  // Handles social signup/login with Supabase OAuth
  const handleOAuth = async (provider: 'google' | 'azure' | 'apple') => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?origin=signup`
      }
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      <form onSubmit={handleSignup} className="bg-white p-8 rounded shadow-md w-full max-w-100 md:w-100">
        <h1 className="text-2xl font-bold mb-6">Sign Up</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        {error && (
          <div className="text-red-500 mb-2">
            <div>{error}</div>
            {emailAlreadyExists && (
              <div className="mt-2 text-sm">
                <a href="/login" className="text-blue-600 hover:underline">Go to login</a>
              </div>
            )}
          </div>
        )}
        {success && <div className="text-green-600 mb-2">Signup successful! Check your email to confirm.</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>
        <div className="my-4 text-center text-gray-500">or</div>
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="w-full flex items-center justify-center gap-2 bg-white text-black border border-gray-300 p-2 rounded hover:bg-gray-100 mb-2"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path d="M44.5 20H24V28.5H36.9C35.5 33.1 31.2 36.5 26 36.5C19.1 36.5 13.5 30.9 13.5 24C13.5 17.1 19.1 11.5 26 11.5C29.1 11.5 31.9 12.7 34 14.7L39.1 9.6C35.7 6.5 31.1 4.5 26 4.5C14.7 4.5 5.5 13.7 5.5 25C5.5 36.3 14.7 45.5 26 45.5C37.3 45.5 46.5 36.3 46.5 25C46.5 23.7 46.4 22.4 46.2 21.1L44.5 20Z" fill="#FFC107"/><path d="M6.3 14.7L12.5 19.1C14.3 15.2 19.1 11.5 26 11.5C29.1 11.5 31.9 12.7 34 14.7L39.1 9.6C35.7 6.5 31.1 4.5 26 4.5C17.6 4.5 10.1 10.7 6.3 14.7Z" fill="#FF3D00"/><path d="M26 45.5C31.1 45.5 35.7 43.5 39.1 40.4L34.2 35.7C32.2 37.2 29.4 38.1 26 38.1C20.9 38.1 16.2 34.7 14.6 30.1L6.2 35.7C10 41.3 17.6 45.5 26 45.5Z" fill="#4CAF50"/><path d="M46.5 25C46.5 23.7 46.4 22.4 46.2 21.1H24V28.5H36.9C36.2 31.1 34.6 33.2 32.2 34.7L39.1 40.4C42.5 37.3 46.5 32.2 46.5 25Z" fill="#1976D2"/></g></svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('azure')}
          className="w-full flex items-center justify-center gap-2 bg-white text-black border border-gray-300 p-2 rounded hover:bg-gray-100 mb-2"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g><rect x="2" y="2" width="9" height="9" fill="#F35325"/><rect x="13" y="2" width="9" height="9" fill="#81BC06"/><rect x="2" y="13" width="9" height="9" fill="#05A6F0"/><rect x="13" y="13" width="9" height="9" fill="#FFBA08"/></g></svg>
          Continue with Microsoft
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('apple')}
          className="w-full flex items-center justify-center gap-2 bg-white text-black border border-gray-300 p-2 rounded hover:bg-gray-100"
          disabled={loading}
        >
          <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M447.1 332.7C446.9 296 463.5 268.3 497.1 247.9C478.3 221 449.9 206.2 412.4 203.3C376.9 200.5 338.1 224 323.9 224C308.9 224 274.5 204.3 247.5 204.3C191.7 205.2 132.4 248.8 132.4 337.5C132.4 363.7 137.2 390.8 146.8 418.7C159.6 455.4 205.8 545.4 254 543.9C279.2 543.3 297 526 329.8 526C361.6 526 378.1 543.9 406.2 543.9C454.8 543.2 496.6 461.4 508.8 424.6C443.6 393.9 447.1 334.6 447.1 332.7zM390.5 168.5C417.8 136.1 415.3 106.6 414.5 96C390.4 97.4 362.5 112.4 346.6 130.9C329.1 150.7 318.8 175.2 321 202.8C347.1 204.8 370.9 191.4 390.5 168.5z"/></svg>
          Continue with Apple
        </button>
        <div className="mt-4 text-sm text-center">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
        </div>
      </form>
    </div>
  );
}