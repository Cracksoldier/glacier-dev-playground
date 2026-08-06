import type { ReactNode, SVGProps } from "react";

export interface IconProps {
  size?: number;
  className?: string;
}

interface IconBaseProps extends IconProps {
  children: ReactNode;
}

function IconBase({
  size = 18,
  className,
  children,
  ...rest
}: IconBaseProps & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ProjectSwitcherIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="15" width="7" height="7" rx="1.5" />
      <rect x="14" y="15" width="7" height="7" rx="1.5" />
    </IconBase>
  );
}

export function NewProjectIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 9v6M9 12h6" />
    </IconBase>
  );
}

export function RunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4l14 8-14 8V4z" />
    </IconBase>
  );
}

export function AutoRunIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </IconBase>
  );
}

export function SaveStatusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12l5 5L20 6" />
    </IconBase>
  );
}

export function ResourcesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </IconBase>
  );
}

export function ImportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </IconBase>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M4 19h16" />
    </IconBase>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4v6h6" />
      <path d="M4.5 13a8 8 0 1 0 2.2-6.6L4 10" />
    </IconBase>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4M12 17.5v.01" />
    </IconBase>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 6l6 6-6 6" />
    </IconBase>
  );
}
