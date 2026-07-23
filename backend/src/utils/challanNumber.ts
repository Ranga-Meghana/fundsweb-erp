import prisma from "../lib/prisma";

export async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `CH-${year}-`;

  const countThisYear = await prisma.challan.count({
    where: { challanNumber: { startsWith: yearPrefix } },
  });

  const nextNumber = (countThisYear + 1).toString().padStart(4, "0");
  return `${yearPrefix}${nextNumber}`;
}