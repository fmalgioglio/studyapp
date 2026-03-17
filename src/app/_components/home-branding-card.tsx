export function HomeBrandingCard({ title }: { title: string }) {
  return (
    <div className="home-card home-meta-card">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2">
        Theme and copy: <code>src/app/page.tsx</code>
      </p>
      <p>
        Global theme variables: <code>src/app/globals.css</code>
      </p>
      <p>
        Planner shell: <code>src/app/planner/page.tsx</code>
      </p>
      <p>
        Subjects: <code>src/app/planner/subjects/page.tsx</code>
      </p>
    </div>
  );
}
