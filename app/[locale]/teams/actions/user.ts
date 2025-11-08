import { prisma } from "@/lib/prisma";

export async function getTraderById(slug: string) {
  try {
    const trader = await prisma.user.findUnique({
      where: { id: slug },
      select: {
        id: true,
        email: true,
      },
    })
    return trader;
  } catch (error) {
    console.error('Error fetching trader:', error);
    return null;
  }
}