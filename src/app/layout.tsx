// A pass-through: reading request context here would make every route dynamic.
// https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-rendering
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
