"use client";

import { useCallback, useEffect, useState } from "react";

const INSTALL_PROMPT_DISMISSED_KEY = "studyapp_install_prompt_dismissed_v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<PromptResponse>;
  userChoice: Promise<PromptResponse>;
};

type PromptResponse = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [supported, setSupported] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      if (dismissed) {
        return;
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setSupported(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [dismissed]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      return choice.outcome === "accepted";
    } finally {
      setDeferredPrompt(null);
      setSupported(false);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, "true");
    } catch {
      // no-op
    }
    setDismissed(true);
    setDeferredPrompt(null);
    setSupported(false);
  }, []);

  return {
    supported: supported && !dismissed,
    promptInstall,
    dismiss,
  };
}
