import { ProtectedRoute } from '@/components';
import { AdminDashboard } from '@/components/AdminDashboard';
import { FullSizeCentered } from '@/components/styled';

function AdminDashboardPage() {
  return (
    <>
      <meta name="title" content="Page 3" />
      <FullSizeCentered>
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </FullSizeCentered>
    </>
  );
}

export default AdminDashboardPage;
