import React, { useEffect, useMemo, useState } from 'react';
import { Images, HardDrive, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { AppUser, UserRole } from '../types/database';
import {
  fetchAllUsers,
  fetchMediaUploadStats,
  fetchMediaStorageBytes,
  updateUserRole,
} from '../services/mediaService';
import { Header } from '../components/Header';
import { PieChart } from '../components/PieChart';

type Range = 'today' | 'all' | '7d';
type UploadStat = { user_id: string | null; created_at: string };

const RANGE_LABELS: Record<Range, string> = {
  today: 'Today',
  all: 'Till date',
  '7d': 'Last 7 days',
};

const ASSIGNABLE_ROLES: Exclude<UserRole, 'super_admin'>[] = ['guest', 'user', 'admin'];

const displayName = (u: AppUser) => u.user_name || u.email || 'Unnamed user';

/** Local-midnight start of the range; null means no lower bound. "7d" = today plus the 6 days before it. */
const rangeStart = (range: Range): Date | null => {
  if (range === 'all') return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === '7d') d.setDate(d.getDate() - 6);
  return d;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
};

export const SuperAdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [uploads, setUploads] = useState<UploadStat[]>([]);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('all');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAllUsers(), fetchMediaUploadStats(), fetchMediaStorageBytes()])
      .then(([u, m, bytes]) => {
        setUsers(u);
        setUploads(m);
        setStorageBytes(bytes);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        toast.error(`Failed to load dashboard: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  // Uploader rows for the selected range, biggest first
  const uploadRows = useMemo(() => {
    const start = rangeStart(range);
    const counts = new Map<string | null, number>();
    for (const m of uploads) {
      if (start && new Date(m.created_at) < start) continue;
      counts.set(m.user_id, (counts.get(m.user_id) ?? 0) + 1);
    }
    const usersById = new Map(users.map((u) => [u.id, u]));
    return [...counts.entries()]
      .map(([userId, count]) => {
        const user = userId ? usersById.get(userId) : undefined;
        return { key: userId ?? 'unknown', label: user ? displayName(user) : 'Unknown user', count };
      })
      .sort((a, b) => b.count - a.count);
  }, [uploads, users, range]);

  const rangeTotal = uploadRows.reduce((sum, r) => sum + r.count, 0);
  const maxCount = uploadRows[0]?.count ?? 0;

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if ((a.role === 'super_admin') !== (b.role === 'super_admin')) return a.role === 'super_admin' ? -1 : 1;
        return displayName(a).localeCompare(displayName(b));
      }),
    [users],
  );

  const handleRoleChange = async (user: AppUser, role: Exclude<UserRole, 'super_admin'>) => {
    const previous = user.role;
    const setRole = (r: UserRole) => setUsers((us) => us.map((u) => (u.id === user.id ? { ...u, role: r } : u)));
    setRole(role);
    setSavingUserId(user.id);
    try {
      await updateUserRole(user.id, role);
      toast.success(`${displayName(user)} is now ${role}`);
    } catch (err: any) {
      setRole(previous);
      toast.error(`Failed to change role: ${err.message}`);
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Totals (independent of the range dropdown) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl bg-blue-50 p-4">
                <Images className="w-5 h-5 text-blue-600 mb-2" />
                <div className="text-2xl font-extrabold text-gray-900">{uploads.length}</div>
                <div className="text-xs font-medium text-gray-500">Total media uploaded</div>
              </div>
              <div className="rounded-2xl bg-green-50 p-4">
                <HardDrive className="w-5 h-5 text-green-600 mb-2" />
                <div className="text-2xl font-extrabold text-gray-900">
                  {storageBytes === null ? 'Unavailable' : formatBytes(storageBytes)}
                </div>
                <div className="text-xs font-medium text-gray-500">Storage used</div>
              </div>
            </div>

            {/* Uploads by user + pie, both driven by the range dropdown */}
            <section className="rounded-2xl border border-gray-200 p-4 sm:p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Uploads by user</h2>
                  <p className="text-xs text-gray-400 font-medium">{rangeTotal} in selected range</p>
                </div>
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as Range)}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Date range"
                >
                  {(['today', 'all', '7d'] as Range[]).map((r) => (
                    <option key={r} value={r}>{RANGE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              {uploadRows.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">No uploads in this range.</div>
              ) : (
                <ul className="space-y-3">
                  {uploadRows.map((r) => (
                    <li key={r.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 truncate pr-3">{r.label}</span>
                        <span className="font-bold text-gray-900 tabular-nums">{r.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-500 mb-3">Share of uploads</h3>
                <PieChart data={uploadRows.map((r) => ({ label: r.label, value: r.count }))} />
              </div>
            </section>

            {/* User list with role control */}
            <section className="rounded-2xl border border-gray-200 p-4 sm:p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Users ({users.length})</h2>
              <ul className="divide-y divide-gray-100">
                {sortedUsers.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{displayName(u)}</div>
                      {u.user_name && u.email && (
                        <div className="text-xs text-gray-400 truncate">{u.email}</div>
                      )}
                    </div>
                    {u.role === 'super_admin' ? (
                      <span className="shrink-0 rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">
                        Super admin
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={savingUserId === u.id}
                        onChange={(e) => handleRoleChange(u, e.target.value as Exclude<UserRole, 'super_admin'>)}
                        className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        aria-label={`Role for ${displayName(u)}`}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
