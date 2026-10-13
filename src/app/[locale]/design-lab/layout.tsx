import { notFound } from "next/navigation";

// The design-lab actions use Node fs and child_process, which Workers lacks even with
// nodejs_compat. This NODE_ENV guard is the only thing keeping them out of production.
// See ./README.md.
export default function DesignLabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <>{children}</>;
}
