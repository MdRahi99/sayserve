import { TAG_LABELS, TAG_STYLES } from "@/lib/format";

export function Tag({ name }: { name: string }) {
  const label = TAG_LABELS[name];
  if (!label) return null;
  return <span className={`tag ${TAG_STYLES[name] ?? "bg-surface text-ink-soft"}`}>{label}</span>;
}
