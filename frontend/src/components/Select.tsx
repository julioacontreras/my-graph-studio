import type { SelectHTMLAttributes } from "react";

export function Select({
  options,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label?: string }[] }) {
  return (
    <select className={`input w-auto ${className}`} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label ?? o.value}
        </option>
      ))}
    </select>
  );
}
