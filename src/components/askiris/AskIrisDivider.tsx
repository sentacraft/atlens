// A faint separator marking a context boundary in the thread (e.g. a mount
// switch). It's a visual cue only: the scrollback above stays readable, but the
// model's context resets here — messages above are no longer sent to Iris.
export default function AskIrisDivider({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex select-none items-center gap-3 py-1">
      <span className="bg-border/70 h-px flex-1" />
      <span className="text-muted-foreground/70 text-xs">{label}</span>
      <span className="bg-border/70 h-px flex-1" />
    </div>
  );
}
