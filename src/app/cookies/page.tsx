export default function CookiesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <section className="planner-panel">
        <p className="planner-eyebrow">Cookies</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Cookies
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          StudyApp uses session cookies for authentication and browser storage for local
          language, theme, and focus progress preferences. These client-side values support the
          study shell without changing your exam data until you save through the app.
        </p>
      </section>
    </main>
  );
}
