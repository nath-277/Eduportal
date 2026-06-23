import { PrismaClient, Level, Semester, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncUserCommunities } from '../src/lib/community.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Starting database seed...\n');

  console.log('Clearing existing data...');
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;
  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
    }
  }
  console.log('Database cleared.');

  const settings = await prisma.systemSettings.create({
    data: {
      id: 'settings',
      portalName: 'EduPortal',
      displayName: 'EduPortal — University Companion',
      facultyName: 'Sciences',
      maxLoginAttempts: 5,
      sessionExpiry: '24h',
      allowedEmailDomain: 'eduportal.com',
    },
  });
  console.log(`[SystemSettings] Initialized with domain ${settings.allowedEmailDomain}`);

  const department = await prisma.department.create({
    data: {
      name: 'Computing',
      code: 'CMP',
      description: 'Department of Computing',
      maxLevel: Level.L400,
    },
  });
  console.log(`[Department] ${department.code} - ${department.name} (${department.id})`);

  const compSciProg = await prisma.programme.create({
    data: {
      name: 'Computer Science',
      code: 'CS',
      description: 'Bachelor of Science in Computer Science',
      departmentId: department.id,
    },
  });
  console.log(`[Programme] ${compSciProg.code} - ${compSciProg.name} (${compSciProg.id})`);

  const infoTechProg = await prisma.programme.create({
    data: {
      name: 'Information Technology',
      code: 'IT',
      description: 'Bachelor of Science in Information Technology',
      departmentId: department.id,
    },
  });
  console.log(`[Programme] ${infoTechProg.code} - ${infoTechProg.name} (${infoTechProg.id})`);

  const softEngProg = await prisma.programme.create({
    data: {
      name: 'Software Engineering',
      code: 'SE',
      description: 'Bachelor of Science in Software Engineering',
      departmentId: department.id,
    },
  });
  console.log(`[Programme] ${softEngProg.code} - ${softEngProg.name} (${softEngProg.id})`);

  // Current session only (no past sessions)
  const session = await prisma.academicSession.create({
    data: {
      name: '2025/2026',
      isCurrent: true,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-31'),
    },
  });
  console.log(`Academic session created: ${session.name}`);

  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const lecturerHash = await bcrypt.hash('Lecturer@1234', 12);
  const studentHash = await bcrypt.hash('Student@1234', 12);

  const admin = await prisma.user.create({
    data: {
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

  const lecturerAda = await prisma.user.create({
    data: {
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
  console.log(`[User:LECTURER] ${lecturerAda.email} (${lecturerAda.id})`);

  const student = await prisma.user.create({
    data: {
      fullname: 'CS L400 Demo Student',
      email: 'student@eduportal.com',
      passwordHash: studentHash,
      role: UserRole.STUDENT,
      matricNumber: 'AUL/CS/22/001',
      level: Level.L400,
      semester: Semester.FIRST,
      isActive: true,
      isEmailVerified: true,
      departmentId: department.id,
      programmeId: compSciProg.id,
    },
  });
  console.log(`[User:STUDENT] ${student.email} (${student.id})`);

  console.log('Syncing user communities...');
  await syncUserCommunities(admin.id);
  await syncUserCommunities(lecturerAda.id);
  await syncUserCommunities(student.id);
  console.log('User communities synced.');

  console.log('\nCredentials for local development:');
  console.log('  ADMIN     : admin@eduportal.com            / Admin@1234');
  console.log('  LECTURERS : lecturer@eduportal.com        / Lecturer@1234');
  console.log('  STUDENTS  : student@eduportal.com         / Student@1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
