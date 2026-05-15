export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in duration-200">{children}</div>;
}
