import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import type { ModuleId } from "./components/layout/Sidebar";
import { CypherPage } from "./features/cypher/CypherPage";
import { LabelDesignerPage } from "./features/labels/LabelDesignerPage";
import { TransferPage } from "./features/transfer/TransferPage";
import { LabelsProvider } from "./state/LabelsContext";
import { SessionProvider } from "./state/SessionContext";

export default function App() {
  const [module, setModule] = useState<ModuleId>("cypher");
  return (
    <SessionProvider>
      <LabelsProvider>
        <AppShell active={module} onChange={setModule}>
          {/* Los módulos se ocultan en vez de desmontarse: el resultado de la consulta se conserva. */}
          <div className={module === "cypher" ? "h-full" : "hidden"}>
            <CypherPage />
          </div>
          <div className={module === "labels" ? "h-full" : "hidden"}>
            <LabelDesignerPage />
          </div>
          <div className={module === "transfer" ? "h-full" : "hidden"}>
            <TransferPage />
          </div>
        </AppShell>
      </LabelsProvider>
    </SessionProvider>
  );
}
