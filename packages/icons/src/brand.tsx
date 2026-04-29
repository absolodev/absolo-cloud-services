import type { SVGProps } from 'react';

/**
 * Absolo wordmark + monogram. Placeholder geometry — designer to refine in Phase 0.
 * Plan reference: ../../docs/plans/04-design-system-d1e00e.md
 */
export function AbsoloMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      aria-label="Absolo"
      role="img"
      {...props}
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="currentColor" opacity="0.12" />
      <path
        d="M10 22 L16 8 L22 22 M12.5 17 H19.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AbsoloWordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 140 32"
      width="140"
      height="32"
      fill="none"
      aria-label="Absolo Cloud"
      role="img"
      {...props}
    >
      <rect x="0" y="0" width="32" height="32" rx="8" fill="currentColor" opacity="0.12" />
      <path
        d="M8 22 L14 8 L20 22 M10.5 17 H17.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="40"
        y="22"
        fill="currentColor"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="16"
        fontWeight="600"
        letterSpacing="-0.01em"
      >
        Absolo
      </text>
    </svg>
  );
}
