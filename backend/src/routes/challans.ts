import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import prisma from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { generateChallanNumber } from "../utils/challanNumber";

const router = Router();

router.use(requireAuth);

const challanItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const createChallanSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(challanItemInput).min(1, "A challan needs at least one product"),
});

const VALID_STATUSES = ["DRAFT", "CONFIRMED", "CANCELLED"] as const;

router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  if (status && !VALID_STATUSES.includes(status as any)) {
    return res.status(400).json({ error: `Invalid status filter. Must be one of: ${VALID_STATUSES.join(", ")}` });
  }

  const where = status ? { status: status as (typeof VALID_STATUSES)[number] } : {};

  const [challans, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { customer: true, items: true },
    }),
    prisma.challan.count({ where }),
  ]);

  res.json({ challans, total, page, pageSize });
});

router.get("/:id", async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: true, createdBy: { select: { name: true, email: true } } },
  });
  if (!challan) return res.status(404).json({ error: "Challan not found" });
  res.json(challan);
});

router.post("/", requireRole("ADMIN", "SALES"), async (req, res) => {
  const parsed = createChallanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { customerId, items } = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  if (products.length !== new Set(productIds).size) {
    return res.status(400).json({ error: "One or more products in this challan don't exist" });
  }

  const productById = new Map(products.map((p) => [p.id, p] as const));
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const challanNumber = await generateChallanNumber();

  const challan = await prisma.challan.create({
    data: {
      challanNumber,
      customerId,
      totalQuantity,
      status: "DRAFT",
      createdById: req.user!.userId,
      items: {
        create: items.map((i) => {
          const product = productById.get(i.productId)!;
          return {
            productId: product.id,
            productNameSnapshot: product.name,
            productPriceSnapshot: product.unitPrice,
            quantity: i.quantity,
          };
        }),
      },
    },
    include: { items: true, customer: true },
  });

  res.status(201).json(challan);
});

router.post("/:id/confirm", requireRole("ADMIN", "SALES", "WAREHOUSE"), async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });

  if (!challan) return res.status(404).json({ error: "Challan not found" });
  if (challan.status !== "DRAFT") {
    return res.status(400).json({ error: `Challan is already ${challan.status.toLowerCase()}, cannot confirm again` });
  }

  const productIds = [...new Set(challan.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p] as const));

  const neededByProduct = new Map<string, number>();
  for (const item of challan.items) {
    neededByProduct.set(item.productId, (neededByProduct.get(item.productId) || 0) + item.quantity);
  }

  for (const [productId, needed] of neededByProduct) {
    const product = productById.get(productId);
    if (!product) {
      return res.status(400).json({ error: "Product in this challan no longer exists" });
    }
    if (product.currentStock < needed) {
      return res.status(400).json({
        error: `Not enough stock for "${product.name}". Available: ${product.currentStock}, needed: ${needed}.`,
      });
    }
  }

  const decrementOps = Array.from(neededByProduct.entries()).map(([productId, needed]) =>
    prisma.product.updateMany({
      where: { id: productId, currentStock: { gte: needed } },
      data: { currentStock: { decrement: needed } },
    })
  );

  const movementLogs = challan.items.map((item) =>
    prisma.stockMovement.create({
      data: {
        productId: item.productId,
        quantityChanged: item.quantity,
        movementType: "OUT",
        reason: `Challan ${challan.challanNumber} confirmed`,
        createdById: req.user!.userId,
      },
    })
  );

  try {
    const [confirmedChallan, ...decrementResults] = await prisma.$transaction([
      prisma.challan.update({
        where: { id: challan.id },
        data: { status: "CONFIRMED" },
        include: { items: true, customer: true },
      }),
      ...decrementOps,
      ...movementLogs,
    ]);

    const failedCount = decrementOps.length;
    const decrementResultsOnly = decrementResults.slice(0, failedCount) as { count: number }[];

    if (decrementResultsOnly.some((r) => r.count === 0)) {
      await prisma.challan.update({ where: { id: challan.id }, data: { status: "DRAFT" } });
      return res.status(409).json({
        error: "Stock changed while confirming this challan. Please review stock and try again.",
      });
    }

    res.json(confirmedChallan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to confirm challan" });
  }
});

router.post("/:id/cancel", requireRole("ADMIN", "SALES"), async (req, res) => {
  const challan = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!challan) return res.status(404).json({ error: "Challan not found" });
  if (challan.status !== "DRAFT") {
    return res.status(400).json({ error: "Only draft challans can be cancelled" });
  }

  const updated = await prisma.challan.update({
    where: { id: challan.id },
    data: { status: "CANCELLED" },
  });

  res.json(updated);
});

router.get("/:id/invoice", async (req, res) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { customer: true, items: true },
  });

  if (!challan) return res.status(404).json({ error: "Challan not found" });
  if (challan.status !== "CONFIRMED") {
    return res.status(400).json({ error: "Invoice is only available for confirmed challans" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${challan.challanNumber}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text("Fundsweb Wholesale", { align: "left" });
  doc.fontSize(10).text("Sales Invoice / Challan", { align: "left" });
  doc.moveDown();

  doc.fontSize(12).text(`Challan Number: ${challan.challanNumber}`);
  doc.text(`Date: ${challan.createdAt.toDateString()}`);
  doc.text(`Status: ${challan.status}`);
  doc.moveDown();

  doc.fontSize(13).text("Bill To:", { underline: true });
  doc.fontSize(11).text(challan.customer.name);
  if (challan.customer.businessName) doc.text(challan.customer.businessName);
  doc.text(challan.customer.mobile);
  if (challan.customer.address) doc.text(challan.customer.address);
  doc.moveDown();

  const tableTop = doc.y;
  doc.fontSize(11).text("Product", 50, tableTop);
  doc.text("Qty", 300, tableTop);
  doc.text("Unit Price", 370, tableTop);
  doc.text("Subtotal", 470, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let y = tableTop + 25;
  let grandTotal = 0;

  for (const item of challan.items) {
    const price = Number(item.productPriceSnapshot);
    const subtotal = price * item.quantity;
    grandTotal += subtotal;

    doc.text(item.productNameSnapshot, 50, y);
    doc.text(String(item.quantity), 300, y);
    doc.text(`Rs. ${price.toFixed(2)}`, 370, y);
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 470, y);
    y += 20;
  }

  doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
  doc.fontSize(13).text(`Grand Total: Rs. ${grandTotal.toFixed(2)}`, 370, y + 15);

  doc.end();
});

export default router;