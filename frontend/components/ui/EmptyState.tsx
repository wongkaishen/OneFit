import { Icon, type IconName } from "./Icon";

/** Consistent empty-state block: optional icon, heading, hint, and an action slot. */
export function EmptyState({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: IconName;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center border border-dashed border-border-strong bg-paper/50 px-6 py-12 text-center">
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center border border-border bg-cream text-muted">
          <Icon name={icon} size={22} />
        </span>
      )}
      <div className="font-serif text-[19px] text-charcoal">{title}</div>
      {children && (
        <div className="mx-auto mt-2 max-w-[400px] font-sans text-[13px] leading-relaxed text-muted">
          {children}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
