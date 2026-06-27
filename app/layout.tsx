import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "RapidRounds",
  description: "Rapid-fire retrieval trainer for USMLE Shelf and Step 2 CK."
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/analytics", label: "Analytics" }
];

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5">
          <header className="global-header flex h-16 items-center justify-between border-b border-black">
            <Link href="/" className="text-base font-semibold tracking-normal">
              RapidRounds
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="app-main flex-1 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
