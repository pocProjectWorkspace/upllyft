'use client';

const statusConfig: Record<string, { label: string; className: string }> = {
  INTAKE: { label: 'Intake', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACTIVE: { label: 'Active', className: 'bg-green-50 text-green-700 border-green-200' },
  ON_HOLD: { label: 'On Hold', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  DISCHARGED: { label: 'Discharged', className: 'bg-red-50 text-red-600 border-red-200' },
};

export function PatientStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.INTAKE;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
