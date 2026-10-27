import React from "react";

/** Complimentary placement independent of member accounts and paid ad campaigns. */
export function AmandaFeaturedAd() {
  return (
    <section aria-label="Complimentary featured business advertisement for Elite FNP Aesthetics" className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">Featured Local Business</span>
        <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-medium text-purple-700">Advertisement</span>
      </div>
      <div className="text-center">
        <div className="mb-1 font-serif text-xl font-bold tracking-wide text-purple-900">Elite FNP Aesthetics</div>
        <div className="text-xs font-medium text-purple-700">Amanda Dech, FNP, NP-C</div>
        <p className="mt-3 font-serif text-lg font-semibold text-purple-950">Feel confident. Feel beautiful. Feel like you.</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">Personalized aesthetic care, including Botox and dermal fillers.</p>
        <a className="mt-3 block text-base font-bold text-purple-800 underline underline-offset-2" href="tel:+12194196311">Call or text 219-419-6311</a>
        <a className="mt-3 block rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-purple-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-800" href="https://www.facebook.com/share/18jYcfT1ub/" target="_blank" rel="noopener noreferrer">Connect with Amanda on Facebook</a>
      </div>
      <p className="mt-3 text-center text-[10px] text-purple-600">Complimentary placement courtesy of Neighborly</p>
    </section>
  );
}
