import { Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { RentalRequestDetailPage } from './pages/RentalRequestDetailPage';
import { RentalRequestsPage } from './pages/RentalRequestsPage';
import { ProtectedRoute, RoleRoute } from './routes/guards';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={<PlaceholderPage title="Dashboard công việc" />}
          />
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
                <PlaceholderPage title="Lịch xem phòng" />
              </RoleRoute>
            }
          />
          <Route
            path="deposits"
            element={
              <RoleRoute roles={['SALE', 'ACCOUNTANT', 'MANAGER']}>
                <PlaceholderPage title="Đặt cọc" />
              </RoleRoute>
            }
          />
          <Route
            path="check-in"
            element={
              <RoleRoute roles={['SALE', 'ACCOUNTANT', 'MANAGER']}>
                <PlaceholderPage title="Nhận phòng" />
              </RoleRoute>
            }
          />
          <Route
            path="check-out"
            element={
              <RoleRoute roles={['SALE', 'ACCOUNTANT', 'MANAGER']}>
                <PlaceholderPage title="Trả phòng" />
              </RoleRoute>
            }
          />
          <Route
            path="rooms"
            element={
              <RoleRoute roles={['SALE', 'MANAGER', 'ADMIN']}>
                <PlaceholderPage title="Phòng và giường" />
              </RoleRoute>
            }
          />
          <Route
            path="employees"
            element={
              <RoleRoute roles={['ADMIN']}>
                <PlaceholderPage title="Nhân viên và chi nhánh" />
              </RoleRoute>
            }
          />
          <Route
            path="reports"
            element={
              <RoleRoute roles={['MANAGER', 'ADMIN']}>
                <PlaceholderPage title="Báo cáo" />
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
