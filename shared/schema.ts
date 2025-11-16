import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['teacher', 'student']);
export const gameTypeEnum = pgEnum('game_type', [
  'picture_puzzle', 
  'picture_matching', 
  'arrange_timeline', 
  'explain_image', 
  'fill_blanks', 
  'tama_ang_ayos', 
  'true_or_false'
]);
export const lobbyStatusEnum = pgEnum('lobby_status', ['active', 'completed']);
export const gameTopicEnum = pgEnum('game_topic', [
  'philippine_presidents', 
  'spanish_colonial_period', 
  'american_colonial_period', 
  'japanese_occupation',
  'martial_law_era',
  'post_war_period'
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  fullName: text("full_name").notNull(),
  class: text("class"),
});

// Game lobbies table
export const gameLobbies = pgTable("game_lobbies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  lobbyCode: text("lobby_code").notNull().unique(),
  gameType: gameTypeEnum("game_type").notNull(),
  gameTopic: gameTopicEnum("game_topic"), // Optional topic for the game (can be null now)
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  status: lobbyStatusEnum("status").notNull().default('active'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  class: text("class"),
  
  // Custom fields for different game types
  customImageUrl: text("custom_image_url"), // For custom uploaded images in Picture Puzzle
  customImageDescription: text("custom_image_description"), // Description for custom images
  customQuestions: text("custom_questions"), // Custom true/false questions for True or False game
  customExplainImageUrl: text("custom_explain_image_url"), // Custom image for Explain Image game
  customExplainQuestions: text("custom_explain_questions"), // Custom questions for Explain Image game
  customEvents: text("custom_events"), // Custom events for Arrange Timeline game
  customSentences: text("custom_sentences"), // Custom sentences for Fill Blanks game
  customCategories: text("custom_categories"), // Custom categories for Tama ang Ayos game
  customItems: text("custom_items"), // Custom items for Tama ang Ayos game
  
  // Custom fields for Picture Matching
  customMatchingImages: text("custom_matching_images") // JSON array of image objects with imageUrl and description
});

// Participant in game lobbies
export const lobbyParticipants = pgTable("lobby_participants", {
  id: serial("id").primaryKey(),
  lobbyId: integer("lobby_id").notNull().references(() => gameLobbies.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  isReady: boolean("is_ready").default(false), // Player ready status
});

// Game scores
export const gameScores = pgTable("game_scores", {
  id: serial("id").primaryKey(),
  lobbyId: integer("lobby_id").notNull().references(() => gameLobbies.id),
  userId: integer("user_id").notNull().references(() => users.id),
  score: integer("score").notNull(),
  completionTime: integer("completion_time"), // In seconds
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

// Historical artifacts/images for games
export const gameImages = pgTable("game_images", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  description: text("description").notNull(), // Historical fact about the image
  lobbyId: integer("lobby_id").references(() => gameLobbies.id), // Reference to a game lobby
});

// Schemas for data insertion
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  fullName: true,
  class: true,
});

export const insertGameLobbySchema = createInsertSchema(gameLobbies).pick({
  name: true,
  description: true,
  lobbyCode: true,
  gameType: true,
  gameTopic: true,
  teacherId: true,
  status: true,
  class: true,
  // Custom fields for different game types
  customImageUrl: true,
  customImageDescription: true,
  customQuestions: true,
  customExplainImageUrl: true,
  customExplainQuestions: true,
  customEvents: true,
  customSentences: true,
  customCategories: true,
  customItems: true,
  customMatchingImages: true,
});

export const insertLobbyParticipantSchema = createInsertSchema(lobbyParticipants).pick({
  lobbyId: true,
  userId: true,
  isReady: true,
});

export const insertGameScoreSchema = createInsertSchema(gameScores).pick({
  lobbyId: true,
  userId: true,
  score: true,
  completionTime: true,
});

export const insertGameImageSchema = createInsertSchema(gameImages).pick({
  title: true,
  imageUrl: true,
  description: true,
  lobbyId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type GameLobby = typeof gameLobbies.$inferSelect;
export type InsertGameLobby = z.infer<typeof insertGameLobbySchema>;

export type LobbyParticipant = typeof lobbyParticipants.$inferSelect;
export type InsertLobbyParticipant = z.infer<typeof insertLobbyParticipantSchema>;

export type GameScore = typeof gameScores.$inferSelect;
export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;

export type GameImage = typeof gameImages.$inferSelect;
export type InsertGameImage = z.infer<typeof insertGameImageSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gameLobbies: many(gameLobbies),
  lobbyParticipants: many(lobbyParticipants),
  gameScores: many(gameScores),
}));

export const gameLobbiesRelations = relations(gameLobbies, ({ one, many }) => ({
  teacher: one(users, { fields: [gameLobbies.teacherId], references: [users.id] }),
  participants: many(lobbyParticipants),
  scores: many(gameScores),
  images: many(gameImages),
}));

export const lobbyParticipantsRelations = relations(lobbyParticipants, ({ one }) => ({
  lobby: one(gameLobbies, { fields: [lobbyParticipants.lobbyId], references: [gameLobbies.id] }),
  user: one(users, { fields: [lobbyParticipants.userId], references: [users.id] }),
}));

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
  lobby: one(gameLobbies, { fields: [gameScores.lobbyId], references: [gameLobbies.id] }),
  user: one(users, { fields: [gameScores.userId], references: [users.id] }),
}));

export const gameImagesRelations = relations(gameImages, ({ one }) => ({
  lobby: one(gameLobbies, { fields: [gameImages.lobbyId], references: [gameLobbies.id] }),
}));
