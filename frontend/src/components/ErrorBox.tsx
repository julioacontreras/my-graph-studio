import { ApiError } from "../types/errors";

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as Error;
  const code = error instanceof ApiError ? error.code : "Error";
  const where = error instanceof ApiError && error.line ? ` (línea ${error.line}, columna ${error.column})` : "";
  return (
    <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
      <span className="font-mono font-semibold">{code}</span>
      {where}: {e.message}
      {error instanceof ApiError && error.details && error.details.length > 1 && (
        <ul className="mt-1 list-disc pl-5">
          {error.details.map((d, i) => (
            <li key={i}>{d.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
