# Database Schema Documentation

This document describes the database schema for the Chinook Driving School Calgary.
It includes enum types, tables, relationships, and key field descriptions.

📌 Overview

The database is designed to handle:

1. Course management
2. Student records
3. Enrollment lifecycle
4. Payments & transactions
5. Slot availability
6. Contact requests
---

# 🔢 ENUM TYPES

## Enrollment Status

```sql
pending, confirmed, completed, cancelled
```

## Classroom Session Type

```sql
Online Classroom, In Person, Not Applicable
```

## Payment Status

```sql
pending, paid, failed
```

## Payment Method

```sql
cash, card, upi, bank_transfer
```

## Payment Process Status

```sql
success, failed, in_process
```

## Contact Status

```sql
new, contacted, closed
```

## Contact Source

```sql
website, ad, referral
```

## License Status

```sql
none, learning, permanent
```

## License Type

```sql
mcwg, lmv, hmv
```

## Card Type

```sql
visa, mastercard, rupay
```

---

# 🗂️ TABLES

---

## 1. Course Types

### `course_types`

Stores different categories of courses.

| Column      | Type    | Description         | Default            |
| ----------- | ------- | ------------------- | ------------------ |
| id          | UUID    | Primary key         | uuid_generate_v4() |
| name        | TEXT    | Name of course type | -                  |
| description | TEXT    | Description         | -                  |
| is_active   | BOOLEAN | Active status       | true               |
| image       | TEXT    | Course category image | NULL             |

---

## 2. Courses

### `courses`

Defines available driving courses.

| Column             | Type    | Description       | Default            |
| ------------------ | ------- | ----------------- | ------------------ |
| id                 | UUID    | Primary key       | uuid_generate_v4() |
| course_price       | NUMERIC | Base price        | 0                  |
| tax_amount         | NUMERIC | Tax               | 0                  |
| total_amount       | NUMERIC | Final price       | 0                  |
| is_active          | BOOLEAN | Active status     | true               |
| course_type_id     | UUID    | FK → course_types | -                  |
| hours_in_car       | NUMERIC | Practical hours   | 0                  |
| hours_in_classroom | NUMERIC | Theory hours      | 0                  |
| image              | TEXT    | Course image      | NULL               |
| description        | TEXT    | Course details    | NULL               |
| features           | JSON    | Course Features   | '[]'               |
| name.              | TEXT    | Course Name.      |                    |

---

## 3. Students

### `students`

Stores student personal and license information.

| Column                 | Type        | Description       | Default            |
| ---------------------- | ----------- | ----------------- | ------------------ |
| id                     | UUID        | Primary key       | uuid_generate_v4() |
| first_name             | TEXT        | First name        | -                  |
| last_name              | TEXT        | Last name         | -                  |
| middle_name            | TEXT        | Middle name       | NULL               |
| address                | TEXT        | Address           | -                  |
| city                   | TEXT        | City              | -                  |
| postal_code            | TEXT        | Postal code       | -                  |
| email                  | TEXT        | Email             | -                  |
| home_phone_number      | TEXT        | Home phone        | NULL               |
| mobile_phone_number    | TEXT        | Mobile            | -                  |
| parent_name            | TEXT        | Parent/guardian   | NULL               |
| parent_email           | TEXT        | Parent email      | NULL               |
| parent_phone           | TEXT        | Parent phone      | NULL               |
| is_minor               | BOOLEAN     | Minor flag        | false              |
| school_name            | TEXT        | School (if minor) | NULL               |
| date_of_birth          | DATE        | DOB               | -                  |
| license_status         | ENUM        | License status    | 'none'             |
| license_number         | TEXT        | License number    | NULL               |
| license_issuing_region | TEXT        | Issuing authority | NULL               |
| license_type           | ENUM        | License type      | NULL               |
| license_expiry_date    | DATE        | Expiry            | NULL               |
| license_issue_date     | DATE        | Issue date        | NULL               |
| driving_experience     | TEXT        | Experience notes  | NULL               |
| created_at             | TIMESTAMPTZ | Created           | now()              |
| updated_at             | TIMESTAMPTZ | Updated           | now()              |

---

## 4. Enrollments

### `enrollments`

Parent enrollment record for a student.

For multi-course enrollments, the enrollment summary lives here and the
individual selected courses are stored in `enrollment_course`.

| Column               | Type        | Description    | Default            |
| -------------------- | ----------- | -------------- | ------------------ |
| id                   | UUID        | Primary key    | uuid_generate_v4() |
| student_id           | UUID        | FK → students  | -                  |
| course_id            | UUID        | Primary/default course reference | -      |
| course_price         | NUMERIC     | Aggregated course price          | 0      |
| session_type         | ENUM        | Session mode (`in_person`, `online`, `not_applicable`) | - |
| tax_amount           | NUMERIC     | Aggregated tax                   | 0      |
| total_payable        | NUMERIC     | Aggregated total                 | 0      |
| amount_paid          | NUMERIC     | Paid amount    | 0                  |
| enrollment_status    | ENUM        | Status         | 'pending'          |
| payment_status       | ENUM        | Payment status | 'pending'          |
| start_date           | DATE        | Start          | NULL               |
| end_date             | DATE        | End            | NULL               |
| did_agree_conditions | BOOLEAN     | Terms accepted | false              |
| created_at           | TIMESTAMPTZ | Created        | now()              |
| updated_at           | TIMESTAMPTZ | Updated        | now()              |

---

## 5. Availability Slots

### `availability_slots`

Stores preferred scheduling slots.

| Column        | Type | Description      | Default            |
| ------------- | ---- | ---------------- | ------------------ |
| id            | UUID | Primary key      | uuid_generate_v4() |
| enrollment_id | UUID | FK → enrollments | -                  |
| start_date    | DATE | Start date       | -                  |
| days_of_week  | JSON | Selected days    | '[]'               |
| time_slots    | JSON | Preferred times  | '[]'               |

---

## 6. Payments

### `payments`

Tracks all payment transactions.

| Column         | Type        | Description        | Default            |
| -------------- | ----------- | ------------------ | ------------------ |
| id             | UUID        | Primary key        | uuid_generate_v4() |
| enrollment_id  | UUID        | FK → enrollments   | -                  |
| payment_method | ENUM        | Payment method     | 'upi'              |
| amount         | NUMERIC     | Amount             | 0                  |
| status         | ENUM        | Transaction status | 'in_process'       |
| created_at     | TIMESTAMPTZ | Created            | now()              |
| updated_at     | TIMESTAMPTZ | Updated            | now()              |
| logs           | TEXT        | Payment logs/debug | NULL               |

---

## 7. Card Information

### `card_information`

Stores card details for payments (if applicable).

⚠️ **Note:** Sensitive data — should be encrypted or tokenized in production.

| Column        | Type | Description      | Default            |
| ------------- | ---- | ---------------- | ------------------ |
| id            | UUID | Primary key      | uuid_generate_v4() |
| name_on_card  | TEXT | Cardholder       | -                  |
| card_number   | TEXT | Card number      | -                  |
| expiry_date   | TEXT | Expiry           | -                  |
| card_type     | ENUM | Type             | -                  |
| enrollment_id | UUID | FK → enrollments | -                  |

---

## 8. Contact Requests

### `contact_requests`

Stores inbound leads and queries.

| Column     | Type        | Description | Default            |
| ---------- | ----------- | ----------- | ------------------ |
| id         | UUID        | Primary key | uuid_generate_v4() |
| name       | TEXT        | User name   | -                  |
| city       | TEXT        | City        | -                  |
| email      | TEXT        | Email       | -                  |
| phone      | TEXT        | Phone       | -                  |
| query      | TEXT        | User query  | -                  |
| status     | ENUM        | Lead status | 'new'              |
| source     | ENUM        | Lead source | 'website'          |
| created_at | TIMESTAMPTZ | Created     | now()              |
| updated_at | TIMESTAMPTZ | Updated     | now()              |

---

## 9. Enrollment Course

### `enrollment_course`

Junction table that stores the actual course selections for an enrollment.

Each enrollment can include multiple courses.  
Uses a composite primary key (`enrollment_id`, `course_id`) to ensure uniqueness.

| Column        | Type        | Description              | Default |
|--------------|------------|--------------------------|---------|
| enrollment_id| UUID       | FK → enrollments         | -       |
| course_id    | UUID       | FK → courses             | -       |
| course_price | NUMERIC    | Price at booking time    | 0       |
| tax_amount   | NUMERIC    | Tax amount               | 0       |
| total_amount | NUMERIC    | Total amount             | 0       |
| created_at   | TIMESTAMPTZ| Record creation time     | now()   |

---

# 🔗 RELATIONSHIPS

```
course_types → courses → enrollment_courses → enrollments → payments
                                      ↓
                                   students
                                      ↓
                             availability_slots
                                      ↓
                             card_information

```

---



---
