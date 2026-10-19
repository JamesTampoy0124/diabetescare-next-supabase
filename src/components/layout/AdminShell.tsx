"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "./LogoutButton";

const NAV = [
  { href: "/admin", icon: "▦", label: "Dashboard" },
  { href: "/admin/patients", icon: "♟", label: "Patients" },
  { href: "/admin/staff", icon: "⚕", label: "Staff" },
  { href: "/admin/appointments", icon: "▣", label: "Appointments" },
  { href: "/admin/medications", icon: "▤", label: "Medications" },
  { href: "/admin/reports", icon: "▥", label: "Reports" },
  { href: "/admin/notifications", icon: "🔔", label: "Notifications" },
  { href: "/admin/settings", icon: "⚙", label: "Settings" },
];

interface AdminShellProps {
  name: string;
  initials: string;
  unreadCount: number;
  children: React.ReactNode;
}

/** Sidebar + top bar of the original admin.html. Each section is now its own route. */
export function AdminShell({ name, initials, unreadCount, children }: AdminShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const title = NAV.find((item) => isActive(item.href))?.label ?? "Admin Panel";

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
          {NAV.map((item) => (
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
              <small>System Admin</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </>
  );
}
