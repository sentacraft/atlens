import CompareBar from "@/components/CompareBar";

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <CompareBar />
    </>
  );
}
