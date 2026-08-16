import {
  Bell,
  Bot,
  LayoutList,
  LogOut,
  Route,
  ScrollText,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuth } from './auth';
import { Button } from './ui';

const links = [
  { to: '/clients', label: 'Клиенты', icon: Users },
  { to: '/bots', label: 'Боты', icon: Bot },
  { to: '/types', label: 'Типы', icon: Bell },
  { to: '/rules', label: 'Маршруты', icon: Route },
  { to: '/logs', label: 'Логи', icon: ScrollText },
];

export function Shell() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-4 py-3">
          <LayoutList className="size-4 text-primary" aria-hidden="true" />
          <strong className="text-sm">NotiHub</strong>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
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
