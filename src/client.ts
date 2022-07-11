import { createSSGHelpers } from '@trpc/react/ssg';
import * as trpc from '@trpc/server';
import { PostFindManySchema } from './generated/schemas/findManyPost.schema';
import { PrismaClient, Prisma } from '@prisma/client';
import * as z from 'zod';

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

const run = async () => {
  const {
    prefetchQuery,
    prefetchInfiniteQuery,
    fetchQuery,
    fetchInfiniteQuery,
    dehydrate,
    queryClient,
  } = createSSGHelpers({
    router: appRouter,
    ctx: createContext(),
  });

  const test1 = async () => {
    await prefetchQuery('test1', {
      take: 5,
      where: { AND: [{ id: { gt: 1 } }] },
    });

    await prefetchQuery('test2', {
      take: 5,
      where: { AND: [{ id: { gt: 1 } }] },
    });

    console.log(
      queryClient
        .getQueryCache()
        .getAll()
        .map((item) => item.state.data),
    );
  };

  await test1();

  const test2 = async () => {
    await prefetchQuery('test1', {
      //@ts-ignore
      where: { AND: [{ helloWorld: { gt: 1 } }] },
    });

    await prefetchQuery('test2', {
      //@ts-ignore
      where: { AND: [{ helloWorld: { gt: 1 } }] },
    });
  };

  await test2();

  process.exit();
};

run();
