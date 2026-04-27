"use client";

import Link from "next/link";

export function SidebarHeader() {
  return (
    <div
      style={{
        padding: "24px 24px 20px",
      }}
    >
      <Link
        href="/layout-20"
        style={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: "28px",
          }}
        >
          JETKIZ
        </span>
      </Link>
    </div>
  );
}

export default SidebarHeader;