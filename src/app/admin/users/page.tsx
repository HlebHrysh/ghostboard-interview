"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Loader2,
  AlertCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
  const [sortBy, setSortBy] = useState<"newest" | "sessions" | "duration">("newest");

  // Edit / Modal states
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for creation
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Python Backend Developer");
  const [newPlan, setNewPlan] = useState("pro");

  // Form states for editing
  const [editPlan, setEditPlan] = useState("free");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

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
    setEditRole(u.role || "");
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
    } catch (e: any) {
      toast.error(e.message || "Помилка збереження");
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
    } catch (e: any) {
      toast.error(e.message || "Помилка при створенні");
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
    } catch (e: any) {
      toast.error(e.message || "Помилка видалення");
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
    return users
      .filter((u) => {
        const matchesSearch =
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
          (u.role && u.role.toLowerCase().includes(search.toLowerCase()));

        const matchesPlan =
          selectedPlanFilter === "all" ||
          (selectedPlanFilter === "pro" && u.plan.toLowerCase().includes("pro")) ||
          (selectedPlanFilter === "lifetime" && u.plan.toLowerCase().includes("lifetime")) ||
          (selectedPlanFilter === "free" && u.plan.toLowerCase().includes("free"));

        return matchesSearch && matchesPlan;
      })
      .sort((a, b) => {
        if (sortBy === "sessions") return b.sessionsCount - a.sessionsCount;
        if (sortBy === "duration") return b.totalDuration - a.totalDuration;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [users, search, selectedPlanFilter, sortBy]);

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
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#C8F135] text-black text-xs font-mono font-bold tracking-wider hover:shadow-[0_0_25px_rgba(200,241,53,0.35)] transition-all active:scale-95 cursor-pointer ml-auto sm:ml-0"
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
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8F135]/50 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
          {["all", "free", "pro", "lifetime"].map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlanFilter(plan)}
              className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[10px] tracking-wider transition-all cursor-pointer ${
                selectedPlanFilter === plan
                  ? "bg-[#C8F135] text-black shadow-[0_0_12px_rgba(200,241,53,0.3)]"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              {plan === "all" ? "Всі плани" : plan}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-zinc-500 text-[10px] uppercase hidden lg:inline">Сортувати:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-black/40 border border-white/10 text-zinc-300 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-[#C8F135]/50 cursor-pointer"
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
          <Loader2 className="w-8 h-8 animate-spin text-[#C8F135]" />
        </div>
      ) : (
        <div className="bg-[#08080c] border border-white/[0.08] rounded-3xl overflow-hidden overflow-x-auto shadow-2xl">
          <table className="w-full text-left font-mono text-xs whitespace-nowrap">
            <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400">
              <tr>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Candidate / Email</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Role & Level</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Plan Access</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Sessions</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Training Time</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Joined</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredUsers.map((u) => {
                const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString("uk-UA") : "-";
                const totalMins = Math.round(u.totalDuration / 60);

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
                              onClick={() => copyToClipboard(u.email)}
                              className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
                              title="Копіювати Email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4 text-zinc-400">
                      <div className="text-zinc-200">{u.role || "Developer"}</div>
                    </td>

                    {/* Plan Badge */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          u.plan === "pro"
                            ? "bg-[#C8F135]/20 text-[#C8F135] border border-[#C8F135]/30"
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
                          className="px-2 py-1 rounded-lg bg-[#C8F135]/10 hover:bg-[#C8F135]/30 text-[#C8F135] transition-all cursor-pointer font-mono text-[10px] flex items-center gap-1 font-bold"
                          title="Instant Pro Boost (Activate Pro & Reset Limits)"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Pro Boost</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#C8F135]/20 hover:text-[#C8F135] text-zinc-400 transition-all cursor-pointer"
                          title="Редагувати профіль та план"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setUserToDelete(u)}
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
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#08080c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 font-mono">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#C8F135]" />
                <span>Новий кандидат</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1.5">Email кандидата *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8F135]/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5">Імʼя кандидата</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Олександр Коваль"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8F135]/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5">Цільова посада / Стек</label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Python Backend Developer"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-[#C8F135]/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5">Рівень доступу / План</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#C8F135]/60"
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
                  className="btn-lime px-5 py-2 rounded-xl text-black font-bold flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Створити"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Candidate ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#08080c] border border-white/[0.1] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 font-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white uppercase flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#C8F135]" />
                  <span>Редагувати користувача</span>
                </h3>
                <span className="text-[11px] text-zinc-500">{editingUser.email}</span>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1 text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1.5">План доступу</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#C8F135]/60"
                >
                  <option value="free">Free (Обмеження)</option>
                  <option value="pro">Pro Pass (Безліміт)</option>
                  <option value="lifetime">Lifetime Founder Pass (VIP)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5">Ім'я</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#C8F135]/60"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1.5">Спеціалізація / Посада</label>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#C8F135]/60"
                />
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
                  className="btn-lime px-5 py-2 rounded-xl text-black font-bold flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Зберегти зміни"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Delete ── */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#08080c] border border-rose-500/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase">Підтвердити видалення?</h3>
            <p className="text-xs text-zinc-400">
              Ви збираєтесь назавжди видалити акаунт <span className="text-white font-bold">{userToDelete.email}</span> та всі пов'язані сесії.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs"
              >
                Скасувати
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Видалити назавжди"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
