# UniLearn — Teacher Dashboard Frontend

A responsive Next.js + TypeScript teacher dashboard starter for a college/university learning platform. It includes a polished dashboard UI, sample courses, teaching stats, today's schedule, task checklist, calendar, activity feed, responsive sidebar, and a Firebase client initialisation scaffold.

## 1. Requirements

- Node.js 20.9 or newer
- npm
- A Firebase project (only needed to connect real data)

## 2. Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The dashboard works in preview mode without Firebase credentials. The data shown is sample data and interactions such as task completion are local UI state only.

## 3. Connect Firebase

1. Open https://console.firebase.google.com/ and create a project.
2. Register a Web App in Project settings and copy its Firebase configuration.
3. Under **Authentication → Sign-in method**, enable Email/Password (or the sign-in methods you choose).
4. Under **Firestore Database**, create a database for development.
5. Copy `.env.example` to `.env.local` and fill in the `NEXT_PUBLIC_FIREBASE_*` values from the Firebase Web App config.
6. Restart the development server after changing environment variables.

The client initialiser lives in `lib/firebase/client.ts`. It exports `auth`, `db`, and `storage` when the configuration is present.

### Important security note

Firebase web config values are not service-account secrets, but access to Firestore and Storage must still be protected by Security Rules. Never put a Firebase Admin SDK service-account key in a `NEXT_PUBLIC_*` variable or browser code. Do not deploy production academic data until Authentication, Firestore Rules, Storage Rules, and role checks have been tested.

## 4. Suggested first Firestore collections

Start with a small, tenant-aware schema and refine it before real data is added:

```text
institutions/{institutionId}
  name, timezone, createdAt

users/{uid}
  displayName, email, avatarUrl

institutions/{institutionId}/memberships/{uid}
  role: "student" | "teacher" | "departmentAdmin" | "institutionAdmin"
  status: "active" | "invited" | "disabled"

institutions/{institutionId}/courses/{courseId}
  code, title, termId, teacherIds[], studentCount, status

institutions/{institutionId}/sessions/{sessionId}
  courseId, teacherId, roomId, groupIds[], startsAt, endsAt, status

institutions/{institutionId}/assignments/{assignmentId}
  courseId, title, dueAt, status, maxMarks

institutions/{institutionId}/submissions/{submissionId}
  assignmentId, studentId, submittedAt, status, storagePath

institutions/{institutionId}/notifications/{notificationId}
  recipientUid, type, title, body, createdAt, readAt
```

This is a starting point, not a final schema. Firestore is a document database, so query patterns and denormalisation should be designed deliberately. Keep authoritative membership and role data in protected documents; never trust a role value sent from the browser.

## 5. Recommended next steps

1. Create Firebase project and configure `.env.local`.
2. Implement sign-in/sign-out with Firebase Auth.
3. Add a protected teacher route and load the teacher's institution membership from Firestore.
4. Replace the sample course cards with a Firestore query scoped to the active institution and teacher.
5. Build the timetable data model and conflict-safe scheduling flow. For high-integrity scheduling, enforce writes through trusted server-side logic (for example, a Next.js Route Handler using Firebase Admin SDK or a Cloud Function); a browser-side overlap check alone is not sufficient.
6. Add Firestore Security Rules and emulator tests before storing real student data.
7. Deploy to Vercel and configure the same environment variables there.

## 6. Current scope and limitations

- This is a **frontend starter**, not a complete learning management system.
- Authentication and Firestore reads/writes are not yet wired to the dashboard.
- Dashboard cards, schedule entries, and tasks currently use mock data.
- The course navigation and quick-create modal demonstrate UI flows; they do not persist records.
- No Firebase Security Rules are included as production-safe defaults because the correct rules depend on your final data model and institution policy.

## 7. Useful commands

```bash
npm run dev     # local development
npm run build   # production build check
npm start       # run the production build locally
```
