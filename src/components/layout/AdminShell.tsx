"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROLES } from "@/lib/roles";
import type { UserRole } from "@/types/database";
import { LogoutButton } from "./LogoutButton";

const NAV: { href: string; icon: string; label: string; roles?: UserRole[] }[] = [
  { href: "/admin", icon: "▦", label: "Dashboard" },
  { href: "/admin/patients", icon: "♟", label: "Patients" },
  { href: "/admin/staff", icon: "⚕", label: "Staff", roles: ["admin"] },
  { href: "/admin/appointments", icon: "▣", label: "Appointments" },
  { href: "/admin/medications", icon: "▤", label: "Medications" },
  { href: "/admin/glucose", icon: "◐", label: "Glucose", roles: ["doctor", "nurse"] },
  { href: "/admin/reports", icon: "▥", label: "Reports" },
  { href: "/admin/notifications", icon: "🔔", label: "Notifications" },
  { href: "/admin/settings", icon: "⚙", label: "Settings" },
];

interface AdminShellProps {
  role: UserRole;
  name: string;
  initials: string;
  unreadCount: number;
  children: React.ReactNode;
}

/** Sidebar + top bar of the original admin.html. Each section is now its own route. */
export function AdminShell({ role, name, initials, unreadCount, children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Staff is for the administrator only; Glucose is for doctors and nurses only
  const items = NAV.filter((item) => !item.roles || item.roles.includes(role));

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const title = items.find((item) => isActive(item.href))?.label ?? "Admin Panel";

  return (
    <>
      {/* SIDEBAR */}
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="logo">
          <span>♥</span>
          DiabetesCare
        </div>

        <p className="admin-label">ADMIN PANEL</p>

        <nav>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive(item.href) ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <LogoutButton className="logout-btn" confirmMessage="Are you sure you want to logout?">
            ⇥ Logout
          </LogoutButton>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
        {/* TOP BAR */}
        <header className="topbar">
          <div>
            <button type="button" className="mobile-menu" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
              ☰
            </button>

            <h2>{title}</h2>
          </div>

          <div className="admin-profile">
            <Link href="/admin/notifications" className="notification" aria-label="Notifications">
              🔔
              {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </Link>

            <div className="avatar">{initials}</div>

            <div>
              <strong>{name}</strong>
              <small>{role === "admin" ? "System Admin" : ROLES[role]}</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </>
  );
}
