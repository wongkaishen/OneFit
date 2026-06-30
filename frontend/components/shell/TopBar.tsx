"use client";
import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";
import { useShell } from "./ShellContext";
import { Icon } from "@/components/ui/Icon";

export function TopBar({
  title, search = "Search", avatarLetter = "W", searchValue, onSearch,
}: {
  title: string;
  search?: string;
  avatarLetter?: string;
  /** Provide both to enable a working search box; omit `onSearch` to hide it. */
  searchValue?: string;
  onSearch?: (value: string) => void;
}) {
  const { openSidebar } = useShell();
  return (
    <header className="sticky top-0 z-30 flex h-[60px] flex-none items-center justify-between gap-3 border-b border-border bg-cream/85 px-4 backdrop-blur-md sm:px-6 lg:h-[70px] lg:px-9">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open menu"
          className="-ml-1 flex h-9 w-9 flex-none items-center justify-center border border-border bg-paper text-charcoal transition-colors hover:border-charcoal lg:hidden"
        >
          <Icon name="menu" size={18} />
        </button>
        <h1 className="truncate font-serif text-[20px] leading-none text-charcoal lg:text-[24px]">
          {title}
        </h1>
      </div>
      <div className="flex flex-none items-center gap-2 sm:gap-4">
        {onSearch && (
          <div className="hidden h-9 w-[180px] items-center gap-2 border border-border bg-paper px-3 transition-colors focus-within:border-charcoal sm:flex lg:w-[240px]">
            <Icon name="search" size={15} className="text-muted" />
            <input
              placeholder={search}
              value={searchValue ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full border-0 bg-transparent font-sans text-[13px] text-charcoal outline-none placeholder:text-muted"
            />
          </div>
        )}
        <NotificationBell />
        <UserMenu fallbackLetter={avatarLetter} />
      </div>
    </header>
  );
}
