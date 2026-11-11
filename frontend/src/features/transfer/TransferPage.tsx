import { ExportPanel } from "./ExportPanel";
import { ImportPanel } from "./ImportPanel";

export function TransferPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-3xl space-y-6">
        <h1 className="text-xl font-semibold">Import / Export</h1>
        <ExportPanel />
        <ImportPanel />
      </div>
    </div>
  );
}
