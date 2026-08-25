"use client";

import { useEffect, useState } from "react";
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
}

interface AdditionalUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
}

interface OnboardResult {
  tenant: { id: string; name: string; slug: string; businessType: string };
  owner: { id: string; email: string; password: string };
  additionalUsers: Array<{ id: string; email: string; roleName: string; tempPassword: string }>;
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  dine_in_restaurant: "Restaurant (Dine-in)",
  cloud_kitchen: "Cloud Kitchen",
  cafe: "Cafe",
  food_truck: "Food Truck",
  street_food: "Street Food",
  bakery: "Bakery",
  bar_pub: "Bar / Pub",
  multi_branch_chain: "Multi-branch Chain",
};

const STEPS = ["Business Type", "Plan", "Owner Details", "Additional Logins", "Review"];

const EMPTY_ADDITIONAL_USER: AdditionalUserForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleName: "MANAGER",
};

export default function OnboardingPage() {
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardResult | null>(null);

  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  const [tenantName, setTenantName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [planId, setPlanId] = useState("");
  const [useCustomPlan, setUseCustomPlan] = useState(false);
  const [customPlanName, setCustomPlanName] = useState("");
  const [customPlanPrice, setCustomPlanPrice] = useState("");
  const [customPlanBillingCycle, setCustomPlanBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  const [additionalUsers, setAdditionalUsers] = useState<AdditionalUserForm[]>([]);

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const [businessTypesRes, plansRes, rolesRes] = await Promise.all([
          api.get<{ businessTypes: string[] }>("/super-admin/onboarding/business-types"),
          api.get<Plan[]>("/super-admin/plans"),
          api.get<{ roles: string[] }>("/super-admin/onboarding/roles"),
        ]);
        setBusinessTypes(businessTypesRes.businessTypes);
        setPlans(plansRes.filter((p) => p.isActive));
        setRoles(rolesRes.roles);
      } catch (err) {
        showToast(
          err instanceof ApiError ? err.message : "Failed to load onboarding options.",
          "error",
        );
      } finally {
        setLoadingOptions(false);
      }
    }
    loadOptions();
  }, [showToast]);

  function addAdditionalUser() {
    setAdditionalUsers((prev) => [...prev, { ...EMPTY_ADDITIONAL_USER }]);
  }

  function updateAdditionalUser(index: number, patch: Partial<AdditionalUserForm>) {
    setAdditionalUsers((prev) => prev.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  function removeAdditionalUser(index: number) {
    setAdditionalUsers((prev) => prev.filter((_, i) => i !== index));
  }

  function canProceedFromStep(current: number): boolean {
    if (current === 0) return tenantName.trim().length >= 2 && businessType !== "";
    if (current === 1) {
      if (useCustomPlan) {
        return customPlanName.trim().length >= 2 && customPlanPrice.trim().length > 0;
      }
      return planId !== "";
    }
    if (current === 2) {
      return (
        ownerFirstName.trim().length >= 2 &&
        ownerLastName.trim().length >= 2 &&
        /\S+@\S+\.\S+/.test(ownerEmail) &&
        ownerPassword.length >= 10
      );
    }
    if (current === 3) {
      return additionalUsers.every(
        (u) =>
          u.firstName.trim().length >= 2 &&
          u.lastName.trim().length >= 2 &&
          /\S+@\S+\.\S+/.test(u.email),
      );
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = {
        tenantName,
        businessType,
        planId: useCustomPlan ? undefined : planId,
        customPlan: useCustomPlan
          ? {
              name: customPlanName,
              price: customPlanPrice,
              billingCycle: customPlanBillingCycle,
            }
          : undefined,
        owner: {
          firstName: ownerFirstName,
          lastName: ownerLastName,
          email: ownerEmail,
          phone: ownerPhone || undefined,
          password: ownerPassword,
        },
        additionalUsers: additionalUsers.length
          ? additionalUsers.map((u) => ({
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              phone: u.phone || undefined,
              roleName: u.roleName,
            }))
          : undefined,
      };

      const res = await api.post<OnboardResult>("/super-admin/onboarding/tenants", payload);
      setResult(res);
      showToast(`${res.tenant.name} onboarded successfully.`, "success");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Onboarding failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setResult(null);
    setStep(0);
    setTenantName("");
    setBusinessType("");
    setPlanId("");
    setOwnerFirstName("");
    setOwnerLastName("");
    setOwnerEmail("");
    setOwnerPhone("");
    setOwnerPassword("");
    setAdditionalUsers([]);
  }

  if (result) {
    return <OnboardingSuccessScreen result={result} onStartAnother={resetForm} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Onboard New Business</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Create a tenant, assign a plan, and set up initial logins in one flow.
        </p>
      </div>

      <StepIndicator steps={STEPS} currentStep={step} />

      {loadingOptions ? (
        <div className="mt-6 text-sm text-[var(--muted)]">Loading options...</div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-6">
          {step === 0 && (
            <div className="space-y-4">
              <FormField label="Business Name">
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. Spice Route Cafe"
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </FormField>

              <FormField label="Business Category">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {businessTypes.map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setBusinessType(bt)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        businessType === bt
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--panel-border)] text-[var(--muted)] hover:bg-white/5"
                      }`}
                    >
                      {BUSINESS_TYPE_LABELS[bt] ?? bt}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setUseCustomPlan((v) => !v)}
                className="text-xs font-medium text-[var(--accent)] hover:underline"
              >
                {useCustomPlan
                  ? "\u2190 Use an existing plan instead"
                  : "Set a custom price instead \u2192"}
              </button>

              {useCustomPlan ? (
                <div className="space-y-3 rounded-xl border border-[var(--panel-border)] p-4">
                  <FormField label="Plan Name">
                    <input
                      type="text"
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="e.g. Negotiated Rate - Test Cafe"
                      className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Price (INR)">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customPlanPrice}
                        onChange={(e) => setCustomPlanPrice(e.target.value)}
                        className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                      />
                    </FormField>
                    <FormField label="Billing Cycle">
                      <select
                        value={customPlanBillingCycle}
                        onChange={(e) =>
                          setCustomPlanBillingCycle(e.target.value as "monthly" | "yearly")
                        }
                        className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </FormField>
                  </div>
                  <p className="text-[10px] text-[var(--muted)]">
                    This creates a one-off plan just for this business. It won&apos;t appear in your
                    public Plans list.
                  </p>
                </div>
              ) : plans.length === 0 ? (
                <div className="text-sm text-[var(--muted)]">
                  No active plans found. Create one in the Plans tab first.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setPlanId(plan.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        planId === plan.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/10"
                          : "border-[var(--panel-border)] hover:bg-white/5"
                      }`}
                    >
                      <div className="text-sm font-semibold text-[var(--foreground)]">
                        {plan.name}
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                        {"\u20B9"}
                        {plan.price}
                        <span className="text-xs font-normal text-[var(--muted)]">
                          /{plan.billingCycle === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="mt-1 text-xs text-[var(--muted)]">{plan.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="First Name">
                  <input
                    type="text"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </FormField>
                <FormField label="Last Name">
                  <input
                    type="text"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                </FormField>
              </div>
              <FormField label="Email">
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </FormField>
              <FormField label="Phone (optional)">
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
              </FormField>
              <FormField label="Initial Password (min 10 chars, mixed case + number)">
                <input
                  type="text"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
                <p className="mt-1 text-[10px] text-[var(--muted)]">
                  This will be shown once on the confirmation screen. The business owner can change
                  it after logging in.
                </p>
              </FormField>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--muted)]">
                Optional. Add Manager, Cashier, or other role logins now — temp passwords will be
                generated and shown once on the review screen.
              </p>

              {additionalUsers.map((u, i) => (
                <div key={i} className="rounded-xl border border-[var(--panel-border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--muted)]">Login #{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeAdditionalUser(i)}
                      className="text-xs text-[var(--danger)] hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="First name"
                      value={u.firstName}
                      onChange={(e) => updateAdditionalUser(i, { firstName: e.target.value })}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={u.lastName}
                      onChange={(e) => updateAdditionalUser(i, { lastName: e.target.value })}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={u.email}
                    onChange={(e) => updateAdditionalUser(i, { email: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Phone (optional)"
                      value={u.phone}
                      onChange={(e) => updateAdditionalUser(i, { phone: e.target.value })}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    />
                    <select
                      value={u.roleName}
                      onChange={(e) => updateAdditionalUser(i, { roleName: e.target.value })}
                      className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addAdditionalUser}
                className="w-full rounded-lg border border-dashed border-[var(--panel-border)] px-3 py-2 text-xs font-medium text-[var(--muted)] hover:bg-white/5"
              >
                + Add another login
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-sm">
              <ReviewRow label="Business Name" value={tenantName} />
              <ReviewRow
                label="Category"
                value={BUSINESS_TYPE_LABELS[businessType] ?? businessType}
              />
              <ReviewRow
                label="Plan"
                value={
                  useCustomPlan
                    ? `${customPlanName} (\u20B9${customPlanPrice}/${customPlanBillingCycle === "monthly" ? "mo" : "yr"}, custom)`
                    : (plans.find((p) => p.id === planId)?.name ?? "\u2014")
                }
              />
              <ReviewRow
                label="Owner"
                value={`${ownerFirstName} ${ownerLastName} (${ownerEmail})`}
              />
              {additionalUsers.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Additional Logins
                  </div>
                  {additionalUsers.map((u, i) => (
                    <div key={i} className="text-xs text-[var(--foreground)]">
                      {u.firstName} {u.lastName} — {u.email} ({u.roleName.replace(/_/g, " ")})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2 border-t border-[var(--panel-border)] pt-4">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/10"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canProceedFromStep(step)}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0e14] hover:opacity-90 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[#0a0e14] hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Business"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              i === currentStep
                ? "bg-[var(--accent)] text-[#0a0e14]"
                : i < currentStep
                  ? "bg-[var(--success)]/20 text-[var(--success)]"
                  : "bg-white/5 text-[var(--muted)]"
            }`}
          >
            {i < currentStep ? "\u2713" : i + 1}
          </div>
          <span
            className={`text-xs ${i === currentStep ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}
          >
            {s}
          </span>
          {i < steps.length - 1 && <div className="h-px w-6 bg-[var(--panel-border)]" />}
        </div>
      ))}
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--panel-border)] pb-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function OnboardingSuccessScreen({
  result,
  onStartAnother,
}: {
  result: OnboardResult;
  onStartAnother: () => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          {result.tenant.name} is live
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Save these credentials now — passwords are shown only once and cannot be retrieved later.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/5 p-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
            Owner Login
          </div>
          <div className="text-sm text-[var(--foreground)]">{result.owner.email}</div>
          <div className="mt-1 font-mono text-sm text-[var(--foreground)]">
            {result.owner.password}
          </div>
        </div>

        {result.additionalUsers.map((u) => (
          <div key={u.id} className="rounded-xl border border-[var(--panel-border)] p-4">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {u.roleName.replace(/_/g, " ")} Login
            </div>
            <div className="text-sm text-[var(--foreground)]">{u.email}</div>
            <div className="mt-1 font-mono text-sm text-[var(--foreground)]">{u.tempPassword}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStartAnother}
        className="mt-6 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-white/10"
      >
        Onboard Another Business
      </button>
    </div>
  );
}
