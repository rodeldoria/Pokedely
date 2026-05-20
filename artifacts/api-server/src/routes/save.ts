import { Router, type IRouter } from "express";
import { db, trainerSaves } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Normalize player IDs to a lowercase slug — the frontend passes a friendly
// trainer name like "Addie" and we want it to map to the same row regardless
// of case or surrounding whitespace.
function normalizeId(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 64);
}

router.get("/save/:playerId", async (req, res) => {
  const playerId = normalizeId(req.params.playerId);
  if (!playerId) {
    res.status(400).json({ error: "playerId required" });
    return;
  }
  const rows = await db
    .select()
    .from(trainerSaves)
    .where(eq(trainerSaves.playerId, playerId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json({
    playerId: row.playerId,
    state: row.state,
    updatedAt: row.updatedAt,
  });
});

router.put("/save/:playerId", async (req, res) => {
  const playerId = normalizeId(req.params.playerId);
  if (!playerId) {
    res.status(400).json({ error: "playerId required" });
    return;
  }
  const state = req.body?.state;
  if (!state || typeof state !== "object") {
    res.status(400).json({ error: "state object required in body" });
    return;
  }
  const now = new Date();
  await db
    .insert(trainerSaves)
    .values({ playerId, state, updatedAt: now })
    .onConflictDoUpdate({
      target: trainerSaves.playerId,
      set: { state, updatedAt: now },
    });
  res.json({ ok: true, playerId, updatedAt: now });
});

export default router;
