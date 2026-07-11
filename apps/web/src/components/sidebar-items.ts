/**
 * Design ProMax — Application/sidebars (19)__sidebar-items
 * Argue nav sections
 */

import type { SidebarItem } from "./sidebar";

export const appSidebarItems: SidebarItem[] = [
  {
    key: "overview",
    title: "Overview",
    items: [
      {
        key: "dashboard",
        href: "/dashboard",
        icon: "solar:home-angle-linear",
        title: "Dashboard",
      },
      {
        key: "markets",
        href: "/markets",
        icon: "solar:chart-2-linear",
        title: "Markets",
      },
      {
        key: "rooms",
        href: "/rooms",
        icon: "solar:users-group-rounded-linear",
        title: "Arenas",
      },
      {
        key: "agents",
        href: "/agents",
        icon: "solar:user-rounded-linear",
        title: "Characters",
      },
      {
        key: "create",
        href: "/create",
        icon: "solar:add-circle-linear",
        title: "Create",
      },
    ],
  },
];

export default appSidebarItems;
