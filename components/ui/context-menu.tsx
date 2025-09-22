"use client";
import { useEffect, useRef, useState } from "react";

export interface ContextMenuOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  options: ContextMenuOption[];
  position: { x: number; y: number };
  onClose: () => void;
  isVisible: boolean;
}

export function ContextMenu({ options, position, onClose, isVisible }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[200px] z-50"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {options.map((option, index) => (
        <div key={option.id}>
          {option.separator && index > 0 && (
            <div className="border-t border-gray-100 my-1" />
          )}
          <button
            onClick={() => {
              if (!option.disabled) {
                option.onClick();
                onClose();
              }
            }}
            disabled={option.disabled}
            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors ${
              option.disabled 
                ? "text-gray-400 cursor-not-allowed" 
                : "text-gray-700 hover:text-gray-900"
            }`}
          >
            {option.icon && (
              <span className="w-4 h-4 flex-shrink-0">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    type?: 'base' | 'field' | 'table' | 'record';
    data?: any;
    tableId?: string;
  }>({
    isVisible: false,
    position: { x: 0, y: 0 },
  });

  const showContextMenu = (event: React.MouseEvent, type?: 'base' | 'field' | 'table' | 'record', data?: any) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY },
      type,
      data,
    });
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  };

  return {
    contextMenu,
    setContextMenu,
    showContextMenu,
    hideContextMenu,
  };
}

