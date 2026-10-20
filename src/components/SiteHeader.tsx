"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/posts", label: "여행 정보" },
  { href: "/survey", label: "경험 조사" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-page">
      <div className="mx-auto flex h-14 w-full max-w-[42rem] items-center justify-between px-6">
        <Link href="/" className="font-semibold tracking-[-0.01em]">
          일본 여행
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={active ? "text-accent" : "text-body"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
