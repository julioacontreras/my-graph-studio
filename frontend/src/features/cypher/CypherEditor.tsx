import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { StreamLanguage } from "@codemirror/language";
import { cypher } from "@codemirror/legacy-modes/mode/cypher";
import { EditorState, StateEffect, StateField, type Range } from "@codemirror/state";
import { Decoration, EditorView, keymap, lineNumbers, highlightActiveLine, type DecorationSet } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { cypherTheme } from "./cypherTheme";

export interface EditorError {
  line: number;
  column: number;
}

const setError = StateEffect.define<EditorError | null>();

/** Marca la posición `line`/`column` que devuelve MyGraph en los errores `Syntax`. */
const errorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(setError)) continue;
      if (!e.value) return Decoration.none;
      const doc = tr.state.doc;
      const line = doc.line(Math.min(Math.max(e.value.line, 1), doc.lines));
      const from = Math.min(line.from + Math.max(e.value.column - 1, 0), line.to);
      const ranges: Range<Decoration>[] = [Decoration.line({ class: "cm-error-line" }).range(line.from)];
      if (from < line.to) ranges.push(Decoration.mark({ class: "cm-error-mark" }).range(from, Math.min(from + 1, line.to)));
      deco = Decoration.set(ranges, true);
    }
    if (tr.docChanged) return Decoration.none; // el error deja de ser válido al editar
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function CypherEditor({
  value,
  onChange,
  onRun,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onRun: () => void;
  error: EditorError | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun });
  callbacks.current = { onChange, onRun };

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          StreamLanguage.define(cypher),
          errorField,
          cypherTheme,
          keymap.of([
            { key: "Mod-Enter", run: () => (callbacks.current.onRun(), true) },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) callbacks.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => v.destroy();
    // El editor se crea una vez; `value` solo es el contenido inicial.
  }, []);

  // Contenido cambiado desde fuera (p. ej. un ejemplo).
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: setError.of(error) });
  }, [error]);

  return <div ref={host} className="h-full overflow-auto" />;
}
