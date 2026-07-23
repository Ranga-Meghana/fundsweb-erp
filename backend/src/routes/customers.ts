import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(1),
  email: z.string().email().optional().nullable(),
  businessName: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().optional().nullable(),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]).optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.use(requireAuth);

router.get("/", async (req, res) => {
  const search = (req.query.search as string) || "";
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { businessName: { contains: search, mode: "insensitive" as const } },
          { mobile: { contains: search } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  res.json({ customers, total, page, pageSize });
});

router.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { challans: { orderBy: { createdAt: "desc" } } },
  });

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }
  res.json(customer);
});

router.post("/", requireRole("ADMIN", "SALES"), async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const customer = await prisma.customer.create({
    data: {
      ...parsed.data,
      followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
    },
  });

  res.status(201).json(customer);
});

router.put("/:id", requireRole("ADMIN", "SALES"), async (req, res) => {
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : undefined,
      },
    });
    res.json(customer);
  } catch (err) {
    res.status(404).json({ error: "Customer not found" });
  }
});

const noteSchema = z.object({ note: z.string().min(1) });

router.post("/:id/notes", requireRole("ADMIN", "SALES"), async (req, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ error: "Customer not found" });
  }

  const timestamp = new Date().toLocaleString();
  const updatedNotes = existing.notes
    ? `${existing.notes}\n[${timestamp}] ${parsed.data.note}`
    : `[${timestamp}] ${parsed.data.note}`;

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { notes: updatedNotes },
  });

  res.json(customer);
});

export default router;