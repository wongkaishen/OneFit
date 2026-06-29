import { UserMenu } from "./UserMenu";
import { NotificationBell } from "./NotificationBell";

export function TopBar({
  title, search = "Search", avatarLetter = "W", searchValue, onSearch,
}: {
  title: string;
  search?: string;
  avatarLetter?: string;
  /** Provide both to enable a working search box; omit `onSearch` to hide it
   *  (the box was previously decorative and did nothing on most pages). */
  searchValue?: string;
  onSearch?: (value: string) => void;
}) {
  return (
    <div className="flex h-[68px] flex-none items-center justify-between border-b border-border px-9">
      <span className="font-sans text-[16px] font-semibold text-charcoal">{title}</span>
      <div className="flex items-center gap-6">
        {onSearch && (
          <div className="flex w-[220px] items-center gap-2 border-b border-border pb-[6px]">
            <span className="text-[13px] text-muted">⌕</span>
            <input
              placeholder={search}
              value={searchValue ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full border-0 bg-transparent font-sans text-[13px] text-charcoal outline-none"
            />
          </div>
        )}
        <NotificationBell />
        <UserMenu fallbackLetter={avatarLetter} />
      </div>
    </div>
  );
}
