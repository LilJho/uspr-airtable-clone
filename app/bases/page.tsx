"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Star } from "lucide-react";
import { ContextMenu, useContextMenu, type ContextMenuOption } from "@/components/ui/context-menu";
import { RenameModal } from "@/components/ui/rename-modal";

type SupabaseUser = {
  id: string;
  email?: string;
};

type BaseSummary = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_starred?: boolean;
};

export default function BasesPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [bases, setBases] = useState<BaseSummary[]>([]);
  const [loadingBases, setLoadingBases] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedBase, setSelectedBase] = useState<BaseSummary | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const router = useRouter();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();

  const checkUser = useCallback(async (): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser({ id: user.id, email: user.email ?? undefined });
    setLoadingUser(false);
  }, [router]);

  const loadAllBases = useCallback(async (): Promise<void> => {
    setLoadingBases(true);
    setErrorMessage(null);
    const { data, error } = await supabase
      .from("bases")
      .select("id, name, description, created_at, is_starred")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setBases([]);
    } else {
      setBases((data ?? []) as BaseSummary[]);
    }
    setLoadingBases(false);
  }, []);

  const handleRenameBase = async (newName: string): Promise<void> => {
    if (!selectedBase) return;
    
    const { error } = await supabase
      .from("bases")
      .update({ name: newName })
      .eq("id", selectedBase.id);

    if (error) {
      throw new Error(error.message);
    }

    // Update the local state
    setBases(prev => prev.map(base => 
      base.id === selectedBase.id 
        ? { ...base, name: newName }
        : base
    ));
  };

  const handleDuplicateBase = async (base: BaseSummary): Promise<void> => {
    // For now, just show a message - full implementation would require duplicating all tables and data
    alert(`Duplicate functionality for "${base.name}" would be implemented here`);
  };

  const handleToggleStar = async (base: BaseSummary): Promise<void> => {
    const newStarredState = !base.is_starred;
    
    const { error } = await supabase
      .from("bases")
      .update({ is_starred: newStarredState })
      .eq("id", base.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // Update the local state
    setBases(prev => prev.map(b => 
      b.id === base.id 
        ? { ...b, is_starred: newStarredState }
        : b
    ));
  };

  const handleDeleteBase = async (base: BaseSummary): Promise<void> => {
    if (!confirm(`Are you sure you want to delete "${base.name}"? This action cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from("bases")
      .delete()
      .eq("id", base.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // Update the local state
    setBases(prev => prev.filter(b => b.id !== base.id));
  };

  const getContextMenuOptions = (base: BaseSummary): ContextMenuOption[] => [
    {
      id: "open",
      label: "Open",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
      onClick: () => router.push(`/bases/${base.id}`),
    },
    {
      id: "rename",
      label: "Rename",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => {
        setSelectedBase(base);
        setIsRenameModalOpen(true);
      },
    },
    {
      id: "star",
      label: base.is_starred ? "Remove from starred" : "Add to starred",
      icon: (
        <Star className={`w-4 h-4 ${base.is_starred ? 'fill-current text-yellow-500' : ''}`} />
      ),
      onClick: () => handleToggleStar(base),
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => handleDuplicateBase(base),
      disabled: true,
    },
    {
      id: "move",
      label: "Move",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
        </svg>
      ),
      onClick: () => alert("Move functionality would be implemented here"),
      disabled: true,
    },
    {
      id: "customize",
      label: "Customize appearance",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
        </svg>
      ),
      onClick: () => alert("Customize appearance functionality would be implemented here"),
      disabled: true,
    },
    {
      id: "pin",
      label: "Pin in workspace",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      onClick: () => alert("Pin functionality would be implemented here"),
      disabled: true,
      separator: true,
    },
    {
      id: "delete",
      label: "Delete",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => handleDeleteBase(base),
    },
  ];

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (user) {
      loadAllBases();
    }
  }, [user, loadAllBases]);

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">US</span>
            </div>
            <span className="text-xl font-bold text-gray-900">All Databases</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your databases</h1>
            <p className="text-gray-600 text-sm">All bases you have created, most recent first.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {loadingBases ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-6 bg-white rounded-lg border border-gray-200 animate-pulse">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-2/3 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : bases.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-700 font-medium mb-1">No databases yet</p>
            <p className="text-gray-500 text-sm mb-4">Create your first database from the Dashboard.</p>
            <Link href="/dashboard" className="inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Go to Dashboard</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bases.map((base) => (
              <div 
                key={base.id} 
                className="relative group p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-colors cursor-pointer"
                onClick={(e) => {
                  // Only navigate if the three-dot button wasn't clicked
                  const target = e.target as HTMLElement;
                  const isButtonClick = target.closest('button');
                  if (!isButtonClick) {
                    router.push(`/bases/${base.id}`);
                  }
                }}
              >
                {/* More options button */}
                <button
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-gray-400 hover:text-gray-600"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedBase(base);
                    showContextMenu(e);
                  }}
                  title="More options"
                >
                  <MoreVertical size={18} />
                </button>
                
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {base.is_starred && (
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{base.name}</h3>
                {base.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{base.description}</p>
                )}
                <p className="text-xs text-gray-500">Created {new Date(base.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {selectedBase && (
          <ContextMenu
            options={getContextMenuOptions(selectedBase)}
            position={contextMenu.position}
            onClose={hideContextMenu}
            isVisible={contextMenu.isVisible}
          />
        )}

        {/* Rename Modal */}
        <RenameModal
          isOpen={isRenameModalOpen}
          currentName={selectedBase?.name || ""}
          onClose={() => {
            setIsRenameModalOpen(false);
            setSelectedBase(null);
          }}
          onRename={handleRenameBase}
          title="Rename Base"
        />
      </main>
    </div>
  );
}


