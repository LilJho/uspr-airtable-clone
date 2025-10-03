import { useRouter } from "next/navigation";
import { Rocket, Star, MoreVertical } from "lucide-react";
import { formatRelative, formatInTimezone } from "@/lib/utils/date-helpers";
import { useTimezone } from "@/lib/hooks/useTimezone";
import type { BaseRecord } from "@/lib/types/dashboard";

interface BaseTileProps {
  base: BaseRecord;
  onContextMenu?: (e: React.MouseEvent, base: BaseRecord) => void;
}

export const BaseTile = ({ base, onContextMenu }: BaseTileProps) => {
  const router = useRouter();
  const { timezone } = useTimezone();

  const handleClick = (e: React.MouseEvent) => {
    // Only navigate if the MoreVertical button wasn't clicked
    const target = e.target as HTMLElement;
    const isButtonClick = target.closest('button');
    if (!isButtonClick) {
      router.push(`/bases/${base.id}`);
    }
  };

  const handleContextMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, base);
  };

  const lastOpened = base.last_opened_at ?? base.created_at;

  return (
    <div 
      className="group relative rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm cursor-pointer"
      onClick={handleClick}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Rocket size={18} />
        </div>
        <div className="flex items-center gap-2">
          {base.is_starred && <Star className="w-5 h-5 text-yellow-500 fill-current" />}
          {onContextMenu && (
            <button 
              className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleContextMenuClick}
              title="More options"
            >
              <MoreVertical size={18} />
            </button>
          )}
        </div>
      </div>
      <div className="mb-1 line-clamp-1 font-medium text-gray-900">{base.name}</div>
      {base.description ? (
        <div className="line-clamp-2 text-sm text-gray-600">{base.description}</div>
      ) : (
        <div className="text-sm text-gray-500">No description</div>
      )}
      {lastOpened && (
        <div className="mt-2 text-xs text-gray-500">
          Opened {formatRelative(lastOpened)} · {formatInTimezone(lastOpened, timezone)}
        </div>
      )}
    </div>
  );
};
