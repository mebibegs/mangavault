"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't already consented
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 animate-fade-in-up">
      <div className="max-w-2xl mx-auto bg-bg-secondary border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary font-medium mb-1">
            🍪 Cookie Notice
          </p>
          <p className="text-xs text-text-secondary leading-relaxed">
            We use essential cookies to ensure the site works properly (e.g. age
            verification). No tracking or analytics cookies are set without your
            consent. See our{" "}
            <a
              href="/privacy"
              className="text-white underline hover:text-gray-300"
            >
              Privacy Policy
            </a>{" "}
            for details.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={decline}
            className="px-4 py-2 text-xs text-text-secondary bg-bg-card border border-border-subtle rounded-xl hover:bg-bg-hover transition-colors cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-xs text-black bg-white font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
