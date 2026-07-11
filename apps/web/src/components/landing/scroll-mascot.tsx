"use client";

import React from "react";

/**
 * A small, original market scout that reacts to page progress without competing
 * with the landing content. It is decorative, so it stays out of tab order.
 */
export default function ScrollMascot() {
  const mascotRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    const mascot = mascotRef.current;
    if (!mascot || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let frame = 0;
    let lastY = window.scrollY;
    let settleTimer: number | undefined;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const progress = Math.min(1, Math.max(0, y / maxScroll));
      const direction = y >= lastY ? 1 : -1;
      const bob = Math.sin(progress * Math.PI * 7) * 5;

      mascot.style.setProperty("--mascot-progress", progress.toFixed(3));
      mascot.style.setProperty("--mascot-bob", `${bob.toFixed(2)}px`);
      mascot.style.setProperty("--mascot-tilt", `${(direction * 5).toFixed(2)}deg`);
      mascot.style.setProperty("--mascot-gaze-x", `${(direction * 1.7).toFixed(2)}px`);
      mascot.style.setProperty(
        "--mascot-gaze-y",
        `${(progress > 0.76 ? 1.3 : 0).toFixed(2)}px`,
      );
      mascot.dataset.scrolling = "true";
      lastY = y;

      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        mascot.dataset.scrolling = "false";
      }, 150);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="scroll-mascot" aria-hidden>
      <svg
        ref={mascotRef}
        viewBox="0 0 156 188"
        className="scroll-mascot-art"
        focusable="false"
      >
        <defs>
          <linearGradient id="mascot-shell" x1="25" y1="20" x2="130" y2="162">
            <stop stopColor="#84a4ff" />
            <stop offset="1" stopColor="#3859d9" />
          </linearGradient>
          <linearGradient id="mascot-face" x1="50" y1="52" x2="111" y2="126">
            <stop stopColor="#14234f" />
            <stop offset="1" stopColor="#09132c" />
          </linearGradient>
          <filter id="mascot-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="9"
              floodColor="#12204c"
              floodOpacity="0.27"
            />
          </filter>
        </defs>

        <g className="scroll-mascot-orbit">
          <circle cx="78" cy="89" r="70" fill="none" stroke="#5B7CFA" strokeOpacity="0.18" strokeWidth="1.4" />
          <circle cx="26" cy="43" r="4.5" fill="#FFB86C" />
          <circle cx="132" cy="122" r="3.5" fill="#5B7CFA" />
        </g>

        <g className="scroll-mascot-body" filter="url(#mascot-shadow)">
          <path
            d="M38 67C38 39 55 22 78 22s40 17 40 45v51c0 27-16 45-40 45s-40-18-40-45V67Z"
            fill="url(#mascot-shell)"
          />
          <path
            d="M49 73c0-18 12-31 29-31s29 13 29 31v40c0 18-12 31-29 31s-29-13-29-31V73Z"
            fill="url(#mascot-face)"
          />
          <path
            d="M51 52c9-16 45-16 54 0"
            fill="none"
            stroke="#DCE5FF"
            strokeLinecap="round"
            strokeOpacity="0.72"
            strokeWidth="3"
          />
          <g className="scroll-mascot-eyes">
            <circle cx="66" cy="88" r="10" fill="#ECF1FF" />
            <circle cx="90" cy="88" r="10" fill="#ECF1FF" />
            <circle className="scroll-mascot-pupil" cx="66" cy="88" r="4.2" fill="#5B7CFA" />
            <circle className="scroll-mascot-pupil" cx="90" cy="88" r="4.2" fill="#5B7CFA" />
          </g>
          <path
            d="M65 113c8 7 18 7 26 0"
            fill="none"
            stroke="#DCE5FF"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path d="M60 132h36" stroke="#AEC0FF" strokeLinecap="round" strokeWidth="3" />
          <circle cx="78" cy="132" r="4" fill="#FFB86C" />
        </g>

        <g className="scroll-mascot-signal">
          <path d="M121 55c9 7 9 18 0 25" fill="none" stroke="#5B7CFA" strokeLinecap="round" strokeWidth="3" />
          <path d="M130 47c15 12 15 30 0 42" fill="none" stroke="#5B7CFA" strokeLinecap="round" strokeOpacity="0.55" strokeWidth="3" />
        </g>
      </svg>
      <span className="scroll-mascot-caption">Watching the argument</span>
    </div>
  );
}
