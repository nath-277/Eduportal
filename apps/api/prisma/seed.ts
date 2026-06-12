import { PrismaClient, Level, Semester, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncUserCommunities } from '../src/lib/community.js';

const prisma = new PrismaClient();

interface CourseSeed {
  code: string;
  title: string;
  creditUnits: number;
  level: Level;
  semester: Semester;
  description: string;
}

const SESSION_NAME = '2024/2025';
const SESSION_START = new Date('2024-09-01T00:00:00.000Z');
const SESSION_END = new Date('2025-07-31T00:00:00.000Z');

const COURSES: ReadonlyArray<CourseSeed> = [
  {
    code: 'CSC101',
    title: 'Introduction to Computer Science',
    creditUnits: 3,
    level: Level.L100,
    semester: Semester.FIRST,
    description: 'Foundational concepts of computing, history, and problem solving.',
  },
  {
    code: 'CSC102',
    title: 'Programming Fundamentals I',
    creditUnits: 3,
    level: Level.L100,
    semester: Semester.SECOND,
    description: 'Introduction to programming using a high-level language.',
  },
  {
    code: 'CSC201',
    title: 'Data Structures and Algorithms',
    creditUnits: 3,
    level: Level.L200,
    semester: Semester.FIRST,
    description: 'Lists, trees, graphs, and core algorithm design.',
  },
  {
    code: 'CSC301',
    title: 'Operating Systems',
    creditUnits: 3,
    level: Level.L300,
    semester: Semester.FIRST,
    description: 'Processes, memory, file systems, and concurrency.',
  },
  {
    code: 'CSC302',
    title: 'Database Management Systems',
    creditUnits: 3,
    level: Level.L300,
    semester: Semester.SECOND,
    description: 'Relational model, SQL, normalization, and transactions.',
  },
  {
    code: 'CSC401',
    title: 'Software Engineering',
    creditUnits: 3,
    level: Level.L400,
    semester: Semester.FIRST,
    description: 'Software lifecycle, requirements, design, testing, and project management.',
  },
];

async function main(): Promise<void> {
  console.log('Starting database seed...\n');

  const department = await prisma.department.upsert({
    where: { code: 'CSC' },
    update: {},
    create: {
      name: 'Computer Science',
      code: 'CSC',
      description: 'Department of Computer Science',
    },
  });
  console.log(`[Department] ${department.code} - ${department.name} (${department.id})`);

  const academicSession = await prisma.academicSession.upsert({
    where: { name: SESSION_NAME },
    update: {
      isCurrent: true,
    },
    create: {
      name: SESSION_NAME,
      isCurrent: true,
      startDate: SESSION_START,
      endDate: SESSION_END,
    },
  });
  console.log(
    `[AcademicSession] ${academicSession.name} (current=${academicSession.isCurrent}) (${academicSession.id})\n`
  );

  await prisma.academicSession.updateMany({
    where: { id: { not: academicSession.id } },
    data: { isCurrent: false },
  });

  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const lecturerHash = await bcrypt.hash('Lecturer@1234', 12);
  const studentHash = await bcrypt.hash('Student@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eduportal.com' },
    update: {
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      fullname: 'System Administrator',
      email: 'admin@eduportal.com',
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
      isEmailVerified: true,
      departmentId: department.id,
    },
  });
  console.log(`[User:ADMIN] ${admin.email} (${admin.id})`);

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@eduportal.com' },
    update: {
      passwordHash: lecturerHash,
      role: UserRole.LECTURER,
      isActive: true,
    },
    create: {
      fullname: 'Dr. Ada Lovelace',
      email: 'lecturer@eduportal.com',
      passwordHash: lecturerHash,
      role: UserRole.LECTURER,
      staffId: 'STF001',
      isActive: true,
      isEmailVerified: true,
      departmentId: department.id,
    },
  });
  console.log(`[User:LECTURER] ${lecturer.email} (staffId=${lecturer.staffId}) (${lecturer.id})`);

  const student = await prisma.user.upsert({
    where: { email: 'student@eduportal.com' },
    update: {
      passwordHash: studentHash,
      role: UserRole.STUDENT,
      isActive: true,
    },
    create: {
      fullname: 'John Doe',
      email: 'student@eduportal.com',
      passwordHash: studentHash,
      role: UserRole.STUDENT,
      matricNumber: 'CSC/2021/001',
      level: Level.L300,
      isActive: true,
      isEmailVerified: true,
      departmentId: department.id,
    },
  });
  console.log(
    `[User:STUDENT] ${student.email} (matric=${student.matricNumber}, level=${student.level}) (${student.id})\n`
  );

  for (const courseData of COURSES) {
    const course = await prisma.course.upsert({
      where: { code: courseData.code },
      update: {
        title: courseData.title,
        creditUnits: courseData.creditUnits,
        level: courseData.level,
        semester: courseData.semester,
        description: courseData.description,
        departmentId: department.id,
      },
      create: {
        code: courseData.code,
        title: courseData.title,
        creditUnits: courseData.creditUnits,
        level: courseData.level,
        semester: courseData.semester,
        description: courseData.description,
        departmentId: department.id,
      },
    });
    console.log(
      `[Course] ${course.code} - ${course.title} (${course.creditUnits}cu, ${course.level}, ${course.semester}) (${course.id})`
    );
  }

  console.log('\nSyncing user communities...');
  await syncUserCommunities(admin.id);
  await syncUserCommunities(lecturer.id);
  await syncUserCommunities(student.id);
  console.log('User communities synced.');

  // Backfill any existing posts with null communityId to general
  const generalComm = await prisma.community.findUnique({ where: { name: 'general' } });
  if (generalComm) {
    const backfilled = await prisma.forumPost.updateMany({
      where: { communityId: null },
      data: { communityId: generalComm.id }
    });
    console.log(`Backfilled ${backfilled.count} existing posts to General community.`);
  }

  console.log('\nSeed completed successfully.');
  console.log('\nCredentials for local development:');
  console.log('  ADMIN     : admin@eduportal.com     / Admin@1234');
  console.log('  LECTURER  : lecturer@eduportal.com  / Lecturer@1234');
  console.log('  STUDENT   : student@eduportal.com   / Student@1234');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
