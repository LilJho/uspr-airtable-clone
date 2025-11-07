import Link from "next/link";
import { Rocket, Trash2 } from "lucide-react";
import { formatRelative, formatInTimezone } from "@/lib/utils/date-helpers";
import { useTimezone } from "@/lib/hooks/useTimezone";
import type { BaseRecord } from "@/lib/types/dashboard";

interface BaseRowProps {
  base: BaseRecord;
  onDeleteClick?: (base: BaseRecord) => void;
}

export const BaseRow = ({ base, onDeleteClick }: BaseRowProps) => {
  const { timezone } = useTimezone();
  const lastOpened = base.last_opened_at ?? base.created_at;

  return (
    <div className="grid grid-cols-2 items-center gap-4 border-t border-gray-100 px-4 py-3 first:border-t-0">
      <Link href={`/bases/${base.id}`} className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
          <Rocket size={16} />
        </div>
        <div className="truncate text-sm font-medium text-gray-900">{base.name}</div>
      </Link>
      <div className="flex items-center justify-end gap-3 text-xs text-gray-500">
        <div>
          Opened {formatRelative(lastOpened)} · {formatInTimezone(lastOpened, timezone, { hour: 'numeric', minute: '2-digit' })}
        </div>
        {onDeleteClick && (
          <button
            className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Delete base"
            onClick={() => onDeleteClick(base)}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
