import React, { useEffect, useRef, useState } from 'react';
import {
  RefreshCw, Trash2, AlertTriangle, CheckCircle2, Clock,
  Loader2, Inbox, ShieldAlert, ShieldCheck, ShieldQuestion, History, Zap,
  Share2, Eraser, BellRing,
} from 'lucide-react';
import {
  inspect, retryOne, remove, flush, fetchHistory,
  OutboxEntry, onSyncStateChange, syncLog, clearSyncLog,
  SyncedAction, SyncLogEntry, describeMutation,
} from '../services/offlineSync';

interface HistoryItem {
  client_mutation_id: string;
  entity_type: string;
  status: string;
  error_message: string | null;
  created_at: string | null;
  processed_at: string | null;
  payload: any;
}

const ENTITY_TO_TYPE: Record<string, SyncedAction['type']> = {
  SALE: 'SALE', ORDER_STATUS: 'ORDER_STATUS', ORDER_CREATE: 'ORDER_CREATE',
  INVENTORY: 'INVENTORY', UDHAAR: 'UDHAAR',
};

/** Rebuild timeline events from the SERVER's audit trail — covers completions
 *  that happened before the current device log existed (reinstall, new phone).
 *  Grouped per minute so one flush stays one event. */
function serverTimeline(history: HistoryItem[]): SyncLogEntry[] {
  const ok = history.filter((h) => h.status === 'PROCESSED' && h.payload);
  const byMinute = new Map<string, SyncedAction[]>();
  for (const h of ok) {
    const type = ENTITY_TO_TYPE[h.entity_type];
    if (!type) continue;
    const at = h.processed_at || h.created_at;
    if (!at) continue;
    const bucket = at.slice(0, 16); // ISO minute — one flush ≈ one event
    if (!byMinute.has(bucket)) byMinute.set(bucket, []);
    byMinute.get(bucket)!.push({
      client_mutation_id: h.client_mutation_id,
      type,
      kind: h.entity_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      label: describeMutation(type, h.payload),
      orderNumber: type === 'ORDER_CREATE' ? (h.payload.order_number || null) : null,
      total: type === 'ORDER_CREATE' ? (h.payload.total_amount ?? null) : null,
    });
  }
  return [...byMinute.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([bucket, actions]) => ({
      at: new Date(bucket + ':00').toISOString(),
      via: 'server' as const,
      actions,
    }));
}

/** Device log first (authoritative 'via' badges), server events fill the past —
 *  deduped by mutation id so a synced action never appears twice, then the
 *  whole timeline is sorted newest-first regardless of where entries came from. */
function mergeTimelines(device: SyncLogEntry[], server: SyncLogEntry[]): SyncLogEntry[] {
  const seen = new Set<string>();
  for (const e of device) for (const a of e.actions) seen.add(a.client_mutation_id);
  const past = server
    .filter((e) => !e.actions.some((a) => seen.has(a.client_mutation_id)))
    .map((e) => ({ ...e, actions: e.actions.filter((a) => !seen.has(a.client_mutation_id)) }))
    .filter((e) => e.actions.length > 0);
  return [...device, ...past].sort((a, b) => b.at.localeCompare(a.at));
}

const fmtTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtWhen = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? fmtTime(iso) : `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${fmtTime(iso)}`;
};

/** Human line for one confirmed action in the timeline. */
const actionLine = (a: SyncedAction) => {
  if (a.type === 'ORDER_CREATE') {
    return a.orderNumber
      ? `Voice Order — ${a.orderNumber}${a.total != null ? ` · ₹${a.total}` : ''}`
      : `Voice Order — ${a.label}`;
  }
  return `${a.kind} — ${a.label}`;
};

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  PROCESSED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Synced' },
  FAILED: { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Failed' },
  CONFLICT: { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Conflict' },
  PENDING: { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Pending' },
};

interface SyncAuditScreenProps {
  /** Mutation ids to highlight (from a SYNC_COMPLETE push deep link). */
  highlightIds?: string[];
  /** Called after the highlight has been shown (lets the parent reset it). */
  onHighlightDone?: () => void;
}

export const SyncAuditScreen: React.FC<SyncAuditScreenProps> = ({ highlightIds, onHighlightDone }) => {
  const [entries, setEntries] = useState<OutboxEntry[]>(inspect());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [failedCount, setFailedCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [mergedLog, setLog] = useState<SyncLogEntry[]>(syncLog());
  const [serverEvents, setServerEvents] = useState<SyncLogEntry[]>([]);
  const serverEventsRef = useRef<SyncLogEntry[]>([]);
  // Confirmed-ids highlight: set when the vendor taps the "✓ Offline work
  // synced" push — those exact mutations get a "just synced" treatment.
  const highlightSet = new Set(highlightIds || []);
  const hasHighlight = highlightSet.size > 0;
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await fetchHistory(50);
    if (data) {
      setHistory(data.items);
      setFailedCount(data.failed_count);
      const events = serverTimeline(data.items);
      serverEventsRef.current = events;
      setServerEvents(events);
    }
    setLog(mergeTimelines(syncLog(), serverEventsRef.current));
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
    return onSyncStateChange(() => {
      setEntries(inspect());
      setLog(mergeTimelines(syncLog(), serverEventsRef.current));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep-linked highlight: server events load async, so retry until the
  // highlighted event actually renders, scroll it into view, then keep the
  // visual ring for a few seconds before clearing the state.
  const [flashOn, setFlashOn] = useState(false);
  useEffect(() => {
    if (!hasHighlight) return;
    let tries = 0;
    let timer: number;
    const attempt = () => {
      const el = timelineRef.current?.querySelector('[data-highlighted="true"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFlashOn(true); // ring + chip stay visible a while
        timer = window.setTimeout(() => {
          setFlashOn(false);
          onHighlightDone?.();
        }, 6000);
        return;
      }
      if (++tries < 60) {
        timer = window.setTimeout(attempt, 500);
      } else {
        onHighlightDone?.(); // give up quietly — timeline just won't highlight
      }
    };
    timer = window.setTimeout(attempt, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHighlight]);

  const doFlush = async () => {
    setFlushing(true);
    setNote(null);
    const r = await flush();
    setNote(r.remaining === 0 && r.sent > 0 ? `Synced ${r.sent} action(s)` : r.remaining > 0 ? `${r.remaining} still queued — see errors below` : null);
    setEntries(inspect());
    await loadHistory();
    setFlushing(false);
  };

  const doRetry = async (id: string) => {
    setBusyId(id);
    setNote(null);
    const r = await retryOne(id);
    if (r.ok) setNote('Synced ✓');
    else setNote(r.error || 'Retry failed');
    setEntries(inspect());
    await loadHistory();
    setBusyId(null);
  };

  const doDiscard = (id: string) => {
    remove(id);
    setEntries(inspect());
    setNote('Discarded');
  };

  /** Share/export the timeline as plain text (WhatsApp, SMS, print…). */
  const doExport = async () => {
    const lines: string[] = [
      'VendorSaathi — Sync record',
      `Exported: ${new Date().toLocaleString()}`,
      `${mergedLog.reduce((n, e) => n + e.actions.length, 0)} action(s) confirmed by the server`,
      '',
    ];
    for (const e of mergedLog) {
      const when = new Date(e.at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const via = e.via === 'sw' ? ' (synced while app was closed)' : '';
      lines.push(`✓ Synced ${when}${via}`);
      for (const a of e.actions) {
        const no = a.type === 'ORDER_CREATE' && a.orderNumber ? ` [${a.orderNumber}]` : '';
        const tot = a.total != null ? ` ₹${a.total}` : '';
        lines.push(`   • ${a.kind}${no}${tot} — ${a.label}`);
      }
    }
    const text = lines.join('\n');
    const nav = navigator as any;
    try {
      if (nav.share) {
        await nav.share({ title: 'VendorSaathi sync record', text });
        return;
      }
    } catch { /* user cancelled share → fall through to copy */ }
    try {
      await navigator.clipboard.writeText(text);
      setNote('Sync record copied — paste it anywhere');
    } catch {
      setNote('Could not share or copy on this device');
    }
  };

  const doClear = () => {
    if (!window.confirm('Clear the synced timeline on this device? The server keeps its own permanent record.')) return;
    clearSyncLog();
    setLog(mergeTimelines(syncLog(), serverEventsRef.current));
    setNote('Timeline cleared — server history below is unchanged');
  };

  const riskStyle = (risk: OutboxEntry['risk']) =>
    risk === 'high' ? 'text-rose-600 bg-rose-50 border-rose-200'
      : risk === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-slate-500 bg-slate-50 border-slate-200';

  return (
    <div className="space-y-3">
      {/* ---- Local outbox: queued on this device ---- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-orange-500" /> Queued on this device
            {entries.length > 0 && (
              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                {entries.length}
              </span>
            )}
          </h4>
          <button
            onClick={doFlush}
            disabled={flushing || entries.length === 0}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-[11px] font-black flex items-center gap-1.5 transition"
          >
            {flushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync All
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="text-[11px] text-slate-500 py-2">
            ✓ Nothing waiting — sales, order updates and stock changes made offline will appear here until they sync.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.client_mutation_id} className="rounded-2xl border border-slate-200 p-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black text-orange-600 uppercase">{e.entity_type.replace('_', ' ')}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${riskStyle(e.risk)}`}>
                      {e.risk === 'high' ? `${e.attempts} failed attempts` : e.attempts > 0 ? `${e.attempts} attempt(s)` : 'waiting'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate">{e.summary}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> queued {fmtTime(e.queued_at || e.client_timestamp)}
                    {e.last_error && <span className="text-rose-500 font-semibold"> · {e.last_error}</span>}
                  </p>
                </div>
                <button
                  onClick={() => doRetry(e.client_mutation_id!)}
                  disabled={busyId === e.client_mutation_id}
                  className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition"
                  aria-label="Retry now"
                >
                  {busyId === e.client_mutation_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => doDiscard(e.client_mutation_id!)}
                  className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0 transition"
                  aria-label="Discard this action"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {note && <p className="text-[11px] font-bold text-orange-600">{note}</p>}
      </div>

      {/* ---- ✓ Synced timeline: what reached the server, and when ---- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 text-emerald-500 flex-shrink-0" /> Synced timeline
            <span className="text-[10px] font-bold text-slate-400">({mergedLog.reduce((n, e) => n + e.actions.length, 0)} confirmed)</span>
          </h4>
          {mergedLog.length > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={doExport}
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 border border-emerald-200 transition"
                aria-label="Share sync record"
                title="Share or copy this record"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={doClear}
                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 border border-rose-200 transition"
                aria-label="Clear synced timeline"
                title="Clear this device's timeline (server history stays)"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {mergedLog.length === 0 ? (
          <p className="text-[11px] text-slate-500 py-2">
            No sync completions recorded on this device yet — queued actions will land here the moment the server accepts them.
          </p>
        ) : (
          <div ref={timelineRef} className="relative max-h-80 overflow-y-auto pl-1">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" aria-hidden />
            <div className="space-y-3">
              {mergedLog.map((e, ei) => {
                const isHit = hasHighlight && e.actions.some((a) => highlightSet.has(a.client_mutation_id));
                return (
                  <div
                    key={`${e.at}-${ei}`}
                    data-highlighted={isHit || undefined}
                    className={`relative rounded-xl transition ${
                      isHit && flashOn ? 'bg-emerald-50/80 ring-2 ring-emerald-400 ring-offset-1 animate-pulse-once p-2 -m-2' : ''
                    }`}
                  >
                    {/* node dot on the timeline spine */}
                    <span className={`absolute -left-1 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${isHit ? 'bg-emerald-600 ring-4 ring-emerald-200' : 'bg-emerald-500'}`} aria-hidden />
                    <div className="pl-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Synced {fmtWhen(e.at)}
                        </span>
                        {isHit && (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <BellRing className="w-2.5 h-2.5" /> from your notification
                          </span>
                        )}
                        {e.via === 'sw' && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5" /> app was closed
                          </span>
                        )}
                        {e.via === 'server' && (
                          <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                            from server history
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {e.actions.map((a, ai) => {
                          const hit = highlightSet.has(a.client_mutation_id);
                          return (
                            <p key={`${a.client_mutation_id}-${ai}`} className={`text-[11px] font-bold truncate ${hit ? 'text-emerald-800' : 'text-slate-700'}`}>
                                • {actionLine(a)}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---- Server history: how past mutations resolved ---- */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
            {failedCount > 0
              ? <ShieldAlert className="w-4 h-4 text-amber-500" />
              : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
            Server sync history
            {failedCount > 0 && (
              <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                {failedCount} failed
              </span>
            )}
          </h4>
          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
            aria-label="Refresh history"
          >
            {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>

        {!loadingHistory && history.length === 0 && (
          <p className="text-[11px] text-slate-500 py-2">No sync activity yet.</p>
        )}

        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {history.map((h) => {
            const st = STATUS_STYLE[h.status] || STATUS_STYLE.PENDING;
            const isFailed = h.status === 'FAILED' || h.status === 'CONFLICT';
            return (
              <div key={h.client_mutation_id} className="rounded-xl border border-slate-100 px-2.5 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{h.entity_type.replace('_', ' ')}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${st.cls}`}>
                      {isFailed && <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" />}
                      {isFailed && h.status === 'CONFLICT' ? <ShieldQuestion className="w-2.5 h-2.5 inline mr-0.5 -mt-0.5" /> : null}
                      {st.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-semibold truncate">
                    {h.payload?.customer_name
                      ? `${h.payload.customer_name} · ₹${h.payload.total_amount ?? ''}`
                      : h.payload?.order_number || h.payload?.order_id?.slice(0, 8) || h.payload?.product_id?.slice(0, 8) || h.client_mutation_id.slice(0, 14)}
                  </p>
                  {isFailed && h.error_message && (
                    <p className="text-[10px] font-bold text-rose-600 leading-tight">{h.error_message}</p>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 flex-shrink-0">{fmtTime(h.processed_at || h.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
