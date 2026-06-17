import { Avatar } from "./Avatar";

export function TopBar({
  title, search = "Search", avatarLetter = "W",
}: {
  title: string;
  search?: string;
  avatarLetter?: string;
}) {
  return (
    <div className="flex h-[68px] flex-none items-center justify-between border-b border-border px-9">
      <span className="font-sans text-[16px] font-semibold text-charcoal">{title}</span>
      <div className="flex items-center gap-6">
        <div className="flex w-[220px] items-center gap-2 border-b border-border pb-[6px]">
          <span className="text-[13px] text-muted">⌕</span>
          <input
            placeholder={search}
            className="w-full border-0 bg-transparent font-sans text-[13px] text-charcoal outline-none"
          />
        </div>
        <Avatar letter={avatarLetter} />
      </div>
    </div>
  );
}
