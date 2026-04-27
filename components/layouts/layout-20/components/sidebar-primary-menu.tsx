"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_SIDEBAR_MAIN } from "@/config/layout-20.config";

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

export function SidebarPrimaryMenu() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        flex: 1,
        padding: "0 12px",
      }}
    >
      {MENU_SIDEBAR_MAIN.map((section, sectionIndex) => (
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