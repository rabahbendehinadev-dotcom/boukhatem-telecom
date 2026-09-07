import { Router, type IRouter } from "express";
import { eq, avg, count, sql } from "drizzle-orm";
import { db, reviewsTable, usersTable, productsTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/products/:productId/reviews", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const reviews = await db.select({
    id: reviewsTable.id,
    productId: reviewsTable.productId,
    userId: reviewsTable.userId,
    userName: usersTable.name,
    rating: reviewsTable.rating,
    comment: reviewsTable.comment,
    createdAt: reviewsTable.createdAt,
  }).from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(reviewsTable.createdAt);
  res.json(reviews.map((r) => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
});

router.post("/products/:productId/reviews", requireAuth, async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId as string, 10);
  const userId = (req as any).userId;
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating 1-5 requis" });
    return;
  }
  const [review] = await db.insert(reviewsTable).values({ productId, userId, rating, comment }).returning();
  // Update product average rating
  const [stats] = await db.select({ avg: avg(reviewsTable.rating), count: count() }).from(reviewsTable).where(eq(reviewsTable.productId, productId));
  await db.update(productsTable).set({ averageRating: String(parseFloat(stats.avg || "0").toFixed(2)), reviewCount: stats.count }).where(eq(productsTable.id, productId));
  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
  res.status(201).json({ ...review, userName: user?.name || "Anonyme", createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt });
});

export default router;
