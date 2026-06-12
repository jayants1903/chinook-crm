import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";
import {
  adminLogout,
  adminMe,
  exportEnrollments,
  listEnrollments,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/admin/enrollments")({
  ssr: false,
  beforeLoad: async () => {
    const { user } = await adminMe();
    if (!user) throw redirect({ to: "/admin/login" });
    return { adminEmail: user.email };
  },
  head: () => ({ meta: [{ title: "Enrollments — Admin" }] }),
  component: EnrollmentsPage,
});

function downloadFile(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function EnrollmentsPage() {
  const { adminEmail } = Route.useRouteContext();
  const navigate = useNavigate();
  const list = useServerFn(listEnrollments);
  const exportFn = useServerFn(exportEnrollments);
  const logout = useServerFn(adminLogout);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const pageSize = 50;

  const [filters, setFilters] = useState({ search: "", date_from: "", date_to: "" });

  const { data, isFetching, error } = useQuery({
    queryKey: ["admin-enrollments", filters, page],
    queryFn: () =>
      list({ data: { ...filters, page, page_size: pageSize } }),
  });

  function applyFilters(e?: FormEvent) {
    e?.preventDefault();
    setPage(1);
    setFilters({ search, date_from: dateFrom, date_to: dateTo });
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setFilters({ search: "", date_from: "", date_to: "" });
  }

  async function onExport(format: "csv" | "xlsx") {
    try {
      setExportError(null);
      setIsExporting(true);
      const res = await exportFn({ data: { ...filters, format } });
      if (res.format === "csv") {
        downloadFile(res.filename, res.content, "text/csv;charset=utf-8");
      } else {
        const blob = base64ToBlob(
          res.base64,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        downloadFile(res.filename, blob, blob.type);
      }
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  async function onLogout() {
    await logout();
    navigate({ to: "/admin/login" });
  }

  const rows = data?.rows ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">Enrollments</h1>
            <p className="text-xs text-muted-foreground">{adminEmail}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-6">
        <form
          onSubmit={applyFilters}
          className="grid grid-cols-1 gap-3 rounded-lg border bg-background p-4 md:grid-cols-[1fr_180px_180px_auto]"
        >
          <div className="space-y-1">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Phone, email, enrollment ID, license, name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit">Search</Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {isFetching ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? "Exporting…" : "Export"}
                <ChevronDown className="ml-2 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isExporting} onSelect={() => void onExport("csv")}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isExporting} onSelect={() => void onExport("xlsx")}>
                Export as XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
          </div>
        )}

        {exportError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {exportError}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Session Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !isFetching && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No enrollments found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                  </TableCell>
                  <TableCell>
                    {[r.student_first_name, r.student_middle_name, r.student_last_name]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </TableCell>
                  <TableCell>{r.student_mobile || r.student_home_phone || "—"}</TableCell>
                  <TableCell>{r.student_email || "—"}</TableCell>
                  <TableCell>{r.course_name || "—"}</TableCell>
                  <TableCell>{r.session_type_label || "—"}</TableCell>
                  <TableCell className="text-right">
                    {r.total_payable != null ? `$${Number(r.total_payable).toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    {r.payment_status ? <Badge variant="secondary">{r.payment_status}</Badge> : "—"}
                  </TableCell>
                  <TableCell>
                    {r.enrollment_status ? <Badge>{r.enrollment_status}</Badge> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
