import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const trainerSaves = pgTable("trainer_saves", {
  playerId: text("player_id").primaryKey(),
  state: jsonb("state").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type TrainerSaveRow = typeof trainerSaves.$inferSelect;
export type InsertTrainerSave = typeof trainerSaves.$inferInsert;
