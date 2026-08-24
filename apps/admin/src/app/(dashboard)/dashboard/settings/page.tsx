"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/**
 * IMPORTANT — backend gaps affecting this screen, not silently worked
 * around:
 *
 * 1. No PATCH /tenants/:id (or any tenant-settings endpoint) exists.
 *    Tenant currency/language defaults are shown READ-ONLY below because
 *    there is currently no way to save changes to them.
 *
 * 2. There is no notification-preferences model/endpoint. The
 *    notification module only exposes POST /notifications/send (send one
 *    message right now), not a per-channel enable/disable preference a
 *    tenant can configure and persist. That section is omitted rather
 *    than built as a fake toggle that doesn't save anything real.
 *
 * 3. Custom domain support has no backend at all yet — shown as a
 *    clearly-marked future/upsell placeholder per the Phase 14 spec,
 *    matching what was explicitly asked for (non-functional by design).
 *
 * Recommend prioritizing a real tenant-settings PATCH endpoint next —
 * everything else on this page is blocked on it.
 */
export default function SettingsPage() {
  const { tenant } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Tenant configuration and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Name</span>
            <span className="text-slate-900">{tenant?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Workspace slug</span>
            <span className="text-slate-900">{tenant?.slug ?? "—"}</span>
          </div>
          <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-500">
            Currency and language defaults aren&apos;t editable yet — there&apos;s no backend
            endpoint to save tenant-level settings changes. This needs a{" "}
            <code className="rounded bg-slate-100 px-1">PATCH /tenants/:id</code> route added before
            this section can become interactive.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Domain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">
                {tenant?.slug ? `${tenant.slug}.businessos.app` : "your-workspace.businessos.app"}
              </p>
              <p className="text-xs text-slate-500">Free subdomain, active by default</p>
            </div>
          </div>
          <button
            disabled
            className="w-full rounded-md border border-dashed border-slate-300 py-2 text-sm text-slate-400"
            title="Coming soon"
          >
            Connect custom domain (coming soon)
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
