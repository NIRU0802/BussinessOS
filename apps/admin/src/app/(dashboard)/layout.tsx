"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Branch } from "@/lib/types";

async function fetchBranches(): Promise<Branch[]> {
  const res = await apiClient.get<Branch[]>("/branches");
  return res.data;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranches,
    enabled: isAuthenticated,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar branches={branches} branchesLoading={branchesLoading} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
