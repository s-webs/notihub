import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BotsPage } from './BotsPage';
import { ClientsPage } from './ClientsPage';
import { LoginPage } from './LoginPage';
import { LogsPage } from './LogsPage';
import { RequireAuth } from './RequireAuth';
import { RulesPage } from './RulesPage';
import { Shell } from './Shell';
import { TypesPage } from './TypesPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route path="/" element={<Navigate to="/clients" replace />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/bots" element={<BotsPage />} />
            <Route path="/types" element={<TypesPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
