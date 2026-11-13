import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BotsPage } from './BotsPage';
import { ClientsPage } from './ClientsPage';
import { ClientDeletePage, ClientDetailsPage, ClientFormPage } from './ClientPages';
import { LoginPage } from './LoginPage';
import { LogsPage } from './LogsPage';
import { RequireAuth } from './RequireAuth';
import { RulesPage } from './RulesPage';
import { Shell } from './Shell';
import { TypeDeletePage, TypeDetailsPage, TypeFormPage, TypesPage } from './TypesPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Shell />}>
            <Route path="/" element={<Navigate to="/clients" replace />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/new" element={<ClientFormPage mode="create" />} />
            <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
            <Route path="/clients/:clientId/edit" element={<ClientFormPage mode="edit" />} />
            <Route path="/clients/:clientId/delete" element={<ClientDeletePage />} />
            <Route path="/clients/:clientId/rules" element={<RulesPage />} />
            <Route path="/clients/:clientId/types" element={<TypesPage />} />
            <Route path="/clients/:clientId/types/new" element={<TypeFormPage mode="create" />} />
            <Route path="/clients/:clientId/types/:typeId" element={<TypeDetailsPage />} />
            <Route path="/clients/:clientId/types/:typeId/edit" element={<TypeFormPage mode="edit" />} />
            <Route path="/clients/:clientId/types/:typeId/delete" element={<TypeDeletePage />} />
            <Route path="/bots" element={<BotsPage />} />
            <Route path="/types" element={<Navigate to="/clients" replace />} />
            <Route path="/rules" element={<Navigate to="/clients" replace />} />
            <Route path="/logs" element={<LogsPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
