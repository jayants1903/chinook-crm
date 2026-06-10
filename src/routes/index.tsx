import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chinook Admin" },
      { name: "description", content: "Internal staff CRM for Chinook enrollments." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Chinook Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Staff-only CRM panel. The public site is unaffected.
        </p>
        <Link
          to="/admin/login"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to admin login
        </Link>
      </div>
    </div>
  );
}
