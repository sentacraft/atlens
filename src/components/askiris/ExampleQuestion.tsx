// A word joiner after a hyphen between digits: browsers may break a line after any hyphen, which
// split "XF 18-55mm" into "XF 18-" and "55mm".
const keepRangesTogether = (text: string) => text.replace(/(\d)-(?=\d)/g, "$1-⁠");

/** A suggested question someone can pick instead of typing. */
export default function ExampleQuestion({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      // A radius of half one line's height, not rounded-full: a pill on one line, and a question
      // that wraps becomes a rounded box rather than a stretched oval.
      className="border-border hover:bg-muted flex items-center gap-1.5 rounded-[19px] border bg-background px-4 py-2 text-sm text-balance transition-colors disabled:opacity-50"
    >
      {keepRangesTogether(children)}
    </button>
  );
}
