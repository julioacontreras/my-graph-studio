import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/** Tema del editor a partir de los tokens de MyGraph (tokens.css). */
const colors = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  line: "var(--color-line)",
  fg: "var(--color-fg)",
  muted: "var(--color-muted)",
  link: "var(--color-link)",
  primary: "var(--color-primary)",
  violet: "#a970ff", // violeta aclarado para texto pequeño sobre fondo oscuro
  ok: "var(--color-ok)",
  warn: "var(--color-warn)",
  danger: "var(--color-danger)",
};

export const cypherTheme = [
  EditorView.theme(
    {
      "&": { backgroundColor: colors.bg, color: colors.fg, height: "100%", fontSize: "13px" },
      ".cm-content": { fontFamily: "var(--font-mono)", caretColor: colors.fg, padding: "10px 0" },
      ".cm-gutters": { backgroundColor: colors.bg, color: colors.muted, border: "none" },
      ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "rgba(30, 41, 59, 0.5)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "rgba(0, 108, 252, 0.35)",
      },
      ".cm-cursor": { borderLeftColor: colors.fg },
      ".cm-error-line": { backgroundColor: "rgba(248, 113, 113, 0.12)" },
      ".cm-error-mark": { textDecoration: `underline wavy ${colors.danger}`, textUnderlineOffset: "3px" },
    },
    { dark: true },
  ),
  syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: colors.link, fontWeight: "600" },
      { tag: [t.string, t.special(t.string)], color: colors.ok },
      { tag: t.number, color: colors.warn },
      { tag: [t.variableName, t.propertyName], color: colors.fg },
      { tag: [t.typeName, t.className, t.labelName], color: colors.violet },
      { tag: t.function(t.variableName), color: colors.link },
      { tag: t.comment, color: colors.muted, fontStyle: "italic" },
      { tag: t.operator, color: colors.muted },
      { tag: t.atom, color: colors.warn },
    ]),
  ),
];
