/** A one-line footnote under a chart page's subtitle, saying what the chart leaves out. */
export default function ScopeNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-zinc-500">* {children}</p>;
}
