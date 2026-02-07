import { AppHeader } from "@upllyft/ui";

const modules = [
  {
    title: "Community",
    description: "Connect with parents, therapists, and educators",
    href: "/community",
    gradient: "from-blue-400 to-blue-600",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    title: "Screening",
    description: "Developmental assessments and tracking",
    href: "/screening",
    gradient: "from-purple-400 to-purple-600",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Booking",
    description: "Find and book therapy sessions",
    href: "/booking",
    gradient: "from-amber-400 to-amber-600",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Learning Resources",
    description: "AI-powered worksheets and activities",
    href: "/resources",
    gradient: "from-teal-400 to-teal-600",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "Case Management",
    description: "Manage patient cases and progress",
    href: "/cases",
    gradient: "from-pink-400 to-pink-600",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

const stats = [
  { label: "Active Children", value: "3", icon: "👶" },
  { label: "Screenings", value: "12", icon: "📋" },
  { label: "Sessions", value: "8", icon: "📅" },
  { label: "Resources", value: "24", icon: "📚" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader userName="Sarah" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Sarah</h1>
          <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your children&apos;s progress.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Modules */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modules</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <a key={mod.title} href={mod.href} className="block group">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center text-white mb-4`}
                >
                  {mod.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                  {mod.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{mod.description}</p>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
