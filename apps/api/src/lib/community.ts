import { prisma } from './prisma.js';
import { Level } from '@prisma/client';

export async function ensureGlobalGeneralCommunity() {
  let general = await prisma.community.findUnique({
    where: { name: 'general' }
  });
  if (!general) {
    general = await prisma.community.create({
      data: {
        name: 'general',
        displayName: 'General',
        description: 'Global forum for all students and lecturers',
        isSystem: true,
        isPrivate: false,
      }
    });
  }
  return general;
}

export async function ensureDepartmentSystemCommunities(departmentId: string) {
  const department = await prisma.department.findUnique({
    where: { id: departmentId }
  });
  if (!department) return [];

  const levels: Level[] = ['L100', 'L200', 'L300', 'L400', 'L500'];
  const maxLevelIndex = levels.indexOf(department.maxLevel);
  const activeLevels = maxLevelIndex !== -1 ? levels.slice(0, maxLevelIndex + 1) : levels;

  const createdCommunities = [];
  for (const lvl of activeLevels) {
    const levelStr = lvl.substring(1) + 'L';
    const name = `${department.code.toLowerCase()}-${lvl.toLowerCase()}`;
    const displayName = `${department.code.toUpperCase()} ${levelStr}`;

    let community = await prisma.community.findUnique({
      where: { name }
    });

    if (!community) {
      community = await prisma.community.create({
        data: {
          name,
          displayName,
          description: `${department.name} - ${levelStr} Community`,
          isSystem: true,
          isPrivate: false,
          level: lvl,
          departmentId: department.id
        }
      });
    } else {
      community = await prisma.community.update({
        where: { id: community.id },
        data: {
          displayName,
          level: lvl,
          departmentId: department.id
        }
      });
    }
    createdCommunities.push(community);
  }
  return createdCommunities;
}

export async function syncUserCommunities(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true }
  });
  if (!user) return;

  // 1. Ensure global General exists and user is in it
  const general = await ensureGlobalGeneralCommunity();
  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: general.id,
        userId: user.id
      }
    },
    create: {
      communityId: general.id,
      userId: user.id,
      role: 'MEMBER'
    },
    update: {}
  });

  // 2. If student and has level + department, sync level community
  if (user.role === 'STUDENT' && user.departmentId && user.level && user.department) {
    // Ensure all level communities for this department exist
    await ensureDepartmentSystemCommunities(user.departmentId);

    const activeLevelName = `${user.department.code.toLowerCase()}-${user.level.toLowerCase()}`;
    const activeLevelCommunity = await prisma.community.findUnique({
      where: { name: activeLevelName }
    });

    if (activeLevelCommunity) {
      // Add user to current level community
      await prisma.communityMember.upsert({
        where: {
          communityId_userId: {
            communityId: activeLevelCommunity.id,
            userId: user.id
          }
        },
        create: {
          communityId: activeLevelCommunity.id,
          userId: user.id,
          role: 'MEMBER'
        },
        update: {}
      });

      // Remove user from any other system level communities
      const otherMemberships = await prisma.communityMember.findMany({
        where: {
          userId: user.id,
          community: {
            isSystem: true,
            level: { not: null },
            id: { not: activeLevelCommunity.id }
          }
        }
      });

      if (otherMemberships.length > 0) {
        await prisma.communityMember.deleteMany({
          where: {
            id: {
              in: otherMemberships.map(m => m.id)
            }
          }
        });
      }
    }
  } else {
    // If not a student or no longer has level/department, remove from any system level-based communities
    const systemLevelMemberships = await prisma.communityMember.findMany({
      where: {
        userId: user.id,
        community: {
          isSystem: true,
          level: { not: null }
        }
      }
    });

    if (systemLevelMemberships.length > 0) {
      await prisma.communityMember.deleteMany({
        where: {
          id: {
            in: systemLevelMemberships.map(m => m.id)
          }
        }
      });
    }
  }
}
