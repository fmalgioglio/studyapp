"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type PlannerLink = {
  href: string;
  label: string;
};

export function PlannerTabsNav({ links }: { links: readonly PlannerLink[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Planner sections"
      className="flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1"
    >
      {links.map((item) => {
        const isActive =
          item.href === "/planner"
            ? pathname === "/planner"
            : pathname?.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`planner-tab-link ${isActive ? "planner-tab-link-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
