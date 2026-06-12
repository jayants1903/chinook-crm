import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LoginInput = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => LoginInput.parse(d))
  .handler(async ({ data }) => {
    const { getExternalSupabaseAuth } = await import("@/integrations/external-supabase.server");
    const { getAdminSession } = await import("@/lib/admin-session.server");
    const email = data.email.toLowerCase();
    const supabase = getExternalSupabaseAuth();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });

    if (error || !authData.user) {
      throw new Error("Invalid email or password");
    }

    const session = await getAdminSession();
    await session.update({
      userId: authData.user.id,
      email: authData.user.email ?? email,
    });
    return { ok: true, email: authData.user.email ?? email };
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
  student_middle_name: string | null;
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

type ExportEnrollmentRow = {
  session_type: string | null;
  course: string | null;
  optional_courses: string | null;
  student_first_name: string | null;
  student_middle_name: string | null;
  student_last_name: string | null;
  student_date_of_birth: string | null;
  student_address: string | null;
  student_pickup_dropoff_address: string | null;
  student_city: string | null;
  student_state: string | null;
  student_postal_code: string | null;
  student_email: string | null;
  student_mobile_phone_number: string | null;
  student_school_attended: string | null;
  student_created_at: string | null;
  license_status: string | null;
  license_number: string | null;
  license_issuing_region: string | null;
  license_type: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  driving_experience: string | null;
  availability_date: string | null;
  availability_time_slots: string | null;
  availability_days_of_week: string | null;
  parent_full_name: string | null;
  parent_email: string | null;
  parent_contact_number: string | null;
  payment_method: string | null;
  amount: number | null;
  name_on_card: string | null;
  card_number: string | null;
  expiry_date: string | null;
  did_agree_conditions: boolean | null;
};

type EnrollmentFilters = Pick<z.infer<typeof ListInput>, "search" | "date_from" | "date_to">;

type SearchMatches = {
  directEnrollmentId: string | null;
  studentIds: string[] | null;
};

type ExportEnrollmentSource = {
  id: string;
  created_at: string;
  course_id: string | null;
  session_type: string | null;
  did_agree_conditions: boolean | null;
  student_id: string | null;
};

type ExportStudentRecord = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  address: string | null;
  pickup_dropoff_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  email: string | null;
  mobile_phone_number: string | null;
  school_attended: string | null;
  created_at: string | null;
  license_status: string | null;
  license_number: string | null;
  license_issuing_region: string | null;
  license_type: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  driving_experience: string | null;
  parent_full_name: string | null;
  parent_email: string | null;
  parent_contact_number: string | null;
};

type AvailabilitySlotRecord = {
  enrollment_id: string;
  start_date: string | null;
  days_of_week: unknown;
  time_slots: unknown;
};

type PaymentRecord = {
  enrollment_id: string;
  payment_method: string | null;
  amount: number | null;
  created_at: string;
};

type CardInformationRecord = {
  enrollment_id: string;
  name_on_card: string | null;
  card_number: string | null;
  expiry_date: string | null;
};

const EXPORT_MULTI_VALUE_DELIMITER = " | ";
const EXPORT_STUDENT_COLUMNS = [
  "id",
  "first_name",
  "middle_name",
  "last_name",
  "date_of_birth",
  "address",
  "pickup_dropoff_address",
  "city",
  "state",
  "postal_code",
  "email",
  "mobile_phone_number",
  "school_attended",
  "created_at",
  "license_status",
  "license_number",
  "license_issuing_region",
  "license_issue_region",
  "license_type",
  "license_issue_date",
  "license_expiry_date",
  "driving_experience",
  "parent_full_name",
  "parent_name",
  "parent_email",
  "parent_contact_number",
  "parent_phone",
] as const;

const EXPORT_COLUMNS: Array<{ header: string; key: keyof ExportEnrollmentRow }> = [
  { header: "session_type", key: "session_type" },
  { header: "course", key: "course" },
  { header: "optional_courses", key: "optional_courses" },
  { header: "student_first_name", key: "student_first_name" },
  { header: "student_middle_name", key: "student_middle_name" },
  { header: "student_last_name", key: "student_last_name" },
  { header: "student_date_of_birth", key: "student_date_of_birth" },
  { header: "student_address", key: "student_address" },
  { header: "student_pickup_dropoff_address", key: "student_pickup_dropoff_address" },
  { header: "student_city", key: "student_city" },
  { header: "student_state", key: "student_state" },
  { header: "student_postal_code", key: "student_postal_code" },
  { header: "student_email", key: "student_email" },
  { header: "student_mobile_phone_number", key: "student_mobile_phone_number" },
  { header: "student_school_attended", key: "student_school_attended" },
  { header: "student_created_at", key: "student_created_at" },
  { header: "license_status", key: "license_status" },
  { header: "license_number", key: "license_number" },
  { header: "license_issuing_region", key: "license_issuing_region" },
  { header: "license_type", key: "license_type" },
  { header: "license_issue_date", key: "license_issue_date" },
  { header: "license_expiry_date", key: "license_expiry_date" },
  { header: "driving_experience", key: "driving_experience" },
  { header: "availability_date", key: "availability_date" },
  { header: "availability_time_slots", key: "availability_time_slots" },
  { header: "availability_days_of_week", key: "availability_days_of_week" },
  { header: "parent_full_name", key: "parent_full_name" },
  { header: "parent_email", key: "parent_email" },
  { header: "parent_contact_number", key: "parent_contact_number" },
  { header: "payment_method", key: "payment_method" },
  { header: "amount", key: "amount" },
  { header: "name_on_card", key: "name_on_card" },
  { header: "card_number", key: "card_number" },
  { header: "expiry_date", key: "expiry_date" },
  { header: "did_agree_conditions", key: "did_agree_conditions" },
];

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
  const { getAdminSession } = await import("@/lib/admin-session.server");
  const session = await getAdminSession();
  if (!session.data.userId) throw new Error("Unauthorized");
}

async function resolveEnrollmentSearch(
  supabase: ReturnType<
    (typeof import("@/integrations/external-supabase.server"))["getExternalSupabase"]
  >,
  filters: EnrollmentFilters,
) {
  const search = filters.search.trim();
  let directEnrollmentId: string | null = null;
  let studentIds: string[] | null = null;

  if (search) {
    if (/^[0-9a-f-]{8,}$/i.test(search) && search.includes("-")) {
      directEnrollmentId = search;
    }
    const tokens = search
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
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
            `middle_name.ilike.${like}`,
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

  return { directEnrollmentId, studentIds } satisfies SearchMatches;
}

function applyEnrollmentDateFilters<T>(query: T, filters: EnrollmentFilters) {
  let nextQuery = query as T & {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  };

  if (filters.date_from)
    nextQuery = nextQuery.gte("created_at", filters.date_from) as typeof nextQuery;
  if (filters.date_to) {
    const end =
      filters.date_to.length === 10 ? `${filters.date_to}T23:59:59.999Z` : filters.date_to;
    nextQuery = nextQuery.lte("created_at", end) as typeof nextQuery;
  }

  return nextQuery;
}

function applyEnrollmentSearchFilters<T>(
  query: T,
  filters: EnrollmentFilters,
  searchMatches: SearchMatches,
) {
  const search = filters.search.trim();
  let nextQuery = query as T & { or: (value: string) => T };

  if (!search) return nextQuery;

  const orParts: string[] = [];
  if (searchMatches.directEnrollmentId) {
    orParts.push(`id.eq.${searchMatches.directEnrollmentId}`);
  }
  if (searchMatches.studentIds && searchMatches.studentIds.length > 0) {
    orParts.push(`student_id.in.(${searchMatches.studentIds.join(",")})`);
  }

  if (orParts.length === 0) return null;
  nextQuery = nextQuery.or(orParts.join(",")) as typeof nextQuery;
  return nextQuery;
}

function getUniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function joinExportValues(values: Array<string | null | undefined>) {
  const uniqueValues = getUniqueStrings(values);
  return uniqueValues.length > 0 ? uniqueValues.join(EXPORT_MULTI_VALUE_DELIMITER) : null;
}

function formatExportValue(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const startTime = typeof record.start_time === "string" ? record.start_time.trim() : "";
    const endTime = typeof record.end_time === "string" ? record.end_time.trim() : "";
    if (startTime && endTime) return `${startTime} - ${endTime}`;
    if (startTime) return startTime;
    if (endTime) return endTime;

    return JSON.stringify(value);
  }

  return String(value);
}

function normalizeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return getUniqueStrings(value.map((entry) => formatExportValue(entry)));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return getUniqueStrings(parsed.map((entry) => formatExportValue(entry)));
      }
    } catch {
      return [trimmed];
    }

    return [trimmed];
  }

  if (typeof value === "object" && value !== null) {
    const formatted = formatExportValue(value);
    return formatted ? [formatted] : [];
  }

  return [];
}

function isMissingColumnError(
  error: { details?: string | null; hint?: string | null; message?: string },
  columnName: string,
) {
  const haystack = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes("column") && haystack.includes(columnName.toLowerCase());
}

function extractMissingColumnName(
  error: { details?: string | null; hint?: string | null; message?: string },
  tableName: string,
) {
  const haystack = [error.message, error.details, error.hint].filter(Boolean).join(" ");
  const match =
    haystack.match(new RegExp(`column\\s+${tableName}\\.([a-zA-Z0-9_]+)\\s+does not exist`, "i")) ??
    haystack.match(/column\s+([a-zA-Z0-9_]+)\s+does not exist/i);

  return match?.[1] ?? null;
}

async function fetchExportStudents(
  supabase: ReturnType<
    (typeof import("@/integrations/external-supabase.server"))["getExternalSupabase"]
  >,
  studentIds: string[],
) {
  let remainingColumns = [...EXPORT_STUDENT_COLUMNS];

  while (remainingColumns.length > 0) {
    const result = await supabase
      .from("students")
      .select(remainingColumns.join(", "))
      .in("id", studentIds);

    if (!result.error) {
      return ((result.data ?? []) as Array<Record<string, unknown>>).map((student) => ({
        id: typeof student.id === "string" ? student.id : "",
        first_name: typeof student.first_name === "string" ? student.first_name : null,
        middle_name: typeof student.middle_name === "string" ? student.middle_name : null,
        last_name: typeof student.last_name === "string" ? student.last_name : null,
        date_of_birth: typeof student.date_of_birth === "string" ? student.date_of_birth : null,
        address: typeof student.address === "string" ? student.address : null,
        pickup_dropoff_address:
          typeof student.pickup_dropoff_address === "string"
            ? student.pickup_dropoff_address
            : null,
        city: typeof student.city === "string" ? student.city : null,
        state: typeof student.state === "string" ? student.state : null,
        postal_code: typeof student.postal_code === "string" ? student.postal_code : null,
        email: typeof student.email === "string" ? student.email : null,
        mobile_phone_number:
          typeof student.mobile_phone_number === "string" ? student.mobile_phone_number : null,
        school_attended: typeof student.school_attended === "string" ? student.school_attended : null,
        created_at: typeof student.created_at === "string" ? student.created_at : null,
        license_status: typeof student.license_status === "string" ? student.license_status : null,
        license_number: typeof student.license_number === "string" ? student.license_number : null,
        license_issuing_region:
          typeof student.license_issuing_region === "string"
            ? student.license_issuing_region
            : typeof student.license_issue_region === "string"
              ? student.license_issue_region
              : null,
        license_type: typeof student.license_type === "string" ? student.license_type : null,
        license_issue_date:
          typeof student.license_issue_date === "string" ? student.license_issue_date : null,
        license_expiry_date:
          typeof student.license_expiry_date === "string" ? student.license_expiry_date : null,
        driving_experience:
          typeof student.driving_experience === "string" ? student.driving_experience : null,
        parent_full_name:
          typeof student.parent_full_name === "string"
            ? student.parent_full_name
            : typeof student.parent_name === "string"
              ? student.parent_name
              : null,
        parent_email: typeof student.parent_email === "string" ? student.parent_email : null,
        parent_contact_number:
          typeof student.parent_contact_number === "string"
            ? student.parent_contact_number
            : typeof student.parent_phone === "string"
              ? student.parent_phone
              : null,
      }));
    }

    const missingColumn = extractMissingColumnName(result.error, "students");
    if (
      !missingColumn ||
      !remainingColumns.includes(missingColumn as (typeof EXPORT_STUDENT_COLUMNS)[number])
    ) {
      throw new Error(result.error.message);
    }

    remainingColumns = remainingColumns.filter((column) => column !== missingColumn);
  }

  return [];
}

async function queryEnrollments(filters: z.infer<typeof ListInput>, limit: number, offset: number) {
  const { getExternalSupabase } = await import("@/integrations/external-supabase.server");
  const supabase = getExternalSupabase();
  const searchMatches = await resolveEnrollmentSearch(supabase, filters);

  let q = supabase
    .from("enrollments")
    .select(
      "id, created_at, course_id, session_type, total_payable, amount_paid, payment_status, enrollment_status, student_id",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  q = applyEnrollmentDateFilters(q, filters);
  const searchedQuery = applyEnrollmentSearchFilters(q, filters, searchMatches);
  if (!searchedQuery) return { rows: [] as EnrollmentRow[], count: 0 };
  q = searchedQuery;

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
        "id, first_name, middle_name, last_name, email, mobile_phone_number, home_phone_number, city, license_number",
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
    const { data: courses } = await supabase.from("courses").select("id, name").in("id", courseIds);

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
      student_middle_name: (s as { middle_name?: string }).middle_name ?? null,
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

async function queryEnrollmentExportRows(filters: EnrollmentFilters, limit: number) {
  const { getExternalSupabase } = await import("@/integrations/external-supabase.server");
  const supabase = getExternalSupabase();
  const searchMatches = await resolveEnrollmentSearch(supabase, filters);

  let q = supabase
    .from("enrollments")
    .select("id, created_at, course_id, session_type, did_agree_conditions, student_id")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  q = applyEnrollmentDateFilters(q, filters);
  const searchedQuery = applyEnrollmentSearchFilters(q, filters, searchMatches);
  if (!searchedQuery) return [] as ExportEnrollmentRow[];
  q = searchedQuery;

  const { data: enrollments, error } = await q.range(0, limit - 1);
  if (error) throw new Error(error.message);

  const enrollmentList = (enrollments ?? []) as ExportEnrollmentSource[];
  if (enrollmentList.length === 0) return [];

  const enrollmentIds = enrollmentList.map((enrollment) => enrollment.id);
  const studentIds = Array.from(
    new Set(enrollmentList.map((enrollment) => enrollment.student_id).filter(Boolean)),
  ) as string[];

  const [students, enrollmentCoursesResult, availabilityResult, paymentResult, cardInfoResult] =
    await Promise.all([
      studentIds.length
        ? fetchExportStudents(supabase, studentIds)
        : Promise.resolve([] as ExportStudentRecord[]),
      supabase
        .from("enrollment_course")
        .select("enrollment_id, course_id")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("availability_slots")
        .select("enrollment_id, start_date, days_of_week, time_slots")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("payments")
        .select("enrollment_id, payment_method, amount, created_at")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("card_information")
        .select("enrollment_id, name_on_card, card_number, expiry_date")
        .in("enrollment_id", enrollmentIds),
    ]);

  if (enrollmentCoursesResult.error) throw new Error(enrollmentCoursesResult.error.message);
  if (availabilityResult.error) throw new Error(availabilityResult.error.message);
  if (paymentResult.error) throw new Error(paymentResult.error.message);
  if (cardInfoResult.error) throw new Error(cardInfoResult.error.message);

  const studentMap = Object.fromEntries(students.map((student) => [student.id, student]));

  const enrollmentCourseMap: Record<string, string[]> = {};
  for (const enrollmentCourse of (enrollmentCoursesResult.data ?? []) as Array<{
    enrollment_id: string;
    course_id: string | null;
  }>) {
    if (!enrollmentCourse.course_id) continue;
    if (!enrollmentCourseMap[enrollmentCourse.enrollment_id]) {
      enrollmentCourseMap[enrollmentCourse.enrollment_id] = [];
    }
    enrollmentCourseMap[enrollmentCourse.enrollment_id].push(enrollmentCourse.course_id);
  }

  const courseIds = Array.from(
    new Set(
      [
        ...enrollmentList.map((enrollment) => enrollment.course_id),
        ...Object.values(enrollmentCourseMap).flat(),
      ].filter(Boolean),
    ),
  ) as string[];

  let courseMap: Record<string, { name: string | null }> = {};
  if (courseIds.length > 0) {
    const { data: courses, error: courseError } = await supabase
      .from("courses")
      .select("id, name")
      .in("id", courseIds);
    if (courseError) throw new Error(courseError.message);

    courseMap = Object.fromEntries(
      ((courses ?? []) as Array<{ id: string; name: string | null }>).map((course) => [course.id, course]),
    );
  }

  const availabilityMap: Record<
    string,
    { dates: string[]; daysOfWeek: string[]; timeSlots: string[] }
  > = {};
  for (const slot of (availabilityResult.data ?? []) as AvailabilitySlotRecord[]) {
    if (!availabilityMap[slot.enrollment_id]) {
      availabilityMap[slot.enrollment_id] = { dates: [], daysOfWeek: [], timeSlots: [] };
    }

    const availability = availabilityMap[slot.enrollment_id];
    if (slot.start_date) availability.dates.push(slot.start_date);
    availability.daysOfWeek.push(...normalizeJsonArray(slot.days_of_week));
    availability.timeSlots.push(...normalizeJsonArray(slot.time_slots));
  }

  const latestPaymentMap: Record<string, PaymentRecord> = {};
  for (const payment of (paymentResult.data ?? []) as PaymentRecord[]) {
    const existing = latestPaymentMap[payment.enrollment_id];
    if (!existing || payment.created_at > existing.created_at) {
      latestPaymentMap[payment.enrollment_id] = payment;
    }
  }

  const cardInfoMap: Record<string, CardInformationRecord> = {};
  for (const cardInfo of (cardInfoResult.data ?? []) as CardInformationRecord[]) {
    if (!cardInfoMap[cardInfo.enrollment_id]) {
      cardInfoMap[cardInfo.enrollment_id] = cardInfo;
    }
  }

  return enrollmentList.map((enrollment) => {
    const student = enrollment.student_id ? studentMap[enrollment.student_id] : null;
    const selectedCourseIds = getUniqueStrings(enrollmentCourseMap[enrollment.id] ?? []);
    const primaryCourseName =
      (enrollment.course_id ? (courseMap[enrollment.course_id]?.name ?? null) : null) ??
      (selectedCourseIds.length > 0 ? (courseMap[selectedCourseIds[0]]?.name ?? null) : null);
    const optionalCourseNames = selectedCourseIds
      .filter((courseId) => courseId !== enrollment.course_id)
      .map((courseId) => courseMap[courseId]?.name ?? null);
    const availability = availabilityMap[enrollment.id];
    const payment = latestPaymentMap[enrollment.id];
    const cardInfo = cardInfoMap[enrollment.id];

    return {
      session_type: enrollment.session_type ?? null,
      course: primaryCourseName,
      optional_courses: joinExportValues(optionalCourseNames),
      student_first_name: student?.first_name ?? null,
      student_middle_name: student?.middle_name ?? null,
      student_last_name: student?.last_name ?? null,
      student_date_of_birth: student?.date_of_birth ?? null,
      student_address: student?.address ?? null,
      student_pickup_dropoff_address: student?.pickup_dropoff_address ?? null,
      student_city: student?.city ?? null,
      student_state: student?.state ?? null,
      student_postal_code: student?.postal_code ?? null,
      student_email: student?.email ?? null,
      student_mobile_phone_number: student?.mobile_phone_number ?? null,
      student_school_attended: student?.school_attended ?? null,
      student_created_at: student?.created_at ?? null,
      license_status: student?.license_status ?? null,
      license_number: student?.license_number ?? null,
      license_issuing_region: student?.license_issuing_region ?? null,
      license_type: student?.license_type ?? null,
      license_issue_date: student?.license_issue_date ?? null,
      license_expiry_date: student?.license_expiry_date ?? null,
      driving_experience: student?.driving_experience ?? null,
      availability_date: joinExportValues(availability?.dates ?? []),
      availability_time_slots: joinExportValues(availability?.timeSlots ?? []),
      availability_days_of_week: joinExportValues(availability?.daysOfWeek ?? []),
      parent_full_name: student?.parent_full_name ?? null,
      parent_email: student?.parent_email ?? null,
      parent_contact_number: student?.parent_contact_number ?? null,
      payment_method: payment?.payment_method ?? null,
      amount: payment?.amount ?? null,
      name_on_card: cardInfo?.name_on_card ?? null,
      card_number: cardInfo?.card_number ?? null,
      expiry_date: cardInfo?.expiry_date ?? null,
      did_agree_conditions: enrollment.did_agree_conditions ?? null,
    } satisfies ExportEnrollmentRow;
  });
}

export const listEnrollments = createServerFn({ method: "POST" })
  .inputValidator((d) => ListInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    const limit = data.page_size;
    const offset = (data.page - 1) * limit;
    return queryEnrollments(data, limit, offset);
  });

const ExportInput = z.object({
  search: z.string().max(200).optional().default(""),
  date_from: z.string().optional().default(""),
  date_to: z.string().optional().default(""),
  format: z.enum(["csv", "xlsx"]).default("csv"),
});

function getExportRowValues(row: ExportEnrollmentRow) {
  return EXPORT_COLUMNS.map(({ key }) => row[key]);
}

function toCsv(rows: ExportEnrollmentRow[]): string {
  const headers = EXPORT_COLUMNS.map(({ header }) => header);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(getExportRowValues(r).map(escape).join(","));
  }
  return lines.join("\n");
}

export const exportEnrollments = createServerFn({ method: "POST" })
  .inputValidator((d) => ExportInput.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin();
    // pull up to 10k for export
    const rows = await queryEnrollmentExportRows(data, 10000);
    if (data.format === "xlsx") {
      const XLSX = await import("xlsx");
      const headers = EXPORT_COLUMNS.map(({ header }) => header);
      const aoa = [headers, ...rows.map((row) => getExportRowValues(row))];
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
