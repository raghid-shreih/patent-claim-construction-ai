import { BRAND_BLUE, MARK_PATHS, MARK_VIEWBOX } from "./mark-geometry";

export interface NuvoPatentsMarkProps {
  size?: number;
  color?: string;
  className?: string;
}

/** Decorative beside real brand text; the containing text supplies its accessible name. */
export function NuvoPatentsMark({ size = 28, color = BRAND_BLUE, className }: NuvoPatentsMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      fill={color}
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      {MARK_PATHS.map(path => <path key={path.name} d={path.outline} />)}
    </svg>
  );
}
