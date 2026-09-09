import type { SVGProps } from "react";
import type { StorefrontBenefitIcon as StorefrontBenefitIconKey } from "../types";

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

export const HeartIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <svg {...iconProps} {...props} fill={filled ? "currentColor" : "none"}>
    <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  </svg>
);

export const HomeIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h14V10M9 20v-6h6v6" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const SlidersIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6" />
  </svg>
);

export const ShareIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" />
    <path d="m8 11 8-5M8 13l8 5" />
  </svg>
);

export const GlassesIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="7" cy="13" r="3.5" />
    <circle cx="17" cy="13" r="3.5" />
    <path d="M10.5 13h3M3.5 12 5 7h3M20.5 12 19 7h-3" />
  </svg>
);

export const WatchIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M9 2h6l1 5H8zM8 17h8l-1 5H9z" />
    <circle cx="12" cy="12" r="6" />
    <path d="M12 9v3l2 1" />
  </svg>
);

export const PenIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10zM13.5 8.5l3 3M4 20l2.5-4" />
  </svg>
);

export const AwardIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="8" r="5" />
    <path d="m8.7 12.1-1 8 4.3-2.6 4.3 2.6-1-8" />
  </svg>
);

export const TruckIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M3 6h11v11H3V6Zm11 4h4l3 3v4h-7v-7Z" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);

export const SparkleIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM18.5 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
  </svg>
);

export const GlobeIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.5 3.7 5.5 3.7 9S14.5 18.5 12 21c-2.5-2.5-3.7-5.5-3.7-9S9.5 5.5 12 3Z" />
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const HeadsetIcon = (props: IconProps) => (
  <svg {...iconProps} {...props}>
    <path d="M4 13v-2a8 8 0 0 1 16 0v2M4 13h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5ZM17 19c0 1.1-.9 2-2 2h-3" />
  </svg>
);

export const StorefrontBenefitIcon = ({
  icon,
  ...props
}: IconProps & { icon: StorefrontBenefitIconKey }) => {
  switch (icon) {
    case "shield": return <ShieldCheckIcon {...props} />;
    case "truck": return <TruckIcon {...props} />;
    case "package": return <PackageIcon {...props} />;
    case "check": return <CheckIcon {...props} />;
    case "heart": return <HeartIcon {...props} />;
    case "globe": return <GlobeIcon {...props} />;
    case "clock": return <ClockIcon {...props} />;
    case "headset": return <HeadsetIcon {...props} />;
    case "sparkle": return <SparkleIcon {...props} />;
    default: return <AwardIcon {...props} />;
  }
};
