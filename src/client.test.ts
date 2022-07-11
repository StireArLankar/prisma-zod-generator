import { createSSGHelpers } from '@trpc/react/ssg';
import * as trpc from '@trpc/server';
import { PostFindManySchema } from './generated/schemas/findManyPost.schema';
import { PrismaClient, Prisma, Post } from '@prisma/client';
import * as z from 'zod';
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

const prisma = new PrismaClient();

const createContext = () => ({ prisma });

const input = z.object({}).passthrough();

type Omitted<T extends {}> = Omit<T, 'select' | 'include'>;

const appRouter = trpc
  .router<ReturnType<typeof createContext>>()
  .query('test1', {
    input: PostFindManySchema,
    resolve: async ({ input, ctx }) => {
      const posts = await ctx.prisma.post.findMany(input);
      return posts;
    },
  })
  .query('test2', {
    input: input as z.ZodType<Omitted<Prisma.PostFindManyArgs>>,
    resolve: async ({ input, ctx }) => {
      const posts = await ctx.prisma.post.findMany(input);
      return posts;
    },
  });

let ssgHelpers = createSSGHelpers({
  router: appRouter,
  ctx: createContext(),
});

ssgHelpers.queryClient.setDefaultOptions({ queries: { retry: 1 } });

beforeAll(() => {
  ssgHelpers = createSSGHelpers({
    router: appRouter,
    ctx: createContext(),
  });

  ssgHelpers.queryClient.setDefaultOptions({ queries: { retry: 1 } });
});

afterEach(() => {
  ssgHelpers.queryClient.clear();
});

describe('is works', () => {
  it('for test1', async () => {
    await ssgHelpers.prefetchQuery('test1', {
      take: 5,
      where: { AND: [{ id: { gt: 2 } }] },
    });

    const cache = ssgHelpers.queryClient
      .getQueryCache()
      .get('["test1",{"take":5,"where":{"AND":[{"id":{"gt":2}}]}}]');

    const state = cache?.state.data as Post[];

    expect(state).toBeDefined();

    expect(state).length(2);

    expect(state[0].id).toBe(3);
    expect(state[0].authorId).toBe(3);
  });

  it('for test2', async () => {
    await ssgHelpers.prefetchQuery('test2', {
      take: 5,
      where: { AND: [{ id: { gt: 2 } }] },
    });

    const cache = ssgHelpers.queryClient
      .getQueryCache()
      .get('["test2",{"take":5,"where":{"AND":[{"id":{"gt":2}}]}}]');

    const state = cache?.state.data as Post[];

    expect(state).toBeDefined();

    expect(state).length(2);

    expect(state[0].id).toBe(3);
    expect(state[0].authorId).toBe(3);
  });
});

describe('is throws', () => {
  it('for PostFindManySchema', async () => {
    const test1 = () =>
      PostFindManySchema.parseAsync({
        take: 5,
        where: { helloWorld: 5 },
      });

    await expect(test1()).rejects.toThrow();
  });

  it('for prisma', async () => {
    const test1 = () =>
      prisma.post.findMany({
        take: 5,
        //@ts-ignore
        where: { helloWorld: 5 },
      });

    await expect(test1()).rejects.toThrow();
  });
});
