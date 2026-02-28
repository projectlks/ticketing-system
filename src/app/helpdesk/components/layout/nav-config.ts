export type NavHref = {
  pathname: string;
  query?: Record<string, string>;
};

export type NavItem = {
  key: string;
  label: string;
  href: NavHref;
};

export type NavSection = {
  key: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
};

// Section + item key တွေကို explicit ထားထားလို့
// active state decision မှာ label collision မဖြစ်ဘဲ deterministic ဖြစ်နေပါမယ်။
export const navSections: NavSection[] = [
  {
    key: "general",
    label: "General",
    items: [{ key: "overview", label: "Overview", href: { pathname: "/helpdesk" } }],
  },
  {
    key: "tickets",
    label: "Tickets",
    items: [
      {
        key: "my-tickets",
        label: "My Tickets",
        href: {
          pathname: "/helpdesk/tickets",
          query: { ownership: "My Tickets" },
        },
      },
      { key: "all-tickets", label: "All Tickets", href: { pathname: "/helpdesk/tickets" } },
    ],
  },
  {
    key: "alerts",
    label: "Alerts",
    items: [
      // { key: "current-alerts", label: "Current Alerts", href: { pathname: "/helpdesk/alerts" } },
      // {
      //   key: "all-alerts",
      //   label: "All Alerts",
      //   href: { pathname: "/helpdesk/alerts", query: { filter: "All Alerts" } },
      // },
      {
        key: "Alerts",
        label: "Alerts",
        href: { pathname: "/helpdesk/alerts", query: { filter: "All Alerts" } },
      },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    items: [{ key: "reporting", label: "Reporting", href: { pathname: "/helpdesk/analysis" } }],
  },
  {
    key: "configuration",
    label: "Configuration",
    adminOnly: true,
    items: [
      { key: "departments", label: "Departments", href: { pathname: "/helpdesk/department" } },
      { key: "categories", label: "Categories", href: { pathname: "/helpdesk/category" } },
      { key: "users", label: "Users", href: { pathname: "/helpdesk/user" } },
    ],
  },
];
