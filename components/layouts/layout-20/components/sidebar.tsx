"use client";

import { ChevronLeft } from "lucide-react";
import { SidebarHeader } from "./sidebar-header";
import { SidebarPrimaryMenu } from "./sidebar-primary-menu";

export function Sidebar() {
  return (
    <aside
      className="fixed top-0 start-0 bottom-0 d-flex flex-column"
      style={{
        width: 260,
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
          padding: 14,
          borderTop: "1px solid rgba(148,163,184,0.14)",
        }}
      >
        <button
          type="button"
          style={{
            width: "100%",
            height: 36,
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#94A3B8",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 10px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={17} strokeWidth={2} />
          <span>Свернуть меню</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
