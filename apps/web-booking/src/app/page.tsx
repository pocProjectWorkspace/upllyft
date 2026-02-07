import { AppHeader } from "@upllyft/ui";

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader userName="Sarah" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Booking</h1>
          <p className="text-gray-500 mt-2 text-lg">Coming Soon</p>
          <p className="text-gray-400 mt-1 max-w-md mx-auto">Find and book therapy sessions with qualified professionals</p>
        </div>
      </main>
    </div>
  );
}
