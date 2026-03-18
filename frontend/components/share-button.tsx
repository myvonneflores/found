"use client";

import { useEffect, useState } from "react";

type ShareButtonProps = {
  buttonClassName?: string;
  feedbackClassName?: string;
  label?: string;
  shareText: string;
  shareTitle: string;
  shareUrl?: string;
  wrapperClassName?: string;
};

export function ShareButton({
  buttonClassName,
  feedbackClassName,
  label = "Share",
  shareText,
  shareTitle,
  shareUrl,
  wrapperClassName,
}: ShareButtonProps) {
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setFeedback(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function handleShare() {
    const url = shareUrl ? new URL(shareUrl, window.location.origin).toString() : window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url });
        setFeedback("Shared");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback("Link copied");
        return;
      }

      throw new Error("Clipboard unavailable");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setFeedback("Unable to share right now");
    }
  }

  return (
    <div className={wrapperClassName}>
      <button className={buttonClassName} onClick={() => void handleShare()} type="button">
        {label}
      </button>
      {feedback ? (
        <p aria-live="polite" className={feedbackClassName} role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
