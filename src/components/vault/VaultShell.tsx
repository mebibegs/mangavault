import type { ReactNode } from "react";
import TopBar from "./TopBar";
import VaultFooter from "./VaultFooter";

/** Standard page chrome: fixed header + content + footer. Old WebGL removed. */
export default function VaultShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <div className="vault-content">
        {children}
        <VaultFooter />
      </div>
    </>
  );
}
