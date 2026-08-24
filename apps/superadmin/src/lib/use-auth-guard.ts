"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getToken,
  getAdmin,
  clearToken,
  clearRefreshToken,
  clearAdmin,
  AdminInfo,
} from "./api-client";

export function useAuthGuard() {
  const router = useRouter();
  const [admin, setAdminState] = useState<AdminInfo | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    const adminInfo = getAdmin();

    if (!token || !adminInfo) {
      router.replace("/login");
      return;
    }

    setAdminState(adminInfo);
    setChecked(true);
  }, [router]);

  function logout() {
    clearToken();
    clearRefreshToken();
    clearAdmin();
    router.replace("/login");
  }

  return { admin, checked, logout };
}
