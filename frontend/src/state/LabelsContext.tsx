import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { listLabels } from "../api/labels";
import { fallbackColor, UNLABELED } from "../features/labels/palette";
import type { LabelDefinition } from "../types/labels";
import { useSession } from "./SessionContext";

interface Labels {
  definitions: LabelDefinition[];
  byLabel: Map<string, LabelDefinition>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** El color sale de la primera etiqueta que tenga definición. */
  colorFor: (labels: string[]) => string;
}

const LabelsContext = createContext<Labels | null>(null);

export function LabelsProvider({ children }: { children: ReactNode }) {
  const { scope } = useSession();
  const [definitions, setDefinitions] = useState<LabelDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setDefinitions(await listLabels(scope));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Labels>(() => {
    const byLabel = new Map(definitions.map((d) => [d.label, d]));
    const colorFor = (labels: string[]) => {
      for (const l of labels) {
        const d = byLabel.get(l);
        if (d) return d.color;
      }
      return labels.length ? fallbackColor(labels[0]) : UNLABELED;
    };
    return { definitions, byLabel, loading, error, reload, colorFor };
  }, [definitions, loading, error, reload]);

  return <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>;
}

export function useLabels(): Labels {
  const l = useContext(LabelsContext);
  if (!l) throw new Error("useLabels outside LabelsProvider");
  return l;
}
