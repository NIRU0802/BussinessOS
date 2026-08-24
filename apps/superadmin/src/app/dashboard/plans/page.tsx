"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

interface PlanLimit {
  maxBranches: number | null;
  maxUsers: number | null;
  maxDevices: number | null;
  maxStorageMb: number | null;
  maxMonthlyOrders: number | null;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  billingCycle: "monthly" | "yearly";
  description: string | null;
  isActive: boolean;
  limits: PlanLimit | null;
  widgetKeys: string[];
  subscriberCount: number;
  createdAt: string;
}

interface PlanFormState {
  name: string;
  price: string;
  billingCycle: "monthly" | "yearly";
  description: string;
  maxBranches: string;
  maxUsers: string;
  maxDevices: string;
  maxStorageMb: string;
  maxMonthlyOrders: string;
}

const EMPTY_FORM: PlanFormState = {
  name: "",
  price: "",
  billingCycle: "monthly",
  description: "",
  maxBranches: "",
  maxUsers: "",
  maxDevices: "",
  maxStorageMb: "",
  maxMonthlyOrders: "",
};

export default function PlansPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Plan[]>("/super-admin/plans");
      setPlans(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to load plans.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      price: plan.price,
      billingCycle: plan.billingCycle,
      description: plan.description ?? "",
      maxBranches: plan.limits?.maxBranches?.toString() ?? "",
      maxUsers: plan.limits?.maxUsers?.toString() ?? "",
      maxDevices: plan.limits?.maxDevices?.toString() ?? "",
      maxStorageMb: plan.limits?.maxStorageMb?.toString() ?? "",
      maxMonthlyOrders: plan.limits?.maxMonthlyOrders?.toString() ?? "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      price: Number(form.price),
      billingCycle: form.billingCycle,
      description: form.description || undefined,
      maxBranches: form.maxBranches ? Number(form.maxBranches) : undefined,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : undefined,
      maxDevices: form.maxDevices ? Number(form.maxDevices) : undefined,
      maxStorageMb: form.maxStorageMb ? Number(form.maxStorageMb) : undefined,
      maxMonthlyOrders: form.maxMonthlyOrders ? Number(form.maxMonthlyOrders) : undefined,
    };

    try {
      if (editingId) {
        await api.patch(`/super-admin/plans/${editingId}`, payload);
        showToast(`Plan "${form.name}" updated.`, "success");
      } else {
        await api.post("/super-admin/plans", payload);
        showToast(`Plan "${form.name}" created.`, "success");
      }
      setShowForm(false);
      await fetchPlans();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to save plan.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(plan: Plan) {
    if (!confirm(`Deactivate plan "${plan.name}"?`)) return;
    try {
      await api.delete(`/super-admin/plans/${plan.id}`);
      showToast(`Plan "${plan.name}" deactivated.`, "success");
      await fetchPlans();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to deactivate plan.", "error");
    }
  }

  async function handleReactivate(plan: Plan) {
    try {
      await api.post(`/super-admin/plans/${plan.id}/reactivate`);
      showToast(`Plan "${plan.name}" reactivated.`, "success");
      await fetchPlans();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Failed to reactivate plan.", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Subscription Plans</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage pricing tiers and limits</p>
        </div>
        <button
          onClick={openCreateForm}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0e14] hover:opacity-90"
        >
          + New Plan
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted)]">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-8 text-center text-sm text-[var(--muted)]">
          No plans yet. Create your first plan to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => openEditForm(plan)}
              onDeactivate={() => handleDeactivate(plan)}
              onReactivate={() => handleReactivate(plan)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <PlanFormModal
          form={form}
          setForm={setForm}
          isEditing={!!editingId}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
function PlanCard({
  plan,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  plan: Plan;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{plan.name}</h3>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {plan.description ?? "No description"}
          </p>
        </div>
        {!plan.isActive && (
          <span className="rounded bg-[var(--muted)]/15 px-2 py-0.5 text-xs text-[var(--muted)]">
            Inactive
          </span>
        )}
      </div>

      <div className="mb-4">
        <span className="text-2xl font-semibold text-[var(--foreground)]">
          {"\u20B9"}
          {plan.price}
        </span>
        <span className="text-sm text-[var(--muted)]">
          /{plan.billingCycle === "monthly" ? "mo" : "yr"}
        </span>
      </div>

      <div className="mb-4 space-y-1.5 text-xs text-[var(--muted)]">
        <LimitRow label="Branches" value={plan.limits?.maxBranches} />
        <LimitRow label="Users" value={plan.limits?.maxUsers} />
        <LimitRow label="Devices" value={plan.limits?.maxDevices} />
        <LimitRow label="Monthly orders" value={plan.limits?.maxMonthlyOrders} />
      </div>

      <div className="mb-4 flex items-center justify-between border-t border-[var(--panel-border)] pt-3 text-xs text-[var(--muted)]">
        <span>{plan.subscriberCount} subscriber(s)</span>
        <span>{plan.widgetKeys.length} widget(s)</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-white/10"
        >
          Edit
        </button>
        {plan.isActive ? (
          <button
            onClick={onDeactivate}
            className="flex-1 rounded-lg bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/20"
          >
            Deactivate
          </button>
        ) : (
          <button
            onClick={onReactivate}
            className="flex-1 rounded-lg bg-[var(--success)]/10 px-3 py-1.5 text-xs font-medium text-[var(--success)] hover:bg-[var(--success)]/20"
          >
            Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="text-[var(--foreground)]">
        {value === null || value === undefined ? "Unlimited" : value}
      </span>
    </div>
  );
}

function PlanFormModal({
  form,
  setForm,
  isEditing,
  saving,
  onSubmit,
  onClose,
}: {
  form: PlanFormState;
  setForm: React.Dispatch<React.SetStateAction<PlanFormState>>;
  isEditing: boolean;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  function update<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
          {isEditing ? "Edit Plan" : "New Plan"}
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <FormField label="Name">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (INR)">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </FormField>
            <FormField label="Billing Cycle">
              <select
                value={form.billingCycle}
                onChange={(e) => update("billingCycle", e.target.value as "monthly" | "yearly")}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Max Branches">
              <input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={form.maxBranches}
                onChange={(e) => update("maxBranches", e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </FormField>
            <FormField label="Max Users">
              <input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={form.maxUsers}
                onChange={(e) => update("maxUsers", e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </FormField>
            <FormField label="Max Devices">
              <input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={form.maxDevices}
                onChange={(e) => update("maxDevices", e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </FormField>
            <FormField label="Max Monthly Orders">
              <input
                type="number"
                min="0"
                placeholder="Unlimited"
                value={form.maxMonthlyOrders}
                onChange={(e) => update("maxMonthlyOrders", e.target.value)}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </FormField>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[#0a0e14] hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}
