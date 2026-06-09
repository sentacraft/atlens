// Root layout is intentionally a pass-through. The actual <html>/<body>
// rendering happens in the segment layout below:
//   - app/[locale]/layout.tsx  for all localized routes
//
// Why: reading request context here (cookies, headers, getLocale()) forces
// every descendant route into dynamic rendering, defeating
// generateStaticParams. By keeping this layout pass-through and resolving the
// locale from `params` inside [locale]/layout.tsx, the entire localized tree
// can be statically pre-rendered.
//
// Reference: https://nextjs.org/docs/app/building-your-application/routing/internationalization#static-rendering
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
