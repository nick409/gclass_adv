
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const auth = admin.auth();
const db = admin.firestore();

const PASSWORD = "TestStudent!2026";
const STUDENT_COUNT = 10;

async function getOrCreateStudent(index) {
  const number = String(index).padStart(2, "0");
  const email = `gclass.student${number}@example.com`;
  const displayName = `Test Student ${number}`;

  let user;

  try {
    user = await auth.getUserByEmail(email);

    // Reset only these dedicated test accounts to the test password.
    user = await auth.updateUser(user.uid, {
      password: PASSWORD,
      displayName,
      emailVerified: true,
      disabled: false,
    });
  } catch (error) {
    if (error.code !== "auth/user-not-found") {
      throw error;
    }

    user = await auth.createUser({
      email,
      password: PASSWORD,
      displayName,
      emailVerified: true,
    });
  }

  await db.collection("users").doc(user.uid).set(
    {
      name: displayName,
      displayName,
      email,
      role: "student",
      approved: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { uid: user.uid, email, displayName };
}

async function main() {
  // Enroll the test accounts in all currently published courses.
  const coursesSnapshot = await db
    .collection("courses")
    .where("isPublished", "==", true)
    .get();

  const courses = coursesSnapshot.docs;

  if (courses.length === 0) {
    console.log(
      "No published courses found. Students will be created without enrollments."
    );
  }

  for (let i = 1; i <= STUDENT_COUNT; i++) {
    const student = await getOrCreateStudent(i);

    for (const course of courses) {
      const enrollmentId = `${student.uid}_${course.id}`;

      await db.collection("enrollments").doc(enrollmentId).set(
        {
          studentId: student.uid,
          courseId: course.id,
          enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log(
      `Created/updated: ${student.email} | ${student.uid} | ${courses.length} course(s)`
    );
  }

  console.log("\nAll test accounts are ready.");
  console.log(`Temporary test password: ${PASSWORD}`);
  console.log("Use these accounts only in your development environment.");
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
