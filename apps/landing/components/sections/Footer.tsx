"use client";

const footerLinks = [
  { label: "What We Do", href: "#how-it-works" },
  { label: "Who It's For", href: "#personas" },
  { label: "Partnerships", href: "#partnerships" },
  { label: "Vision", href: "#vision" },
  { label: "Join Waitlist", href: "#waitlist" },
];

export function Footer() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="border-t border-brand-mist bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Left */}
          <div>
            <p className="text-2xl font-bold text-brand-midnight font-display tracking-tight">
              Upllyft
            </p>
            <p className="mt-2 text-sm text-brand-midnight/50 font-body">
              Therapy infrastructure for every child.
            </p>
          </div>

          {/* Centre */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 md:justify-center">
            {footerLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-sm text-brand-midnight/50 transition-colors hover:text-brand-midnight font-body cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="space-y-2 md:text-right">
            <p className="text-sm text-brand-midnight/50 font-body">
              &copy; 2025 Upllyft. All rights reserved.
            </p>
            <p className="text-sm text-brand-midnight/30 font-body">
              Privacy Policy
            </p>
            <p className="text-xs font-medium text-brand-gold font-body">
              Al Noor MOU Partner
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
