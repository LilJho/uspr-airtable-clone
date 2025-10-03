"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface RenameModalProps {
  isOpen: boolean;
  currentName: string;
  currentDescription?: string | null;
  onClose: () => void;
  // New API to save both name and description
  onSave?: (payload: { name: string; description: string }) => Promise<void>;
  // Backward compatibility: if provided, will be used when only name is edited
  onRename?: (newName: string) => Promise<void>;
  title?: string;
}

export function RenameModal({ 
  isOpen, 
  currentName,
  currentDescription = "",
  onClose, 
  onSave,
  onRename, 
  title = "Edit Base" 
}: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setDescription(currentDescription || "");
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentName, currentDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const nameChanged = trimmedName !== currentName.trim();
    const descriptionChanged = (currentDescription || "").trim() !== trimmedDescription;

    if (!trimmedName) return;
    if (!nameChanged && !descriptionChanged) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      if (onSave) {
        await onSave({ name: trimmedName, description: trimmedDescription });
      } else if (onRename && nameChanged) {
        await onRename(trimmedName);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter base name"
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[96px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a short description (optional)"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

