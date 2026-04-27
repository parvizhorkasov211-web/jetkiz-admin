import { Metadata } from "next";
import { Wrapper } from "./components/wrapper";
import { LayoutProvider } from "./components/context";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "JETKIZ Admin",
    description: "JETKIZ admin dashboard",
  };
}

export function Layout20({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider
      style={
        {
          "--sidebar-width": "220px",
          "--sidebar-collapsed-width": "70px",
          "--sidebar-header-height": "76px",
          "--header-height": "80px",
          "--header-height-mobile": "60px",
          "--toolbar-height": "0px",
        } as React.CSSProperties
      }
    >
      <Wrapper>{children}</Wrapper>
    </LayoutProvider>
  );
}