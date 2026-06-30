"use client";
import { createContext, useContext } from "react";

/** Shared chrome state so the per-page TopBar can drive the layout's sidebar. */
export interface ShellState {
  mobileOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const ShellContext = createContext<ShellState>({
  mobileOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
});

export const useShell = () => useContext(ShellContext);
