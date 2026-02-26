import type { NavHref, NavSection } from "./nav-config";

const isPathMatch = (pathname: string, hrefPathname: string) => {
  // Overview root (/helpdesk) ကို exact match သာခွင့်ပြုထားလို့
  // sub-routes အားလုံးမှာ Overview လည်း active ဖြစ်နေတဲ့ပြဿနာမဖြစ်တော့ပါ။
  if (hrefPathname === "/helpdesk") {
    return pathname === hrefPathname;
  }

  return pathname === hrefPathname || pathname.startsWith(`${hrefPathname}/`);
};

export const getVisibleSections = (
  sections: NavSection[],
  canAccessConfiguration: boolean,
) =>
  sections.filter((section) => !section.adminOnly || canAccessConfiguration);

export const getActiveNavItemKey = (
  pathname: string,
  searchParams: URLSearchParams,
  sections: NavSection[],
) => {
  let bestMatch: { key: string; score: number } | null = null;

  for (const section of sections) {
    for (const item of section.items) {
      const hrefPath = item.href.pathname;
      if (!isPathMatch(pathname, hrefPath)) {
        continue;
      }

      const queryEntries = Object.entries(item.href.query ?? {});
      const queryMatches = queryEntries.every(
        ([key, value]) => searchParams.get(key) === value,
      );

      if (!queryMatches) {
        continue;
      }

      // Path length + query specificity ကို score ထဲထည့်ထားလို့
      // criteria ပိုတိကျတဲ့ nav item တစ်ခုကိုပဲ active အဖြစ်ရွေးနိုင်ပါတယ်။
      const pathScore = hrefPath.split("/").length * 100;
      const queryScore = queryEntries.length * 10;
      const score = pathScore + queryScore;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { key: item.key, score };
      }
    }
  }

  return bestMatch?.key ?? null;
};

export const isSectionActive = (activeItemKey: string | null, section: NavSection) =>
  section.items.some((item) => item.key === activeItemKey);

export const getActiveLabel = (
  activeItemKey: string | null,
  sections: NavSection[],
) => {
  if (!activeItemKey) return "Helpdesk";

  for (const section of sections) {
    for (const item of section.items) {
      if (item.key === activeItemKey) {
        return item.label;
      }
    }
  }

  return "Helpdesk";
};

export const isItemActive = (
  activeItemKey: string | null,
  href: NavHref,
  itemKey: string,
) => {
  // Future-proof helper အဖြစ် href argument ကို ထည့်ထားပြီး
  // နောက်ပိုင်း active logic ပြောင်းချိန် item usage site တွေမပြိုစေဖို့ပြင်ဆင်ထားပါတယ်။
  void href;
  return activeItemKey === itemKey;
};
