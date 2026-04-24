import Link from "next/link";

const features = [
  {
    title: "AI-Powered Matching",
    description:
      "Our hybrid algorithm analyses your CV against hundreds of Zambian job listings, scoring on skills, experience, and relevance.",
    icon: (
      <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-.772.129A48.422 48.422 0 0112 21c-2.773 0-5.491-.235-8.135-.687l-.772-.13c-1.718-.292-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    title: "WhatsApp Delivery",
    description:
      "Receive your top job matches straight to WhatsApp every day. Reply to get full details or a tailored CV.",
    icon: (
      <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
  },
  {
    title: "Mobile Money Payments",
    description:
      "Pay easily with MTN Mobile Money or Airtel Money. Plans start from K0 -- completely free to get started.",
    icon: (
      <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="text-center py-12 sm:py-20">
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Find Your Perfect Job Match
          <br className="hidden sm:block" />
          <span className="text-brand-600"> in Zambia</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-2xl mx-auto px-2">
          Upload your CV and let AI match you with the best opportunities.
          Get scored matches, tailored CVs, and WhatsApp alerts.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
          <Link
            href="/auth"
            className="bg-brand-600 text-white px-8 py-3.5 rounded-lg font-medium hover:bg-brand-700 transition touch-target text-center"
          >
            Get Started Free
          </Link>
          <Link
            href="/pricing"
            className="border border-gray-300 text-gray-700 px-8 py-3.5 rounded-lg font-medium hover:bg-gray-50 transition touch-target text-center"
          >
            View Plans
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="p-6 bg-white rounded-xl shadow-sm border border-gray-100"
            >
              <div className="mb-4">{feat.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{feat.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats / social proof */}
      <section className="py-8 sm:py-12 text-center">
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">500+</p>
            <p className="text-xs sm:text-sm text-gray-500">Active Jobs</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">2K+</p>
            <p className="text-xs sm:text-sm text-gray-500">Job Seekers</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-brand-600">85%</p>
            <p className="text-xs sm:text-sm text-gray-500">Match Rate</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-8 sm:py-12">
        <div className="bg-brand-700 text-white rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to find your next role?
          </h2>
          <p className="text-brand-100 mb-6 text-sm sm:text-base">
            Join thousands of Zambian professionals using AI to land better jobs.
          </p>
          <Link
            href="/auth"
            className="inline-block bg-white text-brand-700 px-8 py-3 rounded-lg font-semibold hover:bg-brand-50 transition touch-target"
          >
            Sign Up with WhatsApp
          </Link>
        </div>
      </section>
    </div>
  );
}
