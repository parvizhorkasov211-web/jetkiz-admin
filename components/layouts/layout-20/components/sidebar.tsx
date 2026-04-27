"use client";

import { ChevronLeft } from "lucide-react";
import { SidebarHeader } from "./sidebar-header";
import { SidebarPrimaryMenu } from "./sidebar-primary-menu";

export function Sidebar() {
  return (
    <aside
      className="fixed top-0 start-0 bottom-0 d-flex flex-column"
      style={{
        width: 220,
        height: "100vh",
        background: "#0F172A",
        color: "#FFFFFF",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      <SidebarHeader />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: 16,
        }}
      >
        <SidebarPrimaryMenu />
      </div>

      <div
        style={{
          padding: 16,
          borderTop: "1px solid rgba(31,41,55,0.95)",
        }}
      >
        <button
          type="button"
          style={{
            width: "100%",
            height: 36,
            border: 0,
            background: "transparent",
            color: "#9CA3AF",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={18} strokeWidth={2} />
          <span>Свернуть меню</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;