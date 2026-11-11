import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getViolations } from "../../api/labels";
import { Button } from "../../components/Button";
import { ErrorBox } from "../../components/ErrorBox";
import { useSession } from "../../state/SessionContext";
import type { Violation } from "../../types/labels";

/** "Comprobar datos": nodos que no cumplen la definición (escritos por CLI, Python, …). */
export function ViolationsPanel({ label }: { label: string }) {
  const { scope } = useSession();
  const [violations, setViolations] = useState<Violation[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setViolations(null), [label, scope]);

  async function check() {
    setLoading(true);
    try {
      setViolations(await getViolations(scope, label));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Comprobar datos</h3>
        <Button onClick={() => void check()} disabled={loading}>
          <ShieldCheck size={14} /> {loading ? "Comprobando…" : "Comprobar"}
        </Button>
      </div>
      <ErrorBox error={error} />
      {violations && violations.length === 0 && <p className="text-sm text-ok">Todos los nodos cumplen la definición.</p>}
      {violations && violations.length > 0 && (
        <>
          <p className="text-sm text-warn">{violations.length} incumplimientos.</p>
          <ul className="max-h-64 space-y-1 overflow-auto font-mono text-xs">
            {violations.map((v, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-14 text-muted">#{v.node_id}</span>
                <span className="w-16 text-danger">{v.rule}</span>
                <span>{v.message}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
