import { AppHeader } from "@upllyft/ui";

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader userName="Sarah" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Community</h1>
          <p className="text-gray-500 mt-2 text-lg">Coming Soon</p>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">Connect with parents, therapists, and educators in the neurodivergent community</p>
        </div>
      </main>
    </div>
  );
}
