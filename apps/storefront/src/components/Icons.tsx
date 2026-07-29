import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  focusable: false,
};

export const SearchIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const ArrowLeftIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M19 12H5m6-6-6 6 6 6" />
  </svg>
);

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m10 6 6 6-6 6" />
  </svg>
);

export const RetryIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M20 7v5h-5" />
    <path d="M18.5 16a8 8 0 1 1 .8-7.6L20 12" />
  </svg>
);

export const PackageIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m4 7.5 8-4.5 8 4.5v9L12 21l-8-4.5z" />
    <path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21" />
  </svg>
);

export const BrokenLinkIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m9.5 14.5-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" />
    <path d="m14.5 9.5 1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" />
    <path d="M9 15 15 9M4 4l16 16" />
  </svg>
);

export const CartIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M4 5h2l1.5 9h9.8l1.7-6H7" />
    <circle cx="10" cy="19" r="1.25" />
    <circle cx="17" cy="19" r="1.25" />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
  </svg>
);

export const ShieldCheckIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m5 12 4 4L19 6" />
  </svg>
);
