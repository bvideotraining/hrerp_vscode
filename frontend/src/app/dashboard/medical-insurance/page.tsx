import { ProtectedRoute } from '@/components/auth/protected-route';
import DashboardLayout from '@/components/dashboard/layout';

export default function MedicalInsurancePage() {
  return (
    <ProtectedRoute moduleId="medical_insurance">
      <DashboardLayout>
        <ModuleContent title="Medical Insurance" description="Manage medical insurance plans and family member coverage" />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ModuleContent({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600">{description}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <div className="text-6xl mb-4">â¤ï¸</div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title} Module</h3>
        <p className="text-slate-600 mb-6">This module is coming soon in Phase 4 development</p>
        <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Learn More
        </button>
      </div>
    </div>
  );
}
