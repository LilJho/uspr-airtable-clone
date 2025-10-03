"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { AuditLogService, type AuditLogRow } from "@/lib/services/audit-log-service";
import { useTimezone } from "@/lib/hooks/useTimezone";
import { formatInTimezone } from "@/lib/utils/date-helpers";

function formatAction(log: AuditLogRow): string {
  const actor = log.actor?.full_name || "Someone";
  const entity = log.entity_type;
  const action = log.action;
  if (entity === 'base' && action === 'create') {
    return `${actor} created a new base`;
  }
  return `${actor} ${action} ${entity}`;
}

export default function WorkspaceActivityPage() {
  const params = useParams<{ id: string }>();
  const workspaceId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);
  const { timezone } = useTimezone();

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await AuditLogService.getWorkspaceLogs(workspaceId, 50);
      setLogs(data);
      setNextCursor(data.length ? data[data.length - 1].created_at : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const loadMore = useCallback(async () => {
    if (!workspaceId || !nextCursor) return;
    try {
      setLoading(true);
      const data = await AuditLogService.getWorkspaceLogs(workspaceId, 50, nextCursor);
      setLogs(prev => [...prev, ...data]);
      setNextCursor(data.length ? data[data.length - 1].created_at : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more activity');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, nextCursor]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Workspace Activity</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && logs.length === 0 && <div>Loading...</div>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {logs.map(log => (
          <li key={log.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
            <div style={{ fontSize: 14 }}>{formatAction(log)}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{formatInTimezone(log.created_at, timezone, { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <button onClick={loadMore} disabled={loading || !nextCursor}>Load more</button>
      </div>
    </div>
  );
}




