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
        viewBox="0 0 176 176"
        className="scroll-mascot-art"
        focusable="false"
      >
        <defs>
          <linearGradient id="mascot-shell" x1="38" y1="28" x2="132" y2="141">
            <stop stopColor="#FFD17A" />
            <stop offset="0.58" stopColor="#FFB454" />
            <stop offset="1" stopColor="#E57C2D" />
          </linearGradient>
          <linearGradient id="mascot-visor" x1="58" y1="64" x2="120" y2="118">
            <stop stopColor="#1E2949" />
            <stop offset="1" stopColor="#070B18" />
          </linearGradient>
          <filter id="mascot-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="12"
              stdDeviation="8"
              floodColor="#4D270E"
              floodOpacity="0.26"
            />
          </filter>
        </defs>

        <g className="scroll-mascot-orbit">
          <path
            d="M32 123c19 30 73 38 113 5"
            fill="none"
            stroke="#5B7CFA"
            strokeDasharray="3 7"
            strokeLinecap="round"
            strokeOpacity="0.3"
            strokeWidth="2"
          />
          <circle cx="35" cy="126" r="4" fill="#5B7CFA" />
          <circle cx="143" cy="129" r="4" fill="#FFB454" />
        </g>

        <g className="scroll-mascot-body" filter="url(#mascot-shadow)">
          <path
            d="M39 87c0-35 22-58 49-58s49 23 49 58-22 57-49 57-49-22-49-57Z"
            fill="url(#mascot-shell)"
          />
          <path d="M45 88 30 78c-7-5-13 0-12 8l1 9c1 8 9 11 15 6l13-10" fill="#E57C2D" />
          <path d="m131 88 15-10c7-5 13 0 12 8l-1 9c-1 8-9 11-15 6l-13-10" fill="#E57C2D" />
          <path d="M57 69c0-15 13-25 31-25s31 10 31 25v32c0 15-13 25-31 25s-31-10-31-25V69Z" fill="url(#mascot-visor)" />
          <path d="M55 64c11-16 50-18 67 0" fill="none" stroke="#FFE4AB" strokeLinecap="round" strokeOpacity="0.76" strokeWidth="4" />
          <path d="M82 31V17" fill="none" stroke="#1E2949" strokeLinecap="round" strokeWidth="4" />
          <circle cx="82" cy="13" r="6" fill="#5B7CFA" />
          <circle cx="82" cy="13" r="2" fill="#E8EFFF" />
          <circle cx="133" cy="89" r="10" fill="#1E2949" />
          <circle cx="133" cy="89" r="4" fill="#FF6C3C" />
          <path d="M77 139h22" fill="none" stroke="#B95822" strokeLinecap="round" strokeWidth="3" />
          <path d="M84 139h8" fill="none" stroke="#FFE4AB" strokeLinecap="round" strokeWidth="3" />
          <g className="scroll-mascot-eyes">
            <rect x="69" y="76" width="9" height="21" rx="4.5" fill="#FFF7E9" />
            <rect x="98" y="76" width="9" height="21" rx="4.5" fill="#FFF7E9" />
            <path d="M72 81v11M101 81v11" stroke="#FFC566" strokeLinecap="round" strokeWidth="2" />
          </g>
          <g className="scroll-mascot-signal">
            <path d="M117 48c9 4 13 11 13 20" fill="none" stroke="#5B7CFA" strokeLinecap="round" strokeWidth="3" />
            <path d="M127 41c14 7 20 18 19 32" fill="none" stroke="#5B7CFA" strokeLinecap="round" strokeOpacity="0.62" strokeWidth="3" />
          </g>
          <circle className="scroll-mascot-flash" cx="46" cy="61" r="4" fill="#FFF7E9" />
          <circle className="scroll-mascot-flash" cx="126" cy="121" r="3" fill="#5B7CFA" />
        </g>

        <g className="scroll-mascot-spark">
          <path
            d="m150 40 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"
            fill="#FFB454"
          />
        </g>
      </svg>
    </div>
  );
}
