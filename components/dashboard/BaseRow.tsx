import Link from "next/link";
import { Rocket } from "lucide-react";
import { formatRelative } from "@/lib/utils/date-helpers";
import type { BaseRecord } from "@/lib/types/dashboard";

interface BaseRowProps {
  base: BaseRecord;
}

export const BaseRow = ({ base }: BaseRowProps) => {
  const lastOpened = base.last_opened_at ?? base.created_at;

  return (
    <Link 
      href={`/bases/${base.id}`} 
      className="grid grid-cols-2 items-center gap-4 border-t border-gray-100 px-4 py-3 first:border-t-0 hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
          <Rocket size={16} />
        </div>
        <div className="truncate text-sm font-medium text-gray-900">{base.name}</div>
      </div>
      <div className="text-right text-xs text-gray-500">
        Opened {formatRelative(lastOpened)} · {lastOpened ? new Date(lastOpened).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
      </div>
    </Link>
  );
};
