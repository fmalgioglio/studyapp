export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <section className="planner-panel">
        <p className="planner-eyebrow">Privacy</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Privacy
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          StudyApp stores only the study profile data and planner inputs needed to run your
            planner flows. Local preference toggles and focus progress stay in your
          browser unless you explicitly save them through product forms.
        </p>
      </section>
    </main>
  );
}
