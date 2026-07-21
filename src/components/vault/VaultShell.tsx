import type { ReactNode } from "react";
import VaultFX from "./VaultFX";
import TopBar from "./TopBar";
import VaultFooter from "./VaultFooter";

/** Standard page chrome: FX layers + fixed header + content + giant footer. */
export default function VaultShell({ children }: { children: ReactNode }) {
  return (
    <>
      <VaultFX />
      <TopBar />
      <div className="vault-content">
        {children}
        <VaultFooter />
      </div>
    </>
  );
}
