import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    article: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    commentLike: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a top-level comment', async () => {
      const articleId = 'article-123';
      const userId = 'user-123';
      const createCommentDto = {
        content: 'Test comment',
        parentId: null,
      };

      const mockArticle = {
        id: articleId,
        deletedAt: null,
      };

      const mockComment = {
        id: 'comment-123',
        content: 'Test comment',
        articleId,
        userId,
        parentId: null,
        depth: 1,
        likesCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        user: {
          id: userId,
          username: 'testuser',
          avatar: null,
        },
      };

      mockPrismaService.article.findUnique.mockResolvedValue(mockArticle);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.comment.create.mockResolvedValue(mockComment);
      mockPrismaService.article.update.mockResolvedValue({});

      const result = await service.createComment(articleId, userId, createCommentDto);

      expect(result).toEqual({
        id: mockComment.id,
        content: mockComment.content,
        likesCount: mockComment.likesCount,
        createdAt: mockComment.createdAt,
        updatedAt: mockComment.updatedAt,
        depth: mockComment.depth,
        articleId: mockComment.articleId,
        userId: mockComment.userId,
        user: mockComment.user,
        parentId: mockComment.parentId,
        deletedAt: mockComment.deletedAt,
      });
      expect(mockPrismaService.article.findUnique).toHaveBeenCalledWith({
        where: { id: articleId, deletedAt: null },
      });
      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: {
          content: createCommentDto.content,
          articleId,
          userId,
          parentId: null,
          depth: 1,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });
      expect(mockPrismaService.article.update).toHaveBeenCalledWith({
        where: { id: articleId },
        data: { commentsCount: { increment: 1 } },
      });
    });
  });
});