import { Search } from "lucide-react";
import Link from "next/link";
import type { SupabaseUser } from "@/lib/types/dashboard";

interface TopBarProps {
  user: SupabaseUser | null;
  onSignOut: () => void;
}

export const TopBar = ({ user, onSignOut }: TopBarProps) => {
  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-3">
      <div className="flex w-full max-w-xl items-center gap-2 rounded-md border bg-gray-50 px-3 py-2 text-gray-600">
        <Search size={16} />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          placeholder="Search..."
        />
      </div>
      <div className="hidden items-center gap-4 md:flex">
        <button className="rounded-full bg-gray-200 px-3 py-1 text-sm text-gray-700">Help</button>
        <Link href="/account" className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700" title="Profile">
          {user?.email?.charAt(0).toUpperCase()}
        </Link>
        <button onClick={onSignOut} className="text-sm text-gray-600 hover:text-gray-900">Sign out</button>
      </div>
    </div>
  );
};
