export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">U</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Upllyft</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:from-teal-600 hover:to-teal-700 shadow-md hover:shadow-lg transition-all"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
