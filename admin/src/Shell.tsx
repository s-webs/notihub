import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  LayoutList,
  LogOut,
  Menu,
  ScrollText,
  Users,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth } from './auth';
import { Button } from './ui';

const links = [
  { to: '/clients', label: 'Проекты', icon: Users },
  { to: '/bots', label: 'Боты', icon: Bot },
  { to: '/logs', label: 'Логи', icon: ScrollText },
];

export function Shell() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    function onBreakpointChange(event: MediaQueryListEvent) {
      if (event.matches) setMobileOpen(false);
    }

    const desktop = window.matchMedia('(min-width: 768px)');
    desktop.addEventListener('change', onBreakpointChange);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener('change', onBreakpointChange);
      document.removeEventListener('keydown', onKeyDown);
      if (!window.matchMedia('(min-width: 768px)').matches) {
        menuButtonRef.current?.focus();
      }
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Открыть меню"
          aria-controls="primary-sidebar"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <strong className="text-sm">NotiHub</strong>
      </header>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
          aria-label="Закрыть меню"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="primary-sidebar"
        data-open={mobileOpen}
        className="mobile-sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-card shadow-xl md:static md:z-auto md:w-56 md:shadow-none"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Основная навигация"
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <LayoutList className="size-4 text-primary" aria-hidden="true" />
          <strong className="flex-1 text-sm">NotiHub</strong>
          <button
            ref={closeButtonRef}
            type="button"
            className="rounded-md p-1 hover:bg-muted md:hidden"
            aria-label="Закрыть меню"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <link.icon className="size-4" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setMobileOpen(false);
              clearAuth();
              navigate('/login');
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Выйти
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
