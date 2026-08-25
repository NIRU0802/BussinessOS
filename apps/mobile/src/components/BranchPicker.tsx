"use client";

import { useEffect, useState } from "react";
import { fetchBranches } from "@/lib/api-client";
import type { Branch } from "@/lib/types";

interface BranchPickerProps {
  branchIds: string[];
  activeBranchId: string;
  onSelect: (branchId: string) => void;
}

// Shown only when staff has more than one assigned branch. Fetches real
// branch names from GET /branches and filters down to just the ones this
// staff member is assigned to (branchIds from the JWT), so we never show
// branches they don't have access to even if the endpoint returns more.
export function BranchPicker({ branchIds, activeBranchId, onSelect }: BranchPickerProps) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (branchIds.length <= 1) return;
    fetchBranches()
      .then((all) => setBranches(all.filter((b) => branchIds.includes(b.id))))
      .finally(() => setLoading(false));
  }, [branchIds]);

  if (branchIds.length <= 1) return null;

  const activeBranch = branches.find((b) => b.id === activeBranchId);
  const activeLabel = loading ? "Loading..." : (activeBranch?.name ?? activeBranchId);

  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: "#f8fafc",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <span>Branch: {activeLabel}</span>
        <span style={{ fontSize: 11, color: "#64748b" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            marginTop: 4,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                onSelect(b.id);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                background: b.id === activeBranchId ? "#f1f5f9" : "#ffffff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
