"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { useSession, clearToken } from "@/lib/auth/session";

/** Avatar with a dropdown showing the signed-in user and a logout action. */
export function UserMenu({ fallbackLetter = "?" }: { fallbackLetter?: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const display = user?.name ?? user?.email ?? null;
  const letter = (display ?? fallbackLetter)[0]?.toUpperCase() ?? fallbackLetter;

  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="block">
        <Avatar letter={letter} />
      </button>
      {open && (
        <div className="absolute right-0 top-[44px] z-30 min-w-[180px] border border-border bg-cream">
          {display && (
            <div className="border-b border-border px-4 py-3">
              <div className="font-sans text-[13px] text-charcoal">{display}</div>
              {user?.role && (
                <div className="mt-[2px] font-sans text-[10px] uppercase tracking-label text-muted">
                  {user.role.replace("_", " ")}
                </div>
              )}
            </div>
          )}
          <div
            onClick={logout}
            className="cursor-pointer px-4 py-[11px] font-sans text-[13px] text-charcoal hover:bg-white"
          >
            Sign out
          </div>
        </div>
      )}
    </div>
  );
}
