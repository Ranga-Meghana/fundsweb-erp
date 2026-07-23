import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional().nullable(),
  unitPrice: z.number().positive(),
  currentStock: z.number().int().min(0).optional(),
  minStockAlert: z.number().int().min(0).optional(),
  location: z.string().optional().nullable(),
});

router.use(requireAuth);

router.get("/", async (req, res) => {
  const search = (req.query.search as string) || "";
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const lowStockOnly = req.query.lowStock === "true";

  try {
    if (lowStockOnly) {
      const searchFilter = search
        ? Prisma.sql`AND ("name" ILIKE ${"%" + search + "%"} OR "sku" ILIKE ${"%" + search + "%"})`
        : Prisma.empty;

      const products = await prisma.$queryRaw<any[]>`
        SELECT * FROM "Product"
        WHERE "currentStock" <= "minStockAlert"
        ${searchFilter}
        ORDER BY "createdAt" DESC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `;

      const totalResult = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM "Product"
        WHERE "currentStock" <= "minStockAlert"
        ${searchFilter}
      `;

      const total = Number(totalResult[0]?.count ?? 0);

      return res.json({ products, total, page, pageSize });
    }

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { stockMovements: { orderBy: { timestamp: "desc" }, take: 50 } },
  });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.post("/", requireRole("ADMIN", "WAREHOUSE"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const existingSku = await prisma.product.findUnique({ where: { sku: parsed.data.sku } });
  if (existingSku) {
    return res.status(409).json({ error: "A product with this SKU already exists" });
  }

  const product = await prisma.product.create({ data: parsed.data });
  res.status(201).json(product);
});

router.put("/:id", requireRole("ADMIN", "WAREHOUSE"), async (req, res) => {
  const parsed = productSchema.partial().omit({ currentStock: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(product);
  } catch (err) {
    res.status(404).json({ error: "Product not found" });
  }
});

const stockMovementSchema = z.object({
  quantityChanged: z.number().int().positive(),
  movementType: z.enum(["IN", "OUT"]),
  reason: z.string().min(1),
});

router.post("/:id/stock-movement", requireRole("ADMIN", "WAREHOUSE"), async (req, res) => {
  const parsed = stockMovementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const { quantityChanged, movementType, reason } = parsed.data;
  const delta = movementType === "IN" ? quantityChanged : -quantityChanged;

  if (movementType === "OUT" && product.currentStock < quantityChanged) {
    return res.status(400).json({
      error: `Not enough stock. Current stock is ${product.currentStock}, cannot remove ${quantityChanged}.`,
    });
  }

  try {
    const [updateResult, movement] = await prisma.$transaction([
      prisma.product.updateMany({
        where: {
          id: product.id,
          ...(movementType === "OUT" ? { currentStock: { gte: quantityChanged } } : {}),
        },
        data: { currentStock: { increment: delta } },
      }),
      prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantityChanged,
          movementType,
          reason,
          createdById: req.user!.userId,
        },
      }),
    ]);

    if (updateResult.count === 0) {
      return res.status(409).json({
        error: "Stock changed concurrently. Please refresh and try again.",
      });
    }

    const updatedProduct = await prisma.product.findUnique({ where: { id: product.id } });
    res.status(201).json({ newStock: updatedProduct!.currentStock, movement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record stock movement" });
  }
});

export default router;