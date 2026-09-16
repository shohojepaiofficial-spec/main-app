interface PlaceholderPageProps {
  title: string;
  /** Pages under the public Navbar need top padding since it's `fixed` and reserves no layout space. Protected pages (no public Navbar) should pass false. */
  offsetForFixedNavbar?: boolean;
}

export function PlaceholderPage({ title, offsetForFixedNavbar = true }: PlaceholderPageProps) {
  return (
    <main
      className={`flex min-h-[70vh] flex-col items-center justify-center gap-2 p-8 text-center ${
        offsetForFixedNavbar ? "pt-[calc(var(--navbar-height)+2rem)]" : ""
      }`}
    >
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-muted text-sm">Coming soon.</p>
    </main>
  );
}
