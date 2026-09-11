import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { UserDetail } from './pages/UserDetail';
import { RoomDetail } from './pages/RoomDetail';
import { TenantDetail } from './pages/TenantDetail';
import { PublicTenantView } from './pages/PublicTenantView';

// TanStack Query Client with aggressive caching rules to minimize Firebase read hits
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,       // Data stays fresh for 5 minutes (no extra reads)
      gcTime: 1000 * 60 * 15,          // Inactive cache retained for 15 minutes
      refetchOnWindowFocus: false,     // Disable refetch when clicking back into browser tab
      refetchOnReconnect: false,       // Prevent automatic refetch on reconnect
      retry: 1                         // Limit retries
    }
  }
});

const ProtectedLayout = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const getPageTitle = (path) => {
    if (path === '/') return 'Platform Overview';
    if (path.startsWith('/users/') && path.includes('/rooms/') && path.includes('/tenants/')) return 'Tenant Billing Ledger';
    if (path.startsWith('/users/') && path.includes('/rooms/')) return 'Property & Occupants';
    if (path.startsWith('/users/')) return 'Landlord Details';
    if (path.startsWith('/users')) return 'Landlords Directory';
    return 'Admin Portal';
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar title={getPageTitle(location.pathname)} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* PUBLIC UNAUTHENTICATED ROUTE (For Tenants scanning QR Code) */}
            <Route path="/tenant-view/:userId/:roomId" element={<PublicTenantView />} />

            {/* ADMIN LOGIN */}
            <Route path="/login" element={<Login />} />
            
            {/* PROTECTED ADMIN ROUTES */}
            <Route path="/" element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            } />

            <Route path="/users" element={
              <ProtectedLayout>
                <Users />
              </ProtectedLayout>
            } />

            <Route path="/users/:userId" element={
              <ProtectedLayout>
                <UserDetail />
              </ProtectedLayout>
            } />

            <Route path="/users/:userId/rooms/:roomId" element={
              <ProtectedLayout>
                <RoomDetail />
              </ProtectedLayout>
            } />

            <Route path="/users/:userId/rooms/:roomId/tenants/:tenantId" element={
              <ProtectedLayout>
                <TenantDetail />
              </ProtectedLayout>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
