import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: { default: "JobsQ – your job search, step by step", template: "%s · JobsQ" },
  description: "JobsQ finds jobs that fit your resume, tailors your resume for each one and helps you get referred. On the web and on WhatsApp.",
};

// Sets the theme before the page paints, so there is no flash: saved choice, else the system setting.
const themeScript = `try{var t=localStorage.getItem('jq-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
