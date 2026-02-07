import { AppHeader } from "@upllyft/ui";

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader userName="Sarah" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Case Management</h1>
          <p className="text-gray-500 mt-2 text-lg">Coming Soon</p>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">Manage patient cases, progress tracking, and clinical documentation</p>
        </div>
      </main>
    </div>
  );
}
