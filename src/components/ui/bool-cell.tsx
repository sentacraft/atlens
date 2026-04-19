interface BoolCellProps {
  value: boolean | "partial" | undefined;
  yes: string;
  no: string;
  unknown: string;
  partial?: string;
}

export function BoolCell({ value, yes, no, unknown, partial }: BoolCellProps) {
  if (value === undefined) {
    return <>{unknown}</>;
  }
  if (value === "partial") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500" />
        {partial ?? "Partial"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          value ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      />
      {value ? yes : no}
    </span>
  );
}
