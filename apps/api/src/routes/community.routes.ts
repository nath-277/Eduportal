import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { ok, forbidden, notFound } from '../lib/response.js';
import { z } from 'zod';
import {
  requestCommunitySchema,
  submitJoinRequestSchema,
} from '../validators/community.validator.js';

const communityRouter = new Hono();

// GET / - List joined communities for the current user
communityRouter.get('/', authenticate, async (c) => {
  const userId = c.get('user').userId;
  const memberships = await prisma.communityMember.findMany({
    where: { userId },
    include: {
      community: {
        include: {
          _count: { select: { members: true } }
        }
      }
    }
  });
  return ok(
    memberships.map((m) => ({
      id: m.community.id,
      name: m.community.name,
      displayName: m.community.displayName,
      description: m.community.description,
      isPrivate: m.community.isPrivate,
      isSystem: m.community.isSystem,
      level: m.community.level,
      role: m.role,
      memberCount: m.community._count.members,
      createdAt: m.community.createdAt,
    }))
  );
});

// GET /discover - List public communities that the user is not a member of
communityRouter.get('/discover', authenticate, async (c) => {
  const userId = c.get('user').userId;

  const joined = await prisma.communityMember.findMany({
    where: { userId },
    select: { communityId: true },
  });
  const joinedIds = joined.map((j) => j.communityId);

  const communities = await prisma.community.findMany({
    where: {
      isPrivate: false,
      id: joinedIds.length > 0 ? { notIn: joinedIds } : undefined,
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  return ok(
    communities.map((com) => ({
      id: com.id,
      name: com.name,
      displayName: com.displayName,
      description: com.description,
      isSystem: com.isSystem,
      level: com.level,
      memberCount: com._count.members,
      createdAt: com.createdAt,
    }))
  );
});

// POST /request - Create request for a new community
communityRouter.post('/request', authenticate, async (c) => {
  const userId = c.get('user').userId;
  let body;
  try {
    body = requestCommunitySchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const nameLower = body.name.toLowerCase();

  const existingCommunity = await prisma.community.findFirst({
    where: { name: nameLower },
  });
  if (existingCommunity) {
    return c.json({ error: 'A community with this name already exists' }, 400);
  }

  const existingRequest = await prisma.communityCreationRequest.findFirst({
    where: {
      name: nameLower,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  });
  if (existingRequest) {
    return c.json({ error: 'A community request with this name is already pending or approved' }, 400);
  }

  const request = await prisma.communityCreationRequest.create({
    data: {
      name: nameLower,
      displayName: body.displayName,
      description: body.description,
      isPrivate: body.isPrivate,
      requesterId: userId,
    },
  });

  return c.json({ success: true, data: request }, 201);
});

// GET /requests - Get community requests (Admins see all, users see their own)
communityRouter.get('/requests', authenticate, async (c) => {
  const user = c.get('user');
  let requests;
  if (user.role === 'ADMIN') {
    requests = await prisma.communityCreationRequest.findMany({
      include: { requester: { select: { id: true, fullname: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    requests = await prisma.communityCreationRequest.findMany({
      where: { requesterId: user.userId },
      orderBy: { createdAt: 'desc' },
    });
  }
  return ok(requests);
});

// POST /requests/:id/approve - Approve a community request (Admin only)
communityRouter.post('/requests/:id/approve', authenticate, async (c) => {
  const user = c.get('user');
  if (user.role !== 'ADMIN') {
    return forbidden('Only admins can approve community requests');
  }
  const { id } = c.req.param();
  const reqBody = await c.req.json().catch(() => ({}));
  const adminNotes = reqBody.adminNotes;

  const request = await prisma.communityCreationRequest.findUnique({
    where: { id },
  });
  if (!request) return notFound('Request not found');
  if (request.status !== 'PENDING') {
    return c.json({ error: 'Request has already been processed' }, 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.communityCreationRequest.update({
      where: { id },
      data: { status: 'APPROVED', adminNotes },
    });

    const community = await tx.community.create({
      data: {
        name: request.name,
        displayName: request.displayName,
        description: request.description,
        isPrivate: request.isPrivate,
        isSystem: false,
        creatorId: request.requesterId,
      },
    });

    await tx.communityMember.create({
      data: {
        communityId: community.id,
        userId: request.requesterId,
        role: 'MODERATOR',
      },
    });

    return { community };
  });

  await prisma.notification.create({
    data: {
      userId: request.requesterId,
      category: 'SYSTEM',
      title: 'Community Request Approved',
      message: `Your request to create the community "${request.displayName}" has been approved!`,
      link: `/forum`,
    },
  });

  return ok(result);
});

// POST /requests/:id/reject - Reject a community request (Admin only)
communityRouter.post('/requests/:id/reject', authenticate, async (c) => {
  const user = c.get('user');
  if (user.role !== 'ADMIN') {
    return forbidden('Only admins can reject community requests');
  }
  const { id } = c.req.param();
  const reqBody = await c.req.json().catch(() => ({}));
  const adminNotes = reqBody.adminNotes;

  const request = await prisma.communityCreationRequest.findUnique({
    where: { id },
  });
  if (!request) return notFound('Request not found');
  if (request.status !== 'PENDING') {
    return c.json({ error: 'Request has already been processed' }, 400);
  }

  const updatedRequest = await prisma.communityCreationRequest.update({
    where: { id },
    data: { status: 'REJECTED', adminNotes },
  });

  await prisma.notification.create({
    data: {
      userId: request.requesterId,
      category: 'SYSTEM',
      title: 'Community Request Rejected',
      message: `Your request to create the community "${request.displayName}" was rejected. Notes: ${adminNotes ?? 'None'}`,
      link: `/forum`,
    },
  });

  return ok(updatedRequest);
});

// GET /:id - Get community details (by ID or unique name)
communityRouter.get('/:id', authenticate, async (c) => {
  const { id } = c.req.param();
  const userId = c.get('user').userId;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
    include: {
      joinQuestions: true,
      _count: { select: { members: true } },
    },
  });

  if (!community) return notFound('Community not found');

  const member = await prisma.communityMember.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  const pendingRequest = await prisma.communityJoinRequest.findUnique({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
  });

  return ok({
    ...community,
    memberRole: member ? member.role : null,
    isMember: !!member,
    hasPendingRequest: pendingRequest ? pendingRequest.status === 'PENDING' : false,
  });
});

// POST /:id/join - Join a public community
communityRouter.post('/:id/join', authenticate, async (c) => {
  const { id } = c.req.param();
  const userId = c.get('user').userId;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
  });
  if (!community) return notFound('Community not found');
  if (community.isPrivate) {
    return c.json({ error: 'Cannot directly join a private community' }, 400);
  }

  const callerUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!callerUser) return notFound('User not found');

  if (callerUser.role === 'STUDENT' && community.level && callerUser.level !== community.level) {
    return c.json({ error: `Students can only join communities that match their level (${community.level})` }, 400);
  }

  const membership = await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId,
      },
    },
    create: {
      communityId: community.id,
      userId,
      role: 'MEMBER',
    },
    update: {},
  });

  return ok(membership);
});

// POST /:id/leave - Leave a community
communityRouter.post('/:id/leave', authenticate, async (c) => {
  const { id } = c.req.param();
  const userId = c.get('user').userId;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
  });
  if (!community) return notFound('Community not found');
  if (community.isSystem) {
    return c.json({ error: 'Cannot leave a system community' }, 400);
  }

  await prisma.communityMember.deleteMany({
    where: {
      communityId: community.id,
      userId,
    },
  });

  return ok({ message: 'Successfully left community' });
});

// POST /:id/request-join - Request to join a private community with screening answers
communityRouter.post('/:id/request-join', authenticate, async (c) => {
  const { id } = c.req.param();
  const userId = c.get('user').userId;
  let body;
  try {
    body = submitJoinRequestSchema.parse(await c.req.json());
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
    include: { joinQuestions: true },
  });
  if (!community) return notFound('Community not found');
  if (!community.isPrivate) {
    return c.json({ error: 'This community is public. Join directly.' }, 400);
  }

  const callerUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!callerUser) return notFound('User not found');

  if (callerUser.role === 'STUDENT' && community.level && callerUser.level !== community.level) {
    return c.json({ error: `Students can only join communities that match their level (${community.level})` }, 400);
  }

  const isMember = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId: community.id, userId } },
  });
  if (isMember) {
    return c.json({ error: 'You are already a member of this community' }, 400);
  }

  const existingRequest = await prisma.communityJoinRequest.findUnique({
    where: { communityId_userId: { communityId: community.id, userId } },
  });
  if (existingRequest && existingRequest.status === 'PENDING') {
    return c.json({ error: 'You have a pending join request for this community' }, 400);
  }

  const request = await prisma.$transaction(async (tx) => {
    const joinRequest = await tx.communityJoinRequest.upsert({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId,
        },
      },
      create: {
        communityId: community.id,
        userId,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
      },
    });

    await tx.communityJoinAnswer.deleteMany({
      where: { requestId: joinRequest.id },
    });

    if (body.answers.length > 0) {
      await tx.communityJoinAnswer.createMany({
        data: body.answers.map((ans: { questionId: string; questionText: string; answer: string }) => ({
          requestId: joinRequest.id,
          questionId: ans.questionId,
          questionText: ans.questionText,
          answer: ans.answer,
        })),
      });
    }

    return joinRequest;
  });

  return ok(request);
});

// GET /:id/join-requests - Get pending join requests for a community (Moderator only)
communityRouter.get('/:id/join-requests', authenticate, async (c) => {
  const { id } = c.req.param();
  const userId = c.get('user').userId;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
  });
  if (!community) return notFound('Community not found');

  const isMod = await prisma.communityMember.findFirst({
    where: {
      communityId: community.id,
      userId,
      role: 'MODERATOR',
    },
  });
  if (!isMod) {
    return forbidden('Only moderators can view join requests');
  }

  const requests = await prisma.communityJoinRequest.findMany({
    where: {
      communityId: community.id,
      status: 'PENDING',
    },
    include: {
      user: { select: { id: true, fullname: true, email: true, level: true, avatarUrl: true } },
      answers: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(requests);
});

// POST /:id/join-requests/:requestId/approve - Approve a join request (Moderator only)
communityRouter.post('/:id/join-requests/:requestId/approve', authenticate, async (c) => {
  const { id, requestId } = c.req.param();
  const userId = c.get('user').userId;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
  });
  if (!community) return notFound('Community not found');

  const isMod = await prisma.communityMember.findFirst({
    where: {
      communityId: community.id,
      userId,
      role: 'MODERATOR',
    },
  });
  if (!isMod) {
    return forbidden('Only moderators can approve join requests');
  }

  const joinRequest = await prisma.communityJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!joinRequest) return notFound('Join request not found');

  const targetUser = await prisma.user.findUnique({
    where: { id: joinRequest.userId },
  });
  if (!targetUser) return notFound('Target user not found');
  if (targetUser.role === 'STUDENT' && community.level && targetUser.level !== community.level) {
    return c.json({ error: `Target user level does not match the community level restriction (${community.level})` }, 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.communityJoinRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    const member = await tx.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: joinRequest.userId,
        },
      },
      create: {
        communityId: community.id,
        userId: joinRequest.userId,
        role: 'MEMBER',
      },
      update: {},
    });

    return member;
  });

  await prisma.notification.create({
    data: {
      userId: joinRequest.userId,
      category: 'FORUM',
      title: 'Join Request Approved',
      message: `Your request to join the community "${community.displayName}" has been approved!`,
      link: `/forum`,
    },
  });

  return ok(result);
});

// POST /:id/join-requests/:requestId/reject - Reject a join request (Moderator only)
communityRouter.post('/:id/join-requests/:requestId/reject', authenticate, async (c) => {
  const { id, requestId } = c.req.param();
  const userId = c.get('user').userId;

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
  });
  if (!community) return notFound('Community not found');

  const isMod = await prisma.communityMember.findFirst({
    where: {
      communityId: community.id,
      userId,
      role: 'MODERATOR',
    },
  });
  if (!isMod) {
    return forbidden('Only moderators can reject join requests');
  }

  const joinRequest = await prisma.communityJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!joinRequest) return notFound('Join request not found');

  await prisma.communityJoinRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED' },
  });

  return ok({ message: 'Request rejected' });
});

// POST /:id/questions - Update screening questions for private communities (Moderator only)
communityRouter.post('/:id/questions', authenticate, async (c) => {
  const { id } = c.req.param();
  const userId = c.get('user').userId;
  const body = await c.req.json();

  const questionsSchema = z.object({
    questions: z.array(z.string().min(3).max(200)).max(5),
  });

  let parsed;
  try {
    parsed = questionsSchema.parse(body);
  } catch (e) {
    return c.var.handleZodError(e);
  }

  const community = await prisma.community.findFirst({
    where: {
      OR: [{ id }, { name: id }],
    },
  });
  if (!community) return notFound('Community not found');

  const isMod = await prisma.communityMember.findFirst({
    where: {
      communityId: community.id,
      userId,
      role: 'MODERATOR',
    },
  });
  if (!isMod) {
    return forbidden('Only moderators can edit screening questions');
  }

  await prisma.$transaction(async (tx) => {
    await tx.communityJoinQuestion.deleteMany({
      where: { communityId: community.id },
    });

    if (parsed.questions.length > 0) {
      await tx.communityJoinQuestion.createMany({
        data: parsed.questions.map((q) => ({
          communityId: community.id,
          question: q,
        })),
      });
    }
  });

  return ok({ message: 'Screening questions updated' });
});

export default communityRouter;
