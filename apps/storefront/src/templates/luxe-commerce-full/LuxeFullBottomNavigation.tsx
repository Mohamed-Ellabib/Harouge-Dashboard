import {
  CartIcon,
  HeartIcon,
  HomeIcon,
  PackageIcon,
  SlidersIcon,
  UserIcon,
} from "../../components/Icons";
import { StorefrontLink, useStorefrontLocation } from "../../lib/navigation";
import {
  isStorefrontNavigationActive,
  resolvedStorefrontNavigation,
} from "../../lib/storefront-navigation";
import type {
  StorefrontNavigationKey,
  StorefrontProfileDto,
} from "../../types";

const navigationIcons: Record<
  StorefrontNavigationKey,
  typeof HomeIcon
> = {
  home: HomeIcon,
  categories: PackageIcon,
  favorites: HeartIcon,
  cart: CartIcon,
  account: UserIcon,
  orders: PackageIcon,
  settings: SlidersIcon,
};

export function LuxeFullBottomNavigation({
  className,
  profile,
}: {
  className?: string;
  profile: StorefrontProfileDto;
}) {
  const { pathname } = useStorefrontLocation();
  const items = resolvedStorefrontNavigation(profile);
  const classes = ["customer-bottom-nav", className]
    .filter(Boolean)
    .join(" ");

  return (
    <nav
      className={classes}
      aria-label={profile.locale === "en-LY" ? "Bottom navigation" : "التنقل السفلي"}
    >
      {items.map((item) => {
        const Icon = navigationIcons[item.key];
        return (
          <StorefrontLink
            className={
              isStorefrontNavigationActive(item.key, pathname)
                ? "is-active"
                : undefined
            }
            key={item.key}
            to={item.to}
          >
            <Icon />
            <span data-glow-edit={`navigation.${item.key}`}>{item.label}</span>
          </StorefrontLink>
        );
      })}
    </nav>
  );
}
