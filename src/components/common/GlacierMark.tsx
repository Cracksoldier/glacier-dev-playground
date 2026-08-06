import { useId } from "react";

interface GlacierMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

function GlacierMark({
  size = 24,
  className,
  title = "Glacier",
}: GlacierMarkProps) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="8"
          y1="8"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--glacier-accent-cyan)" />
          <stop offset="1" stopColor="var(--glacier-accent-mint)" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradientId})`}>
        <g>
          <path d="M24 24 L22.7 16 L24 5 L25.3 16 Z" />
          <rect
            x="22.5"
            y="14.5"
            width="3"
            height="3"
            transform="rotate(45 24 16)"
          />
        </g>
        <g transform="rotate(60 24 24)">
          <path d="M24 24 L22.7 16 L24 5 L25.3 16 Z" />
          <rect
            x="22.5"
            y="14.5"
            width="3"
            height="3"
            transform="rotate(45 24 16)"
          />
        </g>
        <g transform="rotate(120 24 24)">
          <path d="M24 24 L22.7 16 L24 5 L25.3 16 Z" />
          <rect
            x="22.5"
            y="14.5"
            width="3"
            height="3"
            transform="rotate(45 24 16)"
          />
        </g>
        <g transform="rotate(180 24 24)">
          <path d="M24 24 L22.7 16 L24 5 L25.3 16 Z" />
          <rect
            x="22.5"
            y="14.5"
            width="3"
            height="3"
            transform="rotate(45 24 16)"
          />
        </g>
        <g transform="rotate(240 24 24)">
          <path d="M24 24 L22.7 16 L24 5 L25.3 16 Z" />
          <rect
            x="22.5"
            y="14.5"
            width="3"
            height="3"
            transform="rotate(45 24 16)"
          />
        </g>
        <g transform="rotate(300 24 24)">
          <path d="M24 24 L22.7 16 L24 5 L25.3 16 Z" />
          <rect
            x="22.5"
            y="14.5"
            width="3"
            height="3"
            transform="rotate(45 24 16)"
          />
        </g>
        <rect x="22" y="22" width="4" height="4" transform="rotate(45 24 24)" />
      </g>
    </svg>
  );
}

export default GlacierMark;
