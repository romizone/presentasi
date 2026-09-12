import type { ReactNode } from "react";
import "@/app/deck.css";

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: "100%", overflow: "auto", background: "#f4f6f8" }}>
      {children}
    </div>
  );
}
