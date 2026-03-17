"use client";

import { useInstallPrompt } from "@/app/_hooks/use-install-prompt";

export default function InstallPrompt() {
  const { supported, promptInstall, dismiss } = useInstallPrompt();

  if (!supported) {
    return null;
  }

  return (
    <div className="install-banner">
      <div>
        <p className="install-banner-title">Install StudyApp</p>
        <p className="install-banner-subtitle">
          Keep your planner in a dedicated shell and launch it from the home screen.
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
