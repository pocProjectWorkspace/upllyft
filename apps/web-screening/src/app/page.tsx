import { AppHeader } from "@upllyft/ui";

export default function ScreeningPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader userName="Sarah" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Screening</h1>
          <p className="text-gray-500 mt-2 text-lg">Coming Soon</p>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">Developmental assessments and milestone tracking for your children</p>
        </div>
      </main>
    </div>
  );
}
