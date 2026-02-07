import { AppHeader } from "@upllyft/ui";

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader userName="Sarah" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Learning Resources</h1>
          <p className="text-gray-500 mt-2 text-lg">Coming Soon</p>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">AI-powered worksheets and educational activities for neurodivergent children</p>
        </div>
      </main>
    </div>
  );
}
