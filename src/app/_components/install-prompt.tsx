"use client";

import { usePathname } from "next/navigation";

import { useInstallPrompt } from "@/app/_hooks/use-install-prompt";

export default function InstallPrompt() {
  const { supported, promptInstall, dismiss } = useInstallPrompt();
  const pathname = usePathname();

  const shouldRender =
    supported && (pathname === "/" || pathname === "/planner");

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="install-banner">
      <div>
        <p className="install-banner-title">Install StudyApp</p>
        <p className="install-banner-subtitle">
          Save the planner on your home screen and reopen it faster.
        </p>
      </div>
      <div className="install-banner-actions">
        <button
          type="button"
          className="install-banner-btn install-banner-btn-primary"
          onClick={() => {
            void promptInstall();
          }}
        >
          Install
        </button>
        <button
          type="button"
          className="install-banner-btn install-banner-btn-ghost"
          onClick={dismiss}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
