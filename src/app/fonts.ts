import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";

const sourceSerif4 = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2",
      style: "italic",
    },
  ],
  variable: "--font-source-serif-4",
});

export const fontClassName = `${GeistSans.variable} ${GeistMono.variable} ${sourceSerif4.variable} font-sans antialiased`;
