import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BusinessProvider } from './context/BusinessContext'
import { ToastProvider } from './context/ToastContext'
import { CustomerOnly, GuestOnly, RequirePermission, StaffOnly } from './components/RouteGuards'
import { CustomerLayout } from './layouts/CustomerLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { HomePage } from './pages/customer/HomePage'
import { QueuePage } from './pages/customer/QueuePage'
import { CatalogPage } from './pages/customer/CatalogPage'
import { MyOrdersPage } from './pages/customer/MyOrdersPage'
import { NotificationsPage } from './pages/customer/NotificationsPage'
import { LocationPage } from './pages/customer/LocationPage'
import { AssistantPage } from './pages/customer/AssistantPage'
import { ProfilePage } from './pages/shared/ProfilePage'
import { DashboardPage } from './pages/admin/DashboardPage'
import { QueueAdminPage } from './pages/admin/QueueAdminPage'
import { OrdersAdminPage } from './pages/admin/OrdersAdminPage'
import { SalesPage } from './pages/admin/SalesPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { FishAdminPage } from './pages/admin/FishAdminPage'
import { VoyagesPage } from './pages/admin/VoyagesPage'
import { AnnouncementsPage } from './pages/admin/AnnouncementsPage'
import { UsersPage } from './pages/admin/UsersPage'
import { AdminsPage } from './pages/admin/AdminsPage'
import { AssistantAdminPage } from './pages/admin/AssistantAdminPage'
import { BusinessPage } from './pages/admin/BusinessPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <BusinessProvider>
          <AuthProvider>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route path="/masuk" element={<LoginPage />} />
                <Route path="/daftar" element={<RegisterPage />} />
              </Route>

              <Route element={<CustomerOnly />}>
                <Route element={<CustomerLayout />}>
                  <Route path="/beranda" element={<HomePage />} />
                  <Route path="/antrean" element={<QueuePage />} />
                  <Route path="/katalog" element={<CatalogPage />} />
                  <Route path="/pesanan" element={<MyOrdersPage />} />
                  <Route path="/notifikasi" element={<NotificationsPage />} />
                  <Route path="/lokasi" element={<LocationPage />} />
                  <Route path="/asisten" element={<AssistantPage />} />
                  <Route path="/profil" element={<ProfilePage />} />
                </Route>
              </Route>

              <Route element={<StaffOnly />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<DashboardPage />} />
                  <Route path="/admin/profil" element={<ProfilePage />} />
                  <Route element={<RequirePermission permission="antrean" />}>
                    <Route path="/admin/antrean" element={<QueueAdminPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="pesanan" />}>
                    <Route path="/admin/pesanan" element={<OrdersAdminPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="transaksi" />}>
                    <Route path="/admin/transaksi" element={<SalesPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="laporan" />}>
                    <Route path="/admin/laporan" element={<ReportsPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="ikan" />}>
                    <Route path="/admin/ikan" element={<FishAdminPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="pelayaran" />}>
                    <Route path="/admin/pelayaran" element={<VoyagesPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="pengumuman" />}>
                    <Route path="/admin/pengumuman" element={<AnnouncementsPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="pengguna" />}>
                    <Route path="/admin/pengguna" element={<UsersPage />} />
                  </Route>
                  <Route element={<RequirePermission superadmin />}>
                    <Route path="/admin/admin" element={<AdminsPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="asisten" />}>
                    <Route path="/admin/asisten" element={<AssistantAdminPage />} />
                  </Route>
                  <Route element={<RequirePermission permission="usaha" />}>
                    <Route path="/admin/usaha" element={<BusinessPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/masuk" replace />} />
            </Routes>
          </AuthProvider>
        </BusinessProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
