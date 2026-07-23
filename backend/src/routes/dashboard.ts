import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  const [
    totalCustomers,
    activeCustomers,
    totalProducts,
    allProducts,
    totalChallans,
    draftChallans,
    confirmedChallans,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.product.count(),
    prisma.product.findMany({ select: { currentStock: true, minStockAlert: true } }),
    prisma.challan.count(),
    prisma.challan.count({ where: { status: "DRAFT" } }),
    prisma.challan.count({ where: { status: "CONFIRMED" } }),
  ]);

  const lowStockCount = allProducts.filter((p) => p.currentStock <= p.minStockAlert).length;

  const confirmedItems = await prisma.challanItem.findMany({
    where: { challan: { status: "CONFIRMED" } },
    select: { quantity: true, productPriceSnapshot: true },
  });

  const totalRevenue = confirmedItems.reduce(
    (sum, item) => sum + item.quantity * Number(item.productPriceSnapshot),
    0
  );

  res.json({
    customers: { total: totalCustomers, active: activeCustomers },
    products: { total: totalProducts, lowStock: lowStockCount },
    challans: { total: totalChallans, draft: draftChallans, confirmed: confirmedChallans },
    totalRevenue,
  });
});

export default router;