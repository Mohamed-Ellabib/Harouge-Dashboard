export type AdminDirectoryStatus = "Active" | "Trial" | "Pending" | "Suspended" | "Past Due"

export type AdminDemoStore = {
  id: string
  name: string
  owner: string
  domain: string
  plan: "Starter" | "Growth" | "Pro"
  status: AdminDirectoryStatus
  gmv: string
  tone: "blue" | "cyan" | "orange" | "purple" | "red"
}

export type AdminDemoVendor = {
  id: string
  name: string
  email: string
  store: string
  role: "Owner" | "Manager" | "Staff"
  plan: "Starter" | "Growth" | "Pro"
  status: AdminDirectoryStatus
  joined: string
  avatar: string
}

export type AdminTemplateStatus = "Published" | "Draft" | "Archived"

export type AdminDemoTemplate = {
  id: string
  name: string
  category: string
  stores: number | null
  status: AdminTemplateStatus
  version: string
  image: string
  description: string
  updated: string
  updatedBy: string
}

export type AdminAuditEvent = {
  id: string
  event: string
  actor: string
  actorType: "admin" | "vendor" | "system" | "unknown"
  device: string
  time: string
  result: "Success" | "Verified" | "Blocked"
  icon: "access" | "lock" | "session" | "key" | "failed"
}

export const adminDemoStores: AdminDemoStore[] = [
  {
    id: "demo-store-sanousi",
    name: "Al–Sanousi & Sons",
    owner: "Ahmed Sanousi",
    domain: "alsanousi.ly",
    plan: "Growth",
    status: "Active",
    gmv: "$18,450",
    tone: "blue",
  },
  {
    id: "demo-store-homenest",
    name: "HomeNest Libya",
    owner: "Sara Omar",
    domain: "homenest.ly",
    plan: "Pro",
    status: "Active",
    gmv: "$12,980",
    tone: "cyan",
  },
  {
    id: "demo-store-fikr",
    name: "Al-Fikr Market",
    owner: "Khaled Ali",
    domain: "alfikr.store",
    plan: "Starter",
    status: "Trial",
    gmv: "$7,240",
    tone: "orange",
  },
  {
    id: "demo-store-noor",
    name: "Noor Boutique",
    owner: "Mariam Salem",
    domain: "noor.shop",
    plan: "Growth",
    status: "Active",
    gmv: "$9,860",
    tone: "purple",
  },
  {
    id: "demo-store-tripoli",
    name: "Tripoli Tech",
    owner: "Omar Faraj",
    domain: "tripolitech.ly",
    plan: "Pro",
    status: "Past Due",
    gmv: "$6,310",
    tone: "red",
  },
]

export const adminDemoVendors: AdminDemoVendor[] = [
  {
    id: "demo-vendor-ahmed",
    name: "Ahmed Sanousi",
    email: "ahmed@alsanousi.ly",
    store: "Al–Sanousi & Sons",
    role: "Owner",
    plan: "Growth",
    status: "Active",
    joined: "12 Jan 2026",
    avatar: "/assets/admin/vendors/ahmed-sanousi.png",
  },
  {
    id: "demo-vendor-sara",
    name: "Sara Omar",
    email: "sara@homenest.ly",
    store: "HomeNest Libya",
    role: "Owner",
    plan: "Pro",
    status: "Active",
    joined: "03 Feb 2026",
    avatar: "/assets/admin/vendors/sara-omar.png",
  },
  {
    id: "demo-vendor-khaled",
    name: "Khaled Ali",
    email: "khaled@alfikr.store",
    store: "Al-Fikr Market",
    role: "Owner",
    plan: "Starter",
    status: "Pending",
    joined: "18 Jun 2026",
    avatar: "/assets/admin/vendors/khaled-ali.png",
  },
  {
    id: "demo-vendor-mariam",
    name: "Mariam Salem",
    email: "mariam@noor.shop",
    store: "Noor Boutique",
    role: "Manager",
    plan: "Growth",
    status: "Active",
    joined: "24 Mar 2026",
    avatar: "/assets/admin/vendors/mariam-salem.png",
  },
  {
    id: "demo-vendor-omar",
    name: "Omar Faraj",
    email: "omar@tripolitech.ly",
    store: "Tripoli Tech",
    role: "Owner",
    plan: "Pro",
    status: "Suspended",
    joined: "09 Apr 2026",
    avatar: "/assets/admin/vendors/omar-faraj.png",
  },
]

export const adminDemoTemplates: AdminDemoTemplate[] = [
  {
    id: "luxe-commerce",
    name: "Luxe Commerce",
    category: "Luxury",
    stores: 14,
    status: "Published",
    version: "v2.4",
    image: "/assets/admin/templates/luxe-commerce.png",
    description: "Premium editorial storefront for watches, jewelry and luxury brands.",
    updated: "2 hours ago",
    updatedBy: "Mohamed",
  },
  {
    id: "luxe-commerce-full",
    name: "Luxe Commerce — Full Source",
    category: "Luxury / Full source",
    stores: 0,
    status: "Draft",
    version: "v1.0",
    image: "/assets/admin/templates/luxe-commerce-full.png",
    description: "Complete Al-Sanousi customer frontend preserved as a reusable template.",
    updated: "Just now",
    updatedBy: "Mohamed",
  },
  {
    id: "modern-market",
    name: "Modern Market",
    category: "Retail",
    stores: 18,
    status: "Published",
    version: "v3.1",
    image: "/assets/admin/templates/modern-market.png",
    description: "Bright modular commerce layout for modern multi-category retailers.",
    updated: "Yesterday",
    updatedBy: "Mohamed",
  },
  {
    id: "home-living",
    name: "Home & Living",
    category: "Home",
    stores: 9,
    status: "Published",
    version: "v1.8",
    image: "/assets/admin/templates/home-living.png",
    description: "Warm editorial layout for furniture, décor and home collections.",
    updated: "3 days ago",
    updatedBy: "Sara",
  },
  {
    id: "nova-essentials",
    name: "Nova Essentials",
    category: "Fashion",
    stores: null,
    status: "Draft",
    version: "v0.7",
    image: "/assets/admin/templates/nova-essentials.png",
    description: "Minimal fashion storefront with editorial storytelling and bold type.",
    updated: "1 week ago",
    updatedBy: "Mohamed",
  },
]

export const adminDemoAuditEvents: AdminAuditEvent[] = [
  {
    id: "audit-1",
    event: "Store access updated",
    actor: "Mohamed Ellabib",
    actorType: "admin",
    device: "197.13.44.82 · Chrome",
    time: "Today, 10:42",
    result: "Success",
    icon: "access",
  },
  {
    id: "audit-2",
    event: "Vendor account suspended",
    actor: "Mohamed Ellabib",
    actorType: "admin",
    device: "197.13.44.82 · Chrome",
    time: "Today, 09:18",
    result: "Success",
    icon: "lock",
  },
  {
    id: "audit-3",
    event: "New admin session",
    actor: "Sara Omar",
    actorType: "vendor",
    device: "41.252.18.76 · Edge",
    time: "Today, 08:57",
    result: "Verified",
    icon: "session",
  },
  {
    id: "audit-4",
    event: "API key rotated",
    actor: "System",
    actorType: "system",
    device: "Internal service",
    time: "Yesterday, 18:24",
    result: "Success",
    icon: "key",
  },
  {
    id: "audit-5",
    event: "Failed login attempt",
    actor: "Unknown user",
    actorType: "unknown",
    device: "102.213.34.91 · Firefox",
    time: "Yesterday, 17:03",
    result: "Blocked",
    icon: "failed",
  },
]
