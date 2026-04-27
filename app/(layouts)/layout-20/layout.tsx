"use client";

import "@/styles/components/leaflet.css";

import { ReactNode, useEffect, useState } from "react";
import { Layout20 } from "@/components/layouts/layout-20";
import { ScreenLoader } from "@/components/screen-loader";

export default function Layout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          window.location.replace("/login");
          return;
        }

        const data = (await response.json().catch(() => null)) as
          | { authenticated?: boolean }
          | null;

        if (!data?.authenticated) {
          window.location.replace("/login");
          return;
        }

        if (alive) {
          setReady(true);
        }
      } catch {
        window.location.replace("/login");
      }
    };

    void checkSession();

    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return <ScreenLoader />;
  }

  return <Layout20>{children}</Layout20>;
}