import { ProtectedRoute } from '@/components';
import { AdminDashboard } from '@/components/AdminDashboard';

function AdminDashboardPage() {
  return (
    <>
      <meta name="Backoffice" content="Crea, edita, elimina propiedades - Gumucio Propiedades" />
      {/* <FullSizeCentered> */}
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
      {/* </FullSizeCentered> */}
    </>
  );
}

export default AdminDashboardPage;
