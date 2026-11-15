"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Users,
  Search,
  Plus,
  Download,
  Edit2,
  Trash2,
  Check,
  X,
  Copy,
  Clock,
  Mic,
  Shield,
  Terminal,
  Loader2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type AppRole = "user" | "developer" | "admin";

function normalizeRole(role?: string | null): AppRole {
  return role === "developer" || role === "admin" ? role : "user";
}

function AdminModalDialog({
  open,
  onClose,
  ariaLabelledBy,
  maxWidthClass = "max-w-md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabelledBy: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={ariaLabelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className={`m-auto bg-transparent p-4 border-0 w-full ${maxWidthClass} backdrop:bg-black/80 backdrop:backdrop-blur-sm overscroll-contain`}
    >
      {children}
    </dialog>
  );
}

interface UserItem {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
  createdAt: string;
  sessionsCount: number;
  totalDuration: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<"all" | AppRole>("all");
  const [sortBy, setSortBy] = useState<"newest" | "sessions" | "duration">("newest");

  // Edit / Modal states
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Form states for creation
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [newPlan, setNewPlan] = useState("pro");

  // Form states for editing
  const [editPlan, setEditPlan] = useState("free");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<AppRole>("user");

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/users";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setEditPlan(u.plan);
    setEditName(u.name || "");
    setEditRole(normalizeRole(u.role));
  };

  const handleToggleDeveloperRole = async (u: UserItem) => {
    const currentRole = normalizeRole(u.role);
    const targetRole: AppRole = currentRole === "developer" ? "user" : "developer";
    setRoleUpdatingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/users";
        return;
      }
      if (res.ok) {
        toast.success(
          targetRole === "developer"
            ? `Роль Developer призначено для ${u.email}`
            : `Роль Developer знято для ${u.email}`
        );
        setUsers((prev) =>
          prev.map((item) => (item.id === u.id ? { ...item, role: targetRole } : item))
        );
        if (editingUser?.id === u.id) {
          setEditRole(targetRole);
          setEditingUser((prev) => (prev ? { ...prev, role: targetRole } : prev));
        }
      } else {
        toast.error(data.error || "Не вдалося змінити роль");
      }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Помилка оновлення ролі");
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: editPlan,
          name: editName,
          role: editRole,
        }),
      });
      if (res.ok) {
        toast.success(`Користувача ${editingUser.email} оновлено`);
        setEditingUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        toast.error(d.error || "Не вдалося оновити користувача");
      }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Помилка збереження");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Введіть коректну електронну пошту");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          role: newRole,
          plan: newPlan,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Кандидата ${newEmail} успішно додано з планом ${newPlan.toUpperCase()}`);
        setIsCreateModalOpen(false);
        setNewEmail("");
        setNewName("");
        fetchUsers();
      } else {
        toast.error(data.error || "Не вдалося створити користувача");
      }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Помилка при створенні");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Користувача ${userToDelete.email} видалено`);
        setUserToDelete(null);
        fetchUsers();
      } else {
        const d = await res.json();
        toast.error(d.error || "Помилка видалення");
      }
    } catch (e: unknown) {
      toast.error((e as { message?: string })?.message || "Помилка видалення");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Скопійовано: ${text}`);
  };

  const exportCSV = () => {
    if (users.length === 0) {
      toast.error("Немає даних для експорту");
      return;
    }
    const headers = ["ID", "Email", "Name", "Role", "Plan", "Sessions", "TotalMinutes", "CreatedAt"];
    const rows = users.map((u) => [
      u.id,
      u.email,
      `"${u.name || ""}"`,
      `"${u.role || ""}"`,
      u.plan,
      u.sessionsCount,
      Math.round(u.totalDuration / 60),
      u.createdAt || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ghostboard_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV експорт сформовано");
  };

  // Filter & Sort
  const filteredUsers = useMemo(() => {
    const searchLower = search.trim().toLowerCase();
    return users
      .filter((u) => {
        const normalizedRole = normalizeRole(u.role);
        const matchesSearch =
          !searchLower ||
          u.email.toLowerCase().includes(searchLower) ||
          (u.name && u.name.toLowerCase().includes(searchLower)) ||
          normalizedRole.includes(searchLower) ||
          (u.role && u.role.toLowerCase().includes(searchLower));

        const matchesPlan =
          selectedPlanFilter === "all" ||
          (selectedPlanFilter === "pro" && u.plan.toLowerCase().includes("pro")) ||
          (selectedPlanFilter === "lifetime" && u.plan.toLowerCase().includes("lifetime")) ||
          (selectedPlanFilter === "free" && u.plan.toLowerCase().includes("free"));

        const matchesRole =
          selectedRoleFilter === "all" || normalizedRole === selectedRoleFilter;

        return matchesSearch && matchesPlan && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === "sessions") return b.sessionsCount - a.sessionsCount;
        if (sortBy === "duration") return b.totalDuration - a.totalDuration;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [users, search, selectedPlanFilter, selectedRoleFilter, sortBy]);

  return (
    <div className="space-y-6">
      {/* ── Top Header Controls ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider uppercase flex items-center gap-3">
            <span>Users Directory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-normal">
              {filteredUsers.length} of {users.length}
            </span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Керування акаунтами кандидатів, надання планів та аналіз активності
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-black text-xs font-mono font-bold tracking-wider hover:shadow-[0_0_25px_rgba(196,181,253,0.35)] transition-all active:scale-95 cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Додати юзера</span>
          </button>
        </div>
      </div>

      {/* ── Search, Filters & Sort Bar ── */}
      <div className="bg-[#08080c] border border-white/[0.08] p-4 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за email, ім'ям або спеціалізацією..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
          {["all", "free", "pro", "lifetime"].map((plan) => (
            <button
              type="button"
              key={plan}
              onClick={() => setSelectedPlanFilter(plan)}
              className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[10px] tracking-wider transition-all cursor-pointer ${
                selectedPlanFilter === plan
                  ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              {plan === "all" ? "Всі плани" : plan}
            </button>
          ))}
        </div>

        {/* Role Filter Select */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <label htmlFor="admin-role-filter" className="sr-only">
            Фільтр за роллю RBAC
          </label>
          <select
            id="admin-role-filter"
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value as "all" | AppRole)}
            className="bg-black/40 border border-white/10 text-zinc-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-white/50 cursor-pointer"
          >
            <option value="all">Всі ролі</option>
            <option value="user">USER</option>
            <option value="developer">DEV</option>
            <option value="admin">ADMIN</option>
          </select>
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-zinc-500 text-[10px] uppercase hidden lg:inline">Сортувати:</span>
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as 'newest' | 'sessions' | 'duration')}
            className="bg-black/40 border border-white/10 text-zinc-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-white/50 cursor-pointer"
          >
            <option value="newest">Найновіші</option>
            <option value="sessions">Найбільше сесій</option>
            <option value="duration">Найдовший час</option>
          </select>
        </div>
      </div>

      {/* ── Users Table ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="Список користувачів та ролей RBAC"
          className="bg-[#08080c] border border-white/[0.08] rounded-3xl overflow-hidden overflow-x-auto shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <table className="w-full text-left font-mono text-xs whitespace-nowrap">
            <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400">
              <tr>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider">Candidate / Email</th>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider">RBAC Role</th>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider">Plan Access</th>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Sessions</th>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Training Time</th>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Joined</th>
                <th scope="col" className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredUsers.map((u) => {
                const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString("uk-UA") : "-";
                const totalMins = Math.round(u.totalDuration / 60);
                const role = normalizeRole(u.role);
                const isDeveloper = role === "developer";
                const isRoleUpdating = roleUpdatingId === u.id;

                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* User & Email */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white font-bold text-xs uppercase">
                          {u.email.charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-bold flex items-center gap-1.5">
                            <span>{u.name || u.email.split("@")[0]}</span>
                          </div>
                          <div className="text-zinc-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                            <span>{u.email}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(u.email)}
                              aria-label={`Копіювати email ${u.email}`}
                              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-white transition-opacity"
                              title="Копіювати Email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* RBAC Role Badge */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                          role === "developer"
                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                            : role === "admin"
                            ? "bg-violet-500/15 text-violet-300 border-violet-400/30"
                            : "bg-zinc-900 text-zinc-400 border-white/10"
                        }`}
                      >
                        {role === "developer" ? (
                          <>
                            <Terminal className="w-3 h-3" />
                            <span>DEV</span>
                          </>
                        ) : role === "admin" ? (
                          <>
                            <Shield className="w-3 h-3" />
                            <span>ADMIN</span>
                          </>
                        ) : (
                          <span>USER</span>
                        )}
                      </span>
                    </td>

                    {/* Plan Badge */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          u.plan === "pro"
                            ? "bg-white/10 text-white border border-white/20"
                            : u.plan === "lifetime"
                            ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {u.plan}
                      </span>
                    </td>

                    {/* Sessions */}
                    <td className="p-4 text-right">
                      <span className="text-white font-bold">{u.sessionsCount}</span>
                    </td>

                    {/* Duration */}
                    <td className="p-4 text-right text-zinc-400">
                      <span>{totalMins > 60 ? `${(totalMins / 60).toFixed(1)} год` : `${totalMins} хв`}</span>
                    </td>

                    {/* Joined Date */}
                    <td className="p-4 text-right text-zinc-500 text-[11px]">
                      {dateStr}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleDeveloperRole(u)}
                          disabled={isRoleUpdating}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-mono text-[10px] flex items-center gap-1 font-bold border ${
                            isDeveloper
                              ? "bg-cyan-500/15 hover:bg-rose-500/15 text-cyan-300 hover:text-rose-300 border-cyan-400/30 hover:border-rose-400/30"
                              : "bg-white/[0.04] hover:bg-cyan-500/15 text-zinc-300 hover:text-cyan-300 border-white/10 hover:border-cyan-400/30"
                          }`}
                          title={isDeveloper ? "Зняти роль Developer" : "Зробити Developer"}
                        >
                          {isRoleUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Terminal className="w-3 h-3" />
                          )}
                          <span>{isDeveloper ? "Зняти роль Developer" : "Зробити Developer"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/admin/users", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: u.id, plan: "pro", resetTrial: true }),
                              });
                              if (res.ok) {
                                toast.success(`Pro активовано для ${u.email}`);
                                fetchUsers();
                              }
                            } catch {
                              toast.error("Помилка активації Pro");
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer font-mono text-[10px] flex items-center gap-1 font-bold"
                          title="Instant Pro Boost (Activate Pro & Reset Limits)"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Pro Boost</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          aria-label={`Редагувати користувача ${u.email}`}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 hover:text-white text-zinc-400 transition-all cursor-pointer"
                          title="Редагувати профіль, роль та план"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          aria-label={`Видалити користувача ${u.email}`}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-all cursor-pointer"
                          title="Видалити користувача"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500 font-mono">
                    Кандидатів за заданим фільтром не знайдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: Create Candidate ── */}
      <AdminModalDialog
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        ariaLabelledBy="create-user-modal-title"
      >
        <div className="bg-[#08080c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 w-full shadow-2xl space-y-6 font-mono text-left">
          <div className="flex items-center justify-between">
            <h2
              id="create-user-modal-title"
              className="text-base font-bold text-white uppercase flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Новий кандидат</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Закрити вікно створення користувача"
              className="p-1 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div>
              <label htmlFor="create-user-email" className="block text-zinc-400 mb-1.5">
                Email кандидата *
              </label>
              <input
                id="create-user-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
              />
            </div>

            <div>
              <label htmlFor="create-user-name" className="block text-zinc-400 mb-1.5">
                Імʼя кандидата
              </label>
              <input
                id="create-user-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Олександр Коваль"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
              />
            </div>

            <div>
              <label htmlFor="create-user-role" className="block text-zinc-400 mb-1.5">
                Роль доступу (RBAC)
              </label>
              <select
                id="create-user-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AppRole)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white/50"
              >
                <option value="user">USER (Стандартний користувач)</option>
                <option value="developer">DEV (Повний доступ + Dev Panel)</option>
                <option value="admin">ADMIN (Повний доступ + Admin)</option>
              </select>
            </div>

            <div>
              <label htmlFor="create-user-plan" className="block text-zinc-400 mb-1.5">
                Рівень доступу / План
              </label>
              <select
                id="create-user-plan"
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white/50"
              >
                <option value="free">Free (Демо 15 хв)</option>
                <option value="pro">Pro Pass ($15-25/mo)</option>
                <option value="lifetime">Lifetime Founder Pass ($99-149)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-resend-primary !px-5 !py-2.5 text-xs font-mono flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Створити"}
              </button>
            </div>
          </form>
        </div>
      </AdminModalDialog>

      {/* ── Modal: Edit Candidate ── */}
      <AdminModalDialog
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        ariaLabelledBy="edit-user-modal-title"
      >
        {editingUser && (
          <div className="bg-[#08080c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 w-full shadow-2xl space-y-6 font-mono text-left">
            <div className="flex items-center justify-between">
              <div>
                <h2
                  id="edit-user-modal-title"
                  className="text-base font-bold text-white uppercase flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                  <span>Редагувати користувача</span>
                </h2>
                <span className="text-[11px] text-zinc-500">{editingUser.email}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Закрити вікно редагування"
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label htmlFor="edit-user-plan" className="block text-zinc-400 mb-1.5">
                  План доступу
                </label>
                <select
                  id="edit-user-plan"
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white/50"
                >
                  <option value="free">Free (Обмеження)</option>
                  <option value="pro">Pro Pass (Безліміт)</option>
                  <option value="lifetime">Lifetime Founder Pass (VIP)</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-user-name" className="block text-zinc-400 mb-1.5">
                  Ім&apos;я
                </label>
                <input
                  id="edit-user-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white/50"
                />
              </div>

              <div>
                <label htmlFor="edit-user-role" className="block text-zinc-400 mb-1.5">
                  Роль доступу (RBAC)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="edit-user-role"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as AppRole)}
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white/50"
                  >
                    <option value="user">USER (Стандартний)</option>
                    <option value="developer">DEV (Developer Mode)</option>
                    <option value="admin">ADMIN (Власник)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleToggleDeveloperRole(editingUser)}
                    disabled={roleUpdatingId === editingUser.id}
                    className={`px-3 py-2.5 rounded-xl font-bold text-[10px] border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      normalizeRole(editingUser.role) === "developer"
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/30 hover:bg-rose-500/15 hover:text-rose-300"
                        : "bg-white/5 text-zinc-200 border-white/10 hover:bg-cyan-500/15 hover:text-cyan-300"
                    }`}
                  >
                    {roleUpdatingId === editingUser.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {normalizeRole(editingUser.role) === "developer"
                        ? "Зняти роль Developer"
                        : "Зробити Developer"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-400 space-y-1">
                <div>Всього тренувань: <span className="text-white font-bold">{editingUser.sessionsCount}</span></div>
                <div>Натреновано часу: <span className="text-white font-bold">{Math.round(editingUser.totalDuration / 60)} хв</span></div>
                <div>ID: <span className="text-zinc-500 font-mono text-[9px]">{editingUser.id}</span></div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="btn-resend-primary !px-5 !py-2.5 text-xs font-mono flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти зміни"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminModalDialog>

      {/* ── Modal: Confirm Delete ── */}
      <AdminModalDialog
        open={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        ariaLabelledBy="delete-user-modal-title"
        maxWidthClass="max-w-sm"
      >
        {userToDelete && (
          <div className="bg-[#08080c] border border-rose-500/20 rounded-3xl p-6 sm:p-8 w-full shadow-2xl space-y-4 font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 id="delete-user-modal-title" className="text-sm font-bold text-white uppercase">
              Підтвердити видалення?
            </h2>
            <p className="text-xs text-zinc-400">
              Ви збираєтесь назавжди видалити акаунт <span className="text-white font-bold">{userToDelete.email}</span> та всі пов&apos;язані сесії.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Видалити назавжди"}
              </button>
            </div>
          </div>
        )}
      </AdminModalDialog>
    </div>
  );
}
