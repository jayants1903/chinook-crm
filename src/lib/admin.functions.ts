import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function isAdminLoginDisabled() {
  return process.env.DISABLE_ADMIN_LOGIN === "true";
}

const LoginInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => LoginInput.parse(d))
  .handler(async ({ data }) => {
    const { getAdminSession } = await import("@/lib/admin-session.server");
    if (isAdminLoginDisabled()) {
      const session = await getAdminSession();
      const email = data.email.toLowerCase();
      await session.update({ userId: "dev-admin", email });
      return { ok: true, email };
    }

    const { getExternalSupabase } = await import("@/integrations/external-supabase.server");
    const bcrypt = (await import("bcryptjs")).default;

    const supabase = getExternalSupabase();
    const { data: user, error } = await supabase
      .from("admin_users")
      .select("id, email, password_hash, is_active")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    if (error) throw new Error("Login failed");
    if (!user || !user.is_active) {
      throw new Error("Invalid email or password");
    }
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new Error("Invalid email or password");

    const session = await getAdminSession();
    await session.update({ userId: user.id, email: user.email });
    return { ok: true, email: user.email };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const session = await getAdminSession();
  await session.clear();
  return { ok: true };
});

export const adminMe = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const session = await getAdminSession();
  if (isAdminLoginDisabled() && !session.data.userId) {
    return { user: { id: "dev-admin", email: "dev-admin@local" } };
  }
  if (!session.data.userId) return { user: null as null | { id: string; email: string } };
  return { user: { id: session.data.userId, email: session.data.email ?? "" } };
});

const ListInput = z.object({
  search: z.string().max(200).optional().default(""),
  date_from: z.string().optional().default(""),
  date_to: z.string().optional().default(""),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(200).default(50),
});

export type EnrollmentRow = {
  id: string;
  created_at: string;
  student_first_name: string | null;
  student_last_name: string | null;
  student_email: string | null;
  student_mobile: string | null;
  student_home_phone: string | null;
  student_city: string | null;
  student_license_number: string | null;
  course_id: string | null;
  course_name: string | null;
  session_type: string | null;
  session_type_label: string | null;
  total_payable: number | null;
  amount_paid: number | null;
  payment_status: string | null;
  enrollment_status: string | null;
};

function formatSessionType(value: string | null | undefined) {
  if (!value) return null;

  switch (value) {
    case "online":
      return "Online";
    case "in_person":
      return "In Person";
    case "not_applicable":
      return "Not Applicable";
    default:
      return value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
  }
}

async function requireAdmin() {
  if (isAdminLoginDisabled()) return;
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const session = await getAdminSession();
  if (!session.data.userId) throw new Error("Unauthorized");
}

async function queryEnrollments(filters: z.infer<typeof ListInput>, limit: number, offset: number) {
  const { getExternalSupabase } = await import("@/integrations/external-supabase.server");
  const supabase = getExternalSupabase();

  // Step 1: optionally find matching students for name/phone/email/license search
  const search = filters.search.trim();
  let studentIds: string[] | null = null;
  let directEnrollmentId: string | null = null;

  if (search) {
    // If looks like a UUID treat as direct enrollment id match
    if (/^[0-9a-f-]{8,}$/i.test(search) && search.includes("-")) {
      directEnrollmentId = search;
    }
    const tokens = search.split(/\s+/).map((token) => token.trim()).filter(Boolean);
    let matchedIds: string[] | null = null;

    for (const token of tokens) {
      const like = `%${token.replace(/[%_]/g, (m) => "\\" + m)}%`;
      const { data: students, error: sErr } = await supabase
        .from("students")
        .select("id")
        .or(
          [
            `mobile_phone_number.ilike.${like}`,
            `home_phone_number.ilike.${like}`,
            `email.ilike.${like}`,
            `first_name.ilike.${like}`,
            `last_name.ilike.${like}`,
            `license_number.ilike.${like}`,
          ].join(","),
        )
        .limit(2000);
      if (sErr) throw new Error(sErr.message);

      const ids = (students ?? []).map((s: { id: string }) => s.id);
      if (matchedIds === null) {
        matchedIds = ids;
      } else {
        const idSet = new Set(ids);
        matchedIds = matchedIds.filter((id) => idSet.has(id));
      }

      if (matchedIds.length === 0) break;
    }

    studentIds = matchedIds ?? [];
  }

  let q = supabase
    .from("enrollments")
    .select(
      "id, created_at, course_id, session_type, total_payable, amount_paid, payment_status, enrollment_status, student_id",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (filters.date_from) q = q.gte("created_at", filters.date_from);
  if (filters.date_to) {
    // inclusive end-of-day
    const end = filters.date_to.length === 10 ? `${filters.date_to}T23:59:59.999Z` : filters.date_to;
    q = q.lte("created_at", end);
  }

  if (search) {
    const orParts: string[] = [];
    if (directEnrollmentId) orParts.push(`id.eq.${directEnrollmentId}`);
    if (studentIds && studentIds.length > 0) {
      orParts.push(`student_id.in.(${studentIds.join(",")})`);
    }
    if (orParts.length === 0) {
      return { rows: [] as EnrollmentRow[], count: 0 };
    }
    q = q.or(orParts.join(","));
  }

  q = q.range(offset, offset + limit - 1);
  const { data: enrolls, error, count } = await q;
  if (error) throw new Error(error.message);
  const list = enrolls ?? [];

  const enrollmentIds = list.map((e) => e.id);
  const sIds = Array.from(new Set(list.map((e) => e.student_id).filter(Boolean))) as string[];
  const fallbackCourseIds = list.map((e) => e.course_id).filter(Boolean);
  let studentMap: Record<string, Record<string, unknown>> = {};
  let courseMap: Record<string, { name: string | null }> = {};
  let enrollmentCourseMap: Record<string, string[]> = {};

  if (sIds.length) {
    const { data: studs } = await supabase
      .from("students")
      .select(
        "id, first_name, last_name, email, mobile_phone_number, home_phone_number, city, license_number",
      )
      .in("id", sIds);
    studentMap = Object.fromEntries((studs ?? []).map((s: { id: string }) => [s.id, s]));
  }

  if (enrollmentIds.length) {
    const { data: enrollmentCourses, error: ecErr } = await supabase
      .from("enrollment_course")
      .select("enrollment_id, course_id")
      .in("enrollment_id", enrollmentIds);
    if (ecErr) throw new Error(ecErr.message);

    for (const entry of (enrollmentCourses ?? []) as Array<{
      enrollment_id: string;
      course_id: string | null;
    }>) {
      if (!entry.course_id) continue;
      if (!enrollmentCourseMap[entry.enrollment_id]) enrollmentCourseMap[entry.enrollment_id] = [];
      enrollmentCourseMap[entry.enrollment_id].push(entry.course_id);
    }
  }

  const courseIds = Array.from(
    new Set([...fallbackCourseIds, ...Object.values(enrollmentCourseMap).flat()].filter(Boolean)),
  ) as string[];

  if (courseIds.length) {
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name")
      .in("id", courseIds);

    const typedCourses = (courses ?? []) as Array<{ id: string; name: string | null }>;
    courseMap = Object.fromEntries(typedCourses.map((course) => [course.id, course]));
  }

  const rows: EnrollmentRow[] = list.map((e) => {
    const s = (e.student_id && studentMap[e.student_id]) || {};
    const selectedCourseIds = enrollmentCourseMap[e.id]?.length
      ? enrollmentCourseMap[e.id]
      : e.course_id
        ? [e.course_id]
        : [];
    const courseName = Array.from(
      new Set(
        selectedCourseIds
          .map((courseId) => courseMap[courseId]?.name ?? null)
          .filter((name): name is string => Boolean(name)),
      ),
    ).join(", ");

    return {
      id: e.id,
      created_at: e.created_at,
      course_id: e.course_id,
      course_name: courseName || null,
      session_type: e.session_type ?? null,
      session_type_label: formatSessionType(e.session_type),
      total_payable: e.total_payable,
      amount_paid: e.amount_paid,
      payment_status: e.payment_status,
      enrollment_status: e.enrollment_status,
      student_first_name: (s as { first_name?: string }).first_name ?? null,
      student_last_name: (s as { last_name?: string }).last_name ?? null,
      student_email: (s as { email?: string }).email ?? null,
      student_mobile: (s as { mobile_phone_number?: string }).mobile_phone_number ?? null,
      student_home_phone: (s as { home_phone_number?: string }).home_phone_number ?? null,
      student_city: (s as { city?: string }).city ?? null,
      student_license_number: (s as { license_number?: string }).license_number ?? null,
    };
  });

  return { rows, count: count ?? rows.length };
}

export const listEnrollments = createServerFn({ method: "POST" })
  .inputValidator((d) => ListInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const limit = data.page_size;
    const offset = (data.page - 1) * limit;
    return queryEnrollments(data, limit, offset);
  });

const ExportInput = ListInput.extend({
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

function toCsv(rows: EnrollmentRow[]): string {
  const headers = [
    "Enrollment ID",
    "Created Date",
    "First Name",
    "Last Name",
    "Email",
    "Contact Number",
    "Home Phone",
    "City",
    "License Number",
    "Course",
    "Session Type",
    "Total Payable",
    "Amount Paid",
    "Payment Status",
    "Enrollment Status",
  ];
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.created_at,
        r.student_first_name,
        r.student_last_name,
        r.student_email,
        r.student_mobile,
        r.student_home_phone,
        r.student_city,
        r.student_license_number,
        r.course_name,
        r.session_type_label,
        r.total_payable,
        r.amount_paid,
        r.payment_status,
        r.enrollment_status,
      ]
        .map(escape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export const exportEnrollments = createServerFn({ method: "POST" })
  .inputValidator((d) => ExportInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    // pull up to 10k for export
    const { rows } = await queryEnrollments(
      { ...data, page: 1, page_size: 10000 },
      10000,
      0,
    );
    if (data.format === "xlsx") {
      const XLSX = await import("xlsx");
      const headers = [
        "Enrollment ID",
        "Created Date",
        "First Name",
        "Last Name",
        "Email",
        "Contact Number",
        "Home Phone",
        "City",
        "License Number",
        "Course",
        "Session Type",
        "Total Payable",
        "Amount Paid",
        "Payment Status",
        "Enrollment Status",
      ];
      const aoa = [
        headers,
        ...rows.map((r) => [
          r.id,
          r.created_at,
          r.student_first_name,
          r.student_last_name,
          r.student_email,
          r.student_mobile,
          r.student_home_phone,
          r.student_city,
          r.student_license_number,
          r.course_name,
          r.session_type_label,
          r.total_payable,
          r.amount_paid,
          r.payment_status,
          r.enrollment_status,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Enrollments");
      const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return { format: "xlsx" as const, base64: buf, filename: `enrollments-${Date.now()}.xlsx` };
    }
    return {
      format: "csv" as const,
      content: toCsv(rows),
      filename: `enrollments-${Date.now()}.csv`,
    };
  });
