import { PrismaClient, Level, Semester, UserRole, ResultStatus, Course } from '@prisma/client';
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

  // 4 previous sessions + 1 current session (2025/2026)
  const sessionsData = [
    { name: '2021/2022', isCurrent: false, start: '2021-09-01', end: '2022-07-31' },
    { name: '2022/2023', isCurrent: false, start: '2022-09-01', end: '2023-07-31' },
    { name: '2023/2024', isCurrent: false, start: '2023-09-01', end: '2024-07-31' },
    { name: '2024/2025', isCurrent: false, start: '2024-09-01', end: '2025-07-31' },
    { name: '2025/2026', isCurrent: true, start: '2025-09-01', end: '2026-07-31' },
  ];
  
  const sessions = [];
  for (const s of sessionsData) {
    const session = await prisma.academicSession.create({
      data: {
        name: s.name,
        isCurrent: s.isCurrent,
        startDate: new Date(s.start),
        endDate: new Date(s.end),
      },
    });
    sessions.push(session);
  }
  console.log(`Academic sessions created.`);

  const sessionNameToId: Record<string, string> = {};
  for (const s of sessions) {
    sessionNameToId[s.name] = s.id;
  }

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

  const lecturers = [lecturerAda];
  console.log('Lecturers created.');

  // Create Courses
  const courseList: Course[] = [];
  const levelKeys = [Level.L100, Level.L200, Level.L300, Level.L400];
  const semestersList = [Semester.FIRST, Semester.SECOND];
  const programmesList = [
    { prog: compSciProg, prefix: 'CSC' },
    { prog: infoTechProg, prefix: 'ITC' },
    { prog: softEngProg, prefix: 'SEC' },
  ];

  let courseAssignIndex = 0;

  for (const level of levelKeys) {
    const levelNumStr = level.substring(1); // '100', '200', etc.
    const levelDigit = levelNumStr[0]; // '1', '2', etc.
    for (const semester of semestersList) {
      const semDigit = semester === Semester.FIRST ? '1' : '2';
      for (const { prog, prefix } of programmesList) {
        for (let i = 1; i <= 5; i++) {
          const code = `${prefix}${levelDigit}${semDigit}${i}`;
          const title = `${prog.code} ${levelNumStr}L Course ${semDigit}-${i}`;
          const creditUnits = 3;

          const course = await prisma.course.create({
            data: {
              code,
              title,
              creditUnits,
              level,
              semester,
              description: `This is a foundational course in ${prog.name} for ${levelNumStr} Level.`,
              departmentId: department.id,
              programmeId: prog.id,
            },
          });
          courseList.push(course);

          // Assign round robin (only lecturerAda is in lecturers array)
          const assignedLecturer = lecturers[courseAssignIndex % lecturers.length];
          courseAssignIndex++;

          for (const sess of sessions) {
            await prisma.courseAssignment.create({
              data: {
                courseId: course.id,
                lecturerId: assignedLecturer.id,
                session: sess.name,
              },
            });
          }
        }
      }
    }
  }
  console.log(`Generated ${courseList.length} courses and course assignments.`);

  const levelOrder = [Level.L100, Level.L200, Level.L300, Level.L400];

  // Create Single Student
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
  const studentsList = [student];
  console.log('Students created.');

  const getCoursesForLevelAndSemester = (progId: string, lvl: Level, sem: Semester) => {
    return courseList.filter(
      (c) => c.programmeId === progId && c.level === lvl && c.semester === sem
    );
  };

  const getSessionNameForPastLevel = (currentLevel: Level, pastLevel: Level): string => {
    const currentIdx = levelOrder.indexOf(currentLevel);
    const pastIdx = levelOrder.indexOf(pastLevel);
    const diff = currentIdx - pastIdx;
    const currentSessionYear = 2025; // start year of 2025/2026
    const pastStartYear = currentSessionYear - diff;
    return `${pastStartYear}/${pastStartYear + 1}`;
  };

  const getGradeDetails = (total: number) => {
    if (total >= 70) return { grade: 'A', point: 5.0 };
    if (total >= 60) return { grade: 'B', point: 4.0 };
    if (total >= 50) return { grade: 'C', point: 3.0 };
    if (total >= 45) return { grade: 'D', point: 2.0 };
    if (total >= 40) return { grade: 'E', point: 1.0 };
    return { grade: 'F', point: 0.0 };
  };

  console.log('Seeding enrollments and past results...');
  for (const student of studentsList) {
    const currentLvl = student.level as Level;
    const currentIdx = levelOrder.indexOf(currentLvl);

    // 1. Past results
    for (let idx = 0; idx < currentIdx; idx++) {
      const pastLvl = levelOrder[idx];
      const sessionName = getSessionNameForPastLevel(currentLvl, pastLvl);
      const sessionId = sessionNameToId[sessionName];

      if (!sessionId) {
        console.warn(`Session ${sessionName} not found for past results of ${student.email}`);
        continue;
      }

      for (const sem of semestersList) {
        const pastCourses = getCoursesForLevelAndSemester(student.programmeId!, pastLvl, sem);
        for (const course of pastCourses) {
          // Enroll
          await prisma.enrollment.create({
            data: {
              studentId: student.id,
              courseId: course.id,
              sessionId,
              semester: sem,
            },
          });

          // Result
          const caScore = Math.floor(Math.random() * 11) + 18; // 18-28
          const examScore = Math.floor(Math.random() * 26) + 35; // 35-60
          const totalScore = caScore + examScore;
          const { grade, point } = getGradeDetails(totalScore);

          const assignment = await prisma.courseAssignment.findFirst({
            where: { courseId: course.id, session: sessionName },
          });
          const lecturerId = assignment ? assignment.lecturerId : admin.id;

          await prisma.result.create({
            data: {
              studentId: student.id,
              courseId: course.id,
              sessionId,
              semester: sem,
              caScore,
              examScore,
              totalScore,
              grade,
              gradePoint: point,
              isPublished: true,
              status: ResultStatus.PUBLISHED,
              publishedById: admin.id,
              approvedById: admin.id,
              uploadedById: lecturerId,
            },
          });
        }
      }
    }

    // 2. Current enrollment
    const currentSessionId = sessionNameToId['2025/2026'];
    for (const sem of semestersList) {
      const currentCourses = getCoursesForLevelAndSemester(student.programmeId!, currentLvl, sem);
      for (const course of currentCourses) {
        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            sessionId: currentSessionId,
            semester: sem,
          },
        });
      }
    }
  }
  console.log('Enrollments and past results seeded.');

  console.log('Syncing user communities...');
  await syncUserCommunities(admin.id);
  for (const lec of lecturers) {
    await syncUserCommunities(lec.id);
  }
  for (const std of studentsList) {
    await syncUserCommunities(std.id);
  }
  console.log('User communities synced.');

  // Create Discussions
  const generalComm = await prisma.community.findUnique({
    where: { name: 'general' },
  });

  if (generalComm) {
    console.log('Seeding discussion threads...');
    
    // Thread 1: Dr. Ada Lovelace
    const post1 = await prisma.forumPost.create({
      data: {
        title: 'Welcome to the Department of Computing!',
        body: 'Hello everyone, welcome to the new academic session. Make sure you register your courses early and download the lecture materials from the resources section. Let us work together to make this a successful year!',
        authorId: lecturerAda.id,
        tags: ['welcome', 'computing', 'academics'],
        communityId: generalComm.id,
      },
    });

    // Thread 2: Dr. Ada Lovelace
    const post2 = await prisma.forumPost.create({
      data: {
        title: 'Research Project Openings: AI and ML',
        body: 'I am looking for L400 Computer Science or Software Engineering students interested in collaborating on machine learning research projects. If you have programming experience in Python and are interested in neural networks, please leave a comment with your interest.',
        authorId: lecturerAda.id,
        tags: ['ai', 'research', 'projects'],
        communityId: generalComm.id,
      },
    });

    const demoStudent = student;

    await prisma.forumReply.create({
      data: {
        body: 'Thank you Dr. Ada! I am highly interested in this. I will send my CV and past projects to your email today.',
        authorId: demoStudent.id,
        postId: post2.id,
      },
    });

    await prisma.forumReply.create({
      data: {
        body: 'Welcome Dr. Ada! Looking forward to your Database Management Systems class this semester.',
        authorId: demoStudent.id,
        postId: post1.id,
      },
    });

    // Thread 3: CS L400 Student
    const post3 = await prisma.forumPost.create({
      data: {
        title: 'Study Group for Advanced Algorithm Design',
        body: 'Hey guys, I am setting up a weekend study group to tackle some of the advanced algorithm design concepts. We will meet on Saturdays at the computing lab or via Zoom. Let me know if you would like to join!',
        authorId: demoStudent.id,
        tags: ['study-group', 'csc411', 'algorithms'],
        communityId: generalComm.id,
      },
    });

    await prisma.forumReply.create({
      data: {
        body: 'Count me in! I could definitely use some collaboration on the graph search algorithms.',
        authorId: demoStudent.id,
        postId: post3.id,
      },
    });

    // Thread 4: CS L400 Student
    const post4 = await prisma.forumPost.create({
      data: {
        title: 'Recommended guides for Design Patterns',
        body: 'Does anyone have good reference links or guides for learning creational and structural design patterns? I want to practice them ahead of the system architecture project.',
        authorId: demoStudent.id,
        tags: ['design-patterns', 'software-engineering'],
        communityId: generalComm.id,
      },
    });

    await prisma.forumReply.create({
      data: {
        body: 'I highly recommend the Head First Design Patterns book. It breaks them down with visual guides and very simple Java examples.',
        authorId: lecturerAda.id,
        postId: post4.id,
      },
    });

    console.log('Discussion threads seeded.');
  }

  console.log('\nSeed completed successfully.');
  console.log('\nCredentials for local development:');
  console.log('  ADMIN     : admin@eduportal.com            / Admin@1234');
  console.log('  LECTURERS : lecturer@eduportal.com        / Lecturer@1234');
  console.log('  STUDENTS  : student@eduportal.com         / Student@1234');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
