"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MENU_SIDEBAR_MAIN } from "@/config/layout-20.config";
import { getSession } from "@/lib/auth";

type AdminLike = {
  isSuperAdmin?: boolean;
  role?: string;
  roleCode?: string;
  primaryRole?: string;
  primaryRoleCode?: string;
  roleCodes?: string[];
  activeRoleCodes?: string[];
  roles?: unknown[];
  permissionCodes?: string[];
  permissions?: unknown[];
} | null;

const EXACT_PATHS = new Set([
  "/layout-20",
  "/layout-20/couriers",
]);

function isActivePath(pathname: string, path?: string) {
  if (!path) return false;

  if (EXACT_PATHS.has(path)) {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

function list(value: unknown): string[] {
  if (typeof value === "string") {
    return value ? [value] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return record.code ?? record.name ?? "";
      }
      return item;
    })
    .map(String)
    .filter(Boolean);
}

function hasPermission(admin: AdminLike, permission: string): boolean {
  const roles = [
    ...list(admin?.role),
    ...list(admin?.roleCode),
    ...list(admin?.primaryRole),
    ...list(admin?.primaryRoleCode),
    ...list(admin?.roleCodes),
    ...list(admin?.activeRoleCodes),
    ...list(admin?.roles),
  ];
  const permissions = [
    ...list(admin?.permissionCodes),
    ...list(admin?.permissions),
  ];

  return (
    admin?.isSuperAdmin === true ||
    roles.includes("SUPER_ADMIN") ||
    permissions.includes("admin.full_access") ||
    permissions.includes(permission)
  );
}

export function SidebarPrimaryMenu() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminLike>(null);

  useEffect(() => {
    void getSession().then((session) => setAdmin(session.admin));
  }, []);

  const sections = useMemo(
    () =>
      MENU_SIDEBAR_MAIN.map((section) => ({
        ...section,
        children: section.children?.filter(
          (item) => !item.permission || hasPermission(admin, item.permission),
        ),
      })).filter((section) => !section.children || section.children.length > 0),
    [admin],
  );

  return (
    <nav
      style={{
        flex: 1,
        padding: "0 12px",
      }}
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={`${section.title ?? "main"}-${sectionIndex}`}
          style={{
            marginBottom: 24,
          }}
        >
          {section.title && (
            <div
              style={{
                padding: "0 12px",
                marginBottom: 8,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#94A3B8",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  lineHeight: "16px",
                }}
              >
                {section.title}
              </p>
            </div>
          )}

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {section.children?.map((item, itemIndex) => {
              const active = isActivePath(pathname, item.path);
              const Icon = item.icon;

              return (
                <li key={`${item.title}-${itemIndex}`}>
                  <Link
                    href={item.path || "#"}
                    style={{
                      width: "100%",
                      minHeight: 40,
                      padding: "10px 12px",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textDecoration: "none",
                      color: active ? "#FFFFFF" : "#D1D5DB",
                      background: active ? "#6366F1" : "transparent",
                      boxShadow: active
                        ? "0 10px 18px rgba(99,102,241,0.24)"
                        : "none",
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      lineHeight: "20px",
                      transition:
                        "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
                    }}
                    onMouseEnter={(event) => {
                      if (!active) {
                        event.currentTarget.style.background = "#1F2937";
                        event.currentTarget.style.color = "#FFFFFF";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!active) {
                        event.currentTarget.style.background = "transparent";
                        event.currentTarget.style.color = "#D1D5DB";
                      }
                    }}
                  >
                    {Icon && (
                      <Icon
                        size={18}
                        strokeWidth={2}
                        style={{
                          flexShrink: 0,
                          color: active ? "#FFFFFF" : "currentColor",
                        }}
                      />
                    )}

                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
