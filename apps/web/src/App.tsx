import { Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout';
import { AdministrationPage } from './pages/AdministrationPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RentalRequestDetailPage } from './pages/RentalRequestDetailPage';
import { RentalRequestsPage } from './pages/RentalRequestsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CheckInPage } from './pages/CheckInPage';
import { CheckOutPage } from './pages/CheckOutPage';
import { DepositsPage } from './pages/DepositsPage';
import { RoomsPage } from './pages/RoomsPage';
import { ViewingsPage } from './pages/ViewingsPage';
import { ProtectedRoute, RoleRoute } from './routes/guards';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="rental-requests"
            element={
              <RoleRoute roles={['SALE']}>
                <RentalRequestsPage />
              </RoleRoute>
            }
          />
          <Route
            path="rental-requests/:id"
            element={
              <RoleRoute roles={['SALE']}>
                <RentalRequestDetailPage />
              </RoleRoute>
            }
          />
          <Route
            path="viewings"
            element={
              <RoleRoute roles={['SALE']}>
                <ViewingsPage />
              </RoleRoute>
            }
          />
          <Route
            path="deposits"
            element={
              <RoleRoute roles={['SALE', 'ACCOUNTANT', 'MANAGER']}>
                <DepositsPage />
              </RoleRoute>
            }
          />
          <Route
            path="check-in"
            element={
              <RoleRoute roles={['SALE', 'ACCOUNTANT', 'MANAGER']}>
                <CheckInPage />
              </RoleRoute>
            }
          />
          <Route
            path="check-out"
            element={
              <RoleRoute roles={['SALE', 'ACCOUNTANT', 'MANAGER']}>
                <CheckOutPage />
              </RoleRoute>
            }
          />
          <Route
            path="rooms"
            element={
              <RoleRoute roles={['SALE', 'MANAGER', 'ADMIN']}>
                <RoomsPage />
              </RoleRoute>
            }
          />
          <Route
            path="employees"
            element={
              <RoleRoute roles={['ADMIN']}>
                <AdministrationPage />
              </RoleRoute>
            }
          />
          <Route
            path="reports"
            element={
              <RoleRoute roles={['MANAGER', 'ADMIN']}>
                <ReportsPage />
              </RoleRoute>
            }
          />
        </Route>
      </Route>
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
