import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getDb } from "./db";
import { 
  gameScores, 
  gameLobbies, 
  users, 
  lobbyParticipants 
} from "../shared/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";
import { setupAuth } from "./auth";
import { z } from "zod";
import { WebSocketServer, WebSocket } from 'ws';
import { 
  insertGameLobbySchema, 
  insertLobbyParticipantSchema, 
  insertGameScoreSchema,
  insertGameImageSchema
} from "@shared/schema";
import { nanoid } from "nanoid";
import { uploadImageToSupabase, deleteFileFromSupabase, STORAGE_BUCKET } from "./supabase-utils";

// Helper middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Helper middleware to check if user is a teacher
const isTeacher = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user?.role === 'teacher') {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Teacher access required" });
};

// Helper middleware to check if user is a student
const isStudent = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user?.role === 'student') {
    return next();
  }
  res.status(403).json({ message: "Forbidden: Student access required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // User profile routes
  app.patch("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const { username, fullName, class: className } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Validate data
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      const updateData: Record<string, any> = {};
      if (username) updateData.username = username;
      if (fullName) updateData.fullName = fullName;
      if (className !== undefined) updateData.class = className;
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update session with new user data
      req.login(updatedUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Session update error" });
        }
        res.json(updatedUser);
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  app.patch("/api/user/password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Validate passwords
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new passwords are required" });
      }
      
      // Get user to verify current password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password (reuse function from auth.ts)
      const { comparePasswords, hashPassword } = require('./auth');
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      const success = await storage.updateUserPassword(userId, hashedPassword);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });
  
  app.delete("/api/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found or could not be deleted" });
      }
      
      // Log the user out
      req.logout((err) => {
        if (err) {
          console.error("Error logging out user after deletion:", err);
        }
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Game Lobbies
  app.post("/api/teacher/lobbies", isTeacher, async (req, res) => {
    try {
      const teacher = req.user!;
      
      const lobbyData = insertGameLobbySchema.parse({
        ...req.body,
        teacherId: teacher.id,
        // Generate a unique lobby code if not provided
        lobbyCode: req.body.lobbyCode || generateLobbyCode(req.body.gameType)
      });

      const newLobby = await storage.createGameLobby(lobbyData);
      res.status(201).json(newLobby);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid lobby data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create lobby" });
      }
    }
  });

  // Teacher-specific routes for game lobbies
  app.get("/api/teacher/lobbies", isTeacher, async (req, res) => {
    try {
      const teacher = req.user!;
      const lobbies = await storage.getGameLobbiesByTeacher(teacher.id);
      
      // Get all participant counts in a single operation
      const participantCounts = await storage.getLobbyParticipantCounts(
        lobbies.map(lobby => lobby.id)
      );
      
      // Combine the lobbies with their participant counts
      const lobbiesWithParticipants = lobbies.map(lobby => ({
        ...lobby,
        participantCount: participantCounts[lobby.id] || 0
      }));
      
      res.json(lobbiesWithParticipants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lobbies" });
    }
  });

  app.get("/api/lobbies/student", isStudent, async (req, res) => {
    try {
      const student = req.user!;
      // Get the student's active lobbies
      let activeLobbies = await storage.getStudentActiveLobbies(student.id);
      
      res.json(activeLobbies);
    } catch (error) {
      console.error("Error fetching student lobbies:", error);
      res.status(500).json({ message: "Failed to fetch lobbies" });
    }
  });
  
  // Student-specific API endpoint for leaderboard access (read-only)
  app.get("/api/student/lobbies/:lobbyId/scores", isAuthenticated, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.lobbyId);
      if (isNaN(lobbyId)) {
        return res.status(400).json({ message: "Invalid lobby ID" });
      }
      
      const scores = await storage.getGameScoresByLobby(lobbyId);
      
      // Process scores to only show the highest score per student
      // If scores are tied, sort by submission time (earlier first)
      const userHighestScores = new Map();
      
      for (const score of scores) {
        const userId = score.userId;
        
        if (!userHighestScores.has(userId) || 
            score.score > userHighestScores.get(userId).score || 
            (score.score === userHighestScores.get(userId).score && 
             new Date(score.completedAt) < new Date(userHighestScores.get(userId).completedAt))) {
          userHighestScores.set(userId, score);
        }
      }
      
      // Convert map to array and sort by score (descending)
      const uniqueScores = Array.from(userHighestScores.values())
        .sort((a, b) => {
          // First sort by score (highest first)
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // If tied, sort by submission time (earliest first)
          return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
        });
      
      // Get user details for each score
      const scoresWithUsers = await Promise.all(
        uniqueScores.map(async (score) => {
          const user = await storage.getUser(score.userId);
          return { ...score, user };
        })
      );
      
      res.json(scoresWithUsers);
    } catch (err) {
      console.error("Error fetching lobby scores:", err);
      res.status(500).json({ message: "Error fetching lobby scores" });
    }
  });

  app.get("/api/teacher/lobbies/:id", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const lobby = await storage.getGameLobbyById(lobbyId);
      
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Check if user is the teacher or a participant
      const user = req.user!;
      if (user.role === 'teacher' && lobby.teacherId !== user.id) {
        return res.status(403).json({ message: "You don't have access to this lobby" });
      }
      
      if (user.role === 'student') {
        const participants = await storage.getLobbyParticipants(lobbyId);
        const isParticipant = participants.some(p => p.userId === user.id);
        
        if (!isParticipant) {
          return res.status(403).json({ message: "You are not a participant in this lobby" });
        }
      }
      
      // Get participant count
      const participantCount = await storage.getLobbyParticipantCount(lobbyId);
      
      res.json({ ...lobby, participantCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lobby" });
    }
  });
  
  // Get lobby participants
  app.get("/api/teacher/lobbies/:id/participants", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const lobby = await storage.getGameLobbyById(lobbyId);
      
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Check if user is the teacher or a participant
      const user = req.user!;
      if (user.role === 'teacher' && lobby.teacherId !== user.id) {
        return res.status(403).json({ message: "You don't have access to this lobby" });
      }
      
      const participants = await storage.getLobbyParticipants(lobbyId);
      
      // Enrich participants with user data
      const enrichedParticipants = await Promise.all(
        participants.map(async (participant) => {
          const user = await storage.getUser(participant.userId);
          return {
            ...participant,
            username: user?.username,
            fullName: user?.fullName
          };
        })
      );
      
      res.json(enrichedParticipants);
    } catch (error) {
      console.error("Error fetching lobby participants:", error);
      res.status(500).json({ message: "Failed to fetch lobby participants" });
    }
  });
  
  // Update lobby (supporting both PUT and PATCH)
  app.patch("/api/teacher/lobbies/:id", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const teacher = req.user!;
      
      // Check if lobby exists and belongs to this teacher
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      if (lobby.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You don't have permission to update this lobby" });
      }
      
      // Parse and validate update data
      const updateSchema = z.object({
        name: z.string().min(3, "Name must be at least 3 characters"),
        description: z.string().optional().nullable(),
        status: z.enum(["active", "completed"]),
        words: z.array(z.string()).optional().nullable()
      });
      
      // Convert the request body to validate it
      const validatedData = updateSchema.parse(req.body);
      
      // Prepare data for storage update
      const updateData = {
        ...validatedData
      };
      
      // Update the lobby
      const updatedLobby = await storage.updateGameLobby(lobbyId, updateData);
      if (!updatedLobby) {
        return res.status(500).json({ message: "Failed to update lobby" });
      }
      
      res.json(updatedLobby);
    } catch (error) {
      console.error("Error updating lobby:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid lobby data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update lobby" });
      }
    }
  });
  
  // Update lobby custom fields (including customMatchingImages)
  app.patch("/api/lobbies/:id", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const teacher = req.user!;
      
      // Check if lobby exists and belongs to this teacher
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      if (lobby.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You don't have permission to update this lobby" });
      }
      
      // Allow updating custom fields only
      const updateSchema = z.object({
        customMatchingImages: z.string().optional(),
        customImageUrl: z.string().optional(),
        customImageDescription: z.string().optional(),
        customQuestions: z.string().optional(),
        customExplainImageUrl: z.string().optional(),
        customExplainQuestions: z.string().optional(),
        customEvents: z.string().optional(),
        customSentences: z.string().optional(),
        customCategories: z.string().optional(),
        customItems: z.string().optional(),
      });
      
      // Convert the request body to validate it
      const validatedData = updateSchema.parse(req.body);
      
      // Update the lobby with custom fields
      const updatedLobby = await storage.updateGameLobby(lobbyId, validatedData);
      if (!updatedLobby) {
        return res.status(500).json({ message: "Failed to update lobby" });
      }
      
      res.json(updatedLobby);
    } catch (error) {
      console.error("Error updating lobby custom fields:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid custom field data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update lobby custom fields" });
      }
    }
  });
  
  // Update lobby status
  app.put("/api/teacher/lobbies/:id/status", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const teacher = req.user!;
      
      // Check if lobby exists and belongs to this teacher
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      if (lobby.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You don't have permission to update this lobby" });
      }
      
      // Parse and validate status update
      const { status } = req.body;
      if (!status || !['active', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      // Update the lobby status
      await storage.updateGameLobbyStatus(lobbyId, status);
      
      res.json({ message: "Lobby status updated successfully", status });
    } catch (error) {
      console.error("Error updating lobby status:", error);
      res.status(500).json({ message: "Failed to update lobby status" });
    }
  });
  
  // Delete lobby
  app.delete("/api/teacher/lobbies/:id", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const teacher = req.user!;
      
      // Check if lobby exists and belongs to this teacher
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      if (lobby.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You don't have permission to delete this lobby" });
      }
      
      // Delete the lobby
      const success = await storage.deleteGameLobby(lobbyId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete lobby" });
      }
      
      res.json({ message: "Lobby deleted successfully" });
    } catch (error) {
      console.error("Error deleting lobby:", error);
      res.status(500).json({ message: "Failed to delete lobby" });
    }
  });

  // Remove participant from lobby
  app.delete("/api/teacher/lobbies/:id/participants/:participantId", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const participantId = parseInt(req.params.participantId);
      const teacher = req.user!;
      
      // Check if lobby exists and belongs to this teacher
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      if (lobby.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You don't have permission to manage this lobby" });
      }
      
      // Get the participant
      const participants = await storage.getLobbyParticipants(lobbyId);
      const participant = participants.find(p => p.id === participantId);
      
      if (!participant) {
        return res.status(404).json({ message: "Participant not found" });
      }
      
      // Remove the participant
      const success = await storage.removeParticipantFromLobby(participantId);
      if (!success) {
        return res.status(500).json({ message: "Failed to remove participant" });
      }
      
      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  app.get("/api/lobbies/code/:code", isAuthenticated, async (req, res) => {
    try {
      const code = req.params.code;
      const lobby = await storage.getGameLobbyByCode(code);
      
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Get participant count
      const participantCount = await storage.getLobbyParticipantCount(lobby.id);
      
      res.json({ ...lobby, participantCount });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch lobby" });
    }
  });
  
  // Get lobby by ID - accessible to both teachers and students
  app.get("/api/lobbies/:id", isAuthenticated, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const user = req.user!;
      
      // Get the lobby
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // For teachers, check if they own the lobby
      if (user.role === 'teacher' && lobby.teacherId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to access this lobby" });
      }
      
      // For students, check if they are participants (unless the lobby is active)
      if (user.role === 'student' && lobby.status !== 'active') {
        const participants = await storage.getLobbyParticipants(lobbyId);
        const isParticipant = participants.some(p => p.userId === user.id);
        
        if (!isParticipant) {
          return res.status(403).json({ message: "You don't have permission to access this lobby" });
        }
      }
      
      // Get participant count
      const participantCount = await storage.getLobbyParticipantCount(lobbyId);
      
      res.json({ ...lobby, participantCount });
    } catch (error) {
      console.error("Error fetching lobby:", error);
      res.status(500).json({ message: "Failed to fetch lobby" });
    }
  });

  app.post("/api/lobbies/:id/join", isStudent, async (req, res) => {
    try {
      const student = req.user!;
      const lobbyId = parseInt(req.params.id);
      
      // Check if lobby exists
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Allow joining active lobbies only
      if (lobby.status !== 'active') {
        return res.status(400).json({ message: "This lobby is not available for joining" });
      }
      
      // Check if student is already a participant
      const participants = await storage.getLobbyParticipants(lobbyId);
      const existingParticipant = participants.find(p => p.userId === student.id);
      
      if (existingParticipant) {
        return res.json({ 
          message: "Already joined this lobby", 
          participantId: existingParticipant.id,
          participant: existingParticipant,
          lobby
        });
      }
      
      // No sub-lobby logic needed for the current games
      
      // Add participant to lobby with ready status defaulted to false
      try {
        const participantData = insertLobbyParticipantSchema.parse({
          lobbyId,
          userId: student.id,
          isReady: false
        });
        
        const newParticipant = await storage.addParticipantToLobby(participantData);
        res.status(201).json({ 
          participant: newParticipant,
          lobby
        });
      } catch (innerError) {
        console.error("Error creating participant:", innerError);
        throw innerError;
      }
    } catch (error) {
      console.error("Failed to join lobby:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to join lobby", error: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.post("/api/lobbies/join-by-code", isStudent, async (req, res) => {
    try {
      const student = req.user!;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Lobby code is required" });
      }
      
      const lobby = await storage.getGameLobbyByCode(code);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found with code: " + code });
      }
      
      // Allow joining active lobbies only
      if (lobby.status !== 'active') {
        return res.status(400).json({ message: "This lobby is not available for joining" });
      }
      
      // Check if student is already a participant
      const participants = await storage.getLobbyParticipants(lobby.id);
      const existingParticipant = participants.find(p => p.userId === student.id);
      
      if (existingParticipant) {
        return res.json({ 
          message: "Already joined this lobby", 
          participantId: existingParticipant.id,
          lobby
        });
      }
      
      // No sub-lobby logic needed for current game types
      
      // Add participant to lobby with ready status defaulted to false
      const participantData = insertLobbyParticipantSchema.parse({
        lobbyId: lobby.id,
        userId: student.id,
        isReady: false
      });
      
      const newParticipant = await storage.addParticipantToLobby(participantData);
      res.status(201).json({ 
        participant: newParticipant,
        lobby 
      });
    } catch (error) {
      console.error("Failed to join lobby by code:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to join lobby by code" });
      }
    }
  });

  // Game Scores
  app.post("/api/scores", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      const scoreData = insertGameScoreSchema.parse({
        ...req.body,
        userId: user.id
      });
      
      // Validate the lobby
      const lobby = await storage.getGameLobbyById(scoreData.lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Check if student is a participant
      if (user.role === 'student') {
        const participants = await storage.getLobbyParticipants(scoreData.lobbyId);
        const isParticipant = participants.some(p => p.userId === user.id);
        
        if (!isParticipant) {
          return res.status(403).json({ message: "You are not a participant in this lobby" });
        }
      }
      
      // Check if score already exists for this user in this lobby
      const existingScore = await storage.getGameScoresByLobbyAndUser(scoreData.lobbyId, user.id);
      if (existingScore && user.role === 'student') {
        // Only update if the new score is higher
        if (scoreData.score <= existingScore.score) {
          return res.json({ message: "Existing score is higher", score: existingScore });
        }
      }
      
      const newScore = await storage.addGameScore(scoreData);
      res.status(201).json(newScore);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid score data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save score" });
      }
    }
  });
  
  // Submit score to a specific lobby - used by games
  app.post("/api/lobbies/:id/scores", isAuthenticated, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      const user = req.user!;
      
      // Validate the lobby
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Check if student is a participant
      if (user.role === 'student') {
        const participants = await storage.getLobbyParticipants(lobbyId);
        const isParticipant = participants.some(p => p.userId === user.id);
        
        if (!isParticipant) {
          return res.status(403).json({ message: "You are not a participant in this lobby" });
        }
      }
      
      const scoreData = insertGameScoreSchema.parse({
        ...req.body,
        userId: user.id,
        lobbyId: lobbyId
      });
      
      // Check if score already exists for this user in this lobby
      const existingScore = await storage.getGameScoresByLobbyAndUser(lobbyId, user.id);
      if (existingScore) {
        // Only update if the new score is higher
        if (scoreData.score <= existingScore.score) {
          return res.json({ 
            message: "Existing score is higher", 
            score: existingScore,
            newScore: scoreData.score
          });
        }
      }
      
      const newScore = await storage.addGameScore(scoreData);
      res.status(201).json(newScore);
    } catch (error) {
      console.error("Error submitting score:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid score data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save score" });
      }
    }
  });

  app.get("/api/teacher/lobbies/:id/scores", isTeacher, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      
      // Validate the lobby
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Check access permissions
      const user = req.user!;
      if (user.role === 'teacher' && lobby.teacherId !== user.id) {
        return res.status(403).json({ message: "You don't have access to this lobby's scores" });
      }
      
      if (user.role === 'student') {
        const participants = await storage.getLobbyParticipants(lobbyId);
        const isParticipant = participants.some(p => p.userId === user.id);
        
        if (!isParticipant) {
          return res.status(403).json({ message: "You are not a participant in this lobby" });
        }
      }
      
      const scores = await storage.getGameScoresByLobby(lobbyId);
      
      // Enrich scores with user info
      const enrichedScores = await Promise.all(
        scores.map(async (score) => {
          const user = await storage.getUser(score.userId);
          return {
            ...score,
            user: user ? {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              role: user.role,
              class: user.class
            } : null
          };
        })
      );
      
      res.json(enrichedScores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scores" });
    }
  });

  app.get("/api/leaderboard/:gameType", isAuthenticated, async (req, res) => {
    try {
      const { gameType } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Validate game type
      if (!['picture_puzzle', 'picture_matching', 'true_or_false', 'explain_image', 'fill_blanks', 'arrange_timeline', 'tama_ang_ayos'].includes(gameType)) {
        return res.status(400).json({ message: "Invalid game type" });
      }
      
      const scores = await storage.getTopScoresByGameType(gameType, limit);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });
  
  // API endpoint for student to see leaderboard by lobby (read-only)
  // Shows only highest score per student, with earlier submissions ranked higher in case of ties
  app.get("/api/student/lobbies/:id/scores", isAuthenticated, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      
      // Validate the lobby
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Check access permissions
      const user = req.user!;
      
      // For students, check if they're a participant in this lobby
      if (user.role === 'student') {
        const participants = await storage.getLobbyParticipants(lobbyId);
        const isParticipant = participants.some(p => p.userId === user.id);
        
        if (!isParticipant) {
          return res.status(403).json({ message: "You are not a participant in this lobby" });
        }
      }
      
      const scores = await storage.getGameScoresByLobby(lobbyId);
      
      // Process scores to only show the highest score per student
      // If scores are tied, sort by submission time (earlier first)
      const userHighestScores = new Map();
      
      for (const score of scores) {
        const userId = score.userId;
        
        // If we haven't seen this user yet, or this score is higher than their current best,
        // or this score is the same but was achieved earlier
        if (!userHighestScores.has(userId) || 
            score.score > userHighestScores.get(userId).score || 
            (score.score === userHighestScores.get(userId).score && 
             new Date(score.completedAt) < new Date(userHighestScores.get(userId).completedAt))) {
          userHighestScores.set(userId, score);
        }
      }
      
      // Convert map to array and sort by score (descending)
      const uniqueScores = Array.from(userHighestScores.values())
        .sort((a, b) => {
          // First sort by score (highest first)
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // If tied, sort by submission time (earliest first)
          return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
        });
      
      // Enrich scores with user info
      const enrichedScores = await Promise.all(
        uniqueScores.map(async (score) => {
          const user = await storage.getUser(score.userId);
          return {
            ...score,
            user: user ? {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              role: user.role,
              class: user.class
            } : null
          };
        })
      );
      
      res.json(enrichedScores);
    } catch (error) {
      console.error("Error fetching student lobby scores:", error);
      res.status(500).json({ message: "Failed to fetch scores" });
    }
  });
  
  // Delete a game score - only teachers can delete scores
  app.delete("/api/scores/:id", isTeacher, async (req, res) => {
    try {
      const scoreId = parseInt(req.params.id);
      const teacher = req.user!;
      
      // Get all scores to find the one we want to delete
      const allScores = await storage.getGameScoresByLobby(0); // Get all scores
      const score = allScores.find(s => s.id === scoreId);
      
      if (!score) {
        return res.status(404).json({ message: "Score not found" });
      }
      
      // Get the lobby to check if this teacher owns it
      const lobby = await storage.getGameLobbyById(score.lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Associated lobby not found" });
      }
      
      // Check if this teacher owns the lobby
      if (lobby.teacherId !== teacher.id) {
        return res.status(403).json({ message: "You don't have permission to delete this score" });
      }
      
      const result = await storage.deleteGameScore(scoreId);
      if (result) {
        res.json({ success: true, message: "Score deleted successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to delete score" });
      }
    } catch (error) {
      console.error("Error deleting score:", error);
      res.status(500).json({ message: "Failed to delete score", error: String(error) });
    }
  });

  // Game Images
  app.get("/api/images", isAuthenticated, async (req, res) => {
    try {
      const images = await storage.getGameImages();
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });
  
  // Get game images for a specific lobby (for picture matching game)
  app.get("/api/game-images/:lobbyId", async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.lobbyId);
      
      if (isNaN(lobbyId)) {
        console.error("Invalid lobbyId parameter:", req.params.lobbyId);
        return res.status(400).json({ message: "Invalid lobby ID" });
      }
      
      // Verify the lobby exists first to avoid foreign key issues
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        console.error(`Lobby with ID ${lobbyId} not found`);
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      console.log(`Fetching images for lobby ID ${lobbyId}...`);
      
      // First get all images to debug
      const allImages = await storage.getGameImages();
      console.log(`Total images in database: ${allImages.length}`);
      console.log(`Images with lobbyId ${lobbyId}:`, allImages.filter(img => img.lobbyId === lobbyId).length);
      console.log(`Images with title pattern for lobby ${lobbyId}:`, 
        allImages.filter(img => img.title && (img.title.includes(`lobby ${lobbyId}`))).length);
      
      // Debug image URL properties
      if (allImages.length > 0) {
        const firstImage = allImages[0];
        console.log('Image property inspection:');
        console.log('- Keys:', Object.keys(firstImage));
        console.log('- Has imageUrl:', 'imageUrl' in firstImage);
        console.log('- Has image_url:', 'image_url' in firstImage);
        console.log('- imageUrl value:', (firstImage as any).imageUrl);
        console.log('- image_url value:', (firstImage as any).image_url);
      }
      
      // Use the optimized method for retrieving images by lobby ID
      const lobbyImages = await storage.getGameImagesByLobby(lobbyId);
      
      console.log(`Found ${lobbyImages.length} images for lobby ${lobbyId}`);
      if (lobbyImages.length > 0) {
        const firstImage = lobbyImages[0];
        console.log(`First image:`, {
          id: firstImage.id,
          title: firstImage.title,
          lobbyId: firstImage.lobbyId,
          hasImageUrl: !!firstImage.imageUrl,
          keys: Object.keys(firstImage)
        });

        // Ensure imageUrl property exists in each image object for frontend
        const processedImages = lobbyImages.map(img => {
          // If Drizzle returns snake_case keys, convert the image_url to imageUrl
          if (!img.imageUrl && (img as any).image_url) {
            return {
              ...img,
              imageUrl: (img as any).image_url
            };
          }
          return img;
        });
        
        console.log(`Returning ${processedImages.length} processed images`);
        return res.json(processedImages);
      }
      
      res.json(lobbyImages);
    } catch (error) {
      console.error("Error fetching game images:", error);
      res.status(500).json({ message: "Failed to fetch game images" });
    }
  });
  
  // Create a new game image
  app.post("/api/game-images", isAuthenticated, async (req, res) => {
    try {
      const { imageUrl, description, lobbyId } = req.body;
      
      if (!imageUrl || !description || !lobbyId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Verify the lobby exists before creating a related image
      const parsedLobbyId = parseInt(lobbyId);
      const lobby = await storage.getGameLobbyById(parsedLobbyId);
      if (!lobby) {
        console.error(`Cannot create image: Lobby with ID ${parsedLobbyId} not found`);
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Generate a title based on lobby ID if not provided
      const title = req.body.title || `Image for lobby ${lobbyId}`;

      // Log the request data for debugging
      console.log('Creating game image with:', {
        hasImageUrl: !!imageUrl,
        description: description?.substring(0, 20) + '...',
        title,
        lobbyId
      });

      // Validate the input data through the insert schema
      // Note: The schema expects camelCase field names (imageUrl), but the database
      // column is snake_case (image_url). The ORM should handle this mapping automatically.
      const imageData = insertGameImageSchema.parse({
        imageUrl,
        description,
        title,
        lobbyId: parsedLobbyId
      });
      
      const newImage = await storage.addGameImage(imageData);
      
      // Log the result
      console.log('Created new game image:', {
        id: newImage.id,
        hasImageUrl: !!newImage.imageUrl,
        lobbyId: newImage.lobbyId
      });
      
      res.status(201).json(newImage);
    } catch (error) {
      console.error("Error creating game image:", error);
      res.status(500).json({ message: "Failed to create game image" });
    }
  });
  
  // Update a game image
  app.patch("/api/game-images/:id", isAuthenticated, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid image ID" });
      }
      
      const images = await storage.getGameImages();
      const existingImage = images.find(img => img.id === imageId);
      
      if (!existingImage) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Make sure lobbyId is properly parsed as an integer
      let updateData = { ...req.body };
      if (updateData.lobbyId) {
        updateData.lobbyId = parseInt(updateData.lobbyId);
        
        // Verify the lobby exists before updating with a new lobbyId
        const lobby = await storage.getGameLobbyById(updateData.lobbyId);
        if (!lobby) {
          console.error(`Cannot update image: Lobby with ID ${updateData.lobbyId} not found`);
          return res.status(404).json({ message: "Target lobby not found" });
        }
      }
      
      // Update image (in memory storage only supports full replacement)
      const updatedImage = await storage.addGameImage({
        ...existingImage,
        ...updateData
      });
      
      res.json(updatedImage);
    } catch (error) {
      console.error("Error updating game image:", error);
      res.status(500).json({ message: "Failed to update game image" });
    }
  });
  
  // Delete a game image
  app.delete("/api/game-images/:id", isAuthenticated, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid image ID" });
      }
      
      // Since we're using memory storage, we need to manually handle deletion
      // This will be properly implemented when using a real database
      const images = await storage.getGameImages();
      const existingImage = images.find(img => img.id === imageId);
      
      if (!existingImage) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // For now, we'll return success without actually deleting
      // (MemStorage doesn't support deletion of game images)
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game image:", error);
      res.status(500).json({ message: "Failed to delete game image" });
    }
  });

  // Drawing Sessions - removed

  // Drawing session endpoints removed

  // Drawing guesses and lines endpoints removed

  // Update participant ready status
  app.post("/api/lobbies/:id/ready", isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const lobbyId = parseInt(req.params.id);
      const { isReady } = req.body;
      
      // Validate the input
      if (typeof isReady !== 'boolean') {
        return res.status(400).json({ message: "isReady field must be a boolean" });
      }
      
      // Check if the lobby exists
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Update the participant's ready status
      const updatedParticipant = await storage.updateParticipantReadyStatus(lobbyId, user.id, isReady);
      if (!updatedParticipant) {
        return res.status(404).json({ message: "You are not a participant in this lobby" });
      }
      
      // Check if all participants are ready
      const allReady = await storage.areAllParticipantsReady(lobbyId);
      
      res.json({ 
        participant: updatedParticipant,
        allReady
      });
    } catch (error) {
      console.error("Error updating ready status:", error);
      res.status(500).json({ message: "Failed to update ready status" });
    }
  });
  
  // Check if all participants are ready
  app.get("/api/lobbies/:id/all-ready", isAuthenticated, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      
      // Check if the lobby exists
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Get all participants
      const participants = await storage.getLobbyParticipants(lobbyId);
      
      // Get participant count
      const participantCount = participants.length;
      
      // Check if all are ready
      const allReady = await storage.areAllParticipantsReady(lobbyId);
      
      // No player limit for our current games
      const isFull = false;
      
      res.json({ 
        allReady,
        participantCount,
        isFull
      });
    } catch (error) {
      console.error("Error checking ready status:", error);
      res.status(500).json({ message: "Failed to check ready status" });
    }
  });
  
  // Get lobby participants with user details
  app.get("/api/lobbies/:id/participants-with-status", isAuthenticated, async (req, res) => {
    try {
      const lobbyId = parseInt(req.params.id);
      
      // Check if the lobby exists
      const lobby = await storage.getGameLobbyById(lobbyId);
      if (!lobby) {
        return res.status(404).json({ message: "Lobby not found" });
      }
      
      // Get all participants
      const participants = await storage.getLobbyParticipants(lobbyId);
      
      // Enrich with user data
      const enrichedParticipants = await Promise.all(
        participants.map(async (participant) => {
          const user = await storage.getUser(participant.userId);
          return {
            ...participant,
            username: user?.username,
            fullName: user?.fullName
          };
        })
      );
      
      res.json(enrichedParticipants);
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server (on a different path than Vite's HMR WebSocket)
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map to track active connections by lobby ID
  const lobbyConnections: Record<string, Set<WebSocket>> = {};
  
  wss.on('connection', (ws) => {
    let clientLobbyId: string | null = null;
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle connection to a specific lobby
        if (data.type === 'join_lobby') {
          const lobbyId = String(data.lobbyId);
          clientLobbyId = lobbyId;
          
          // Add this connection to the lobby's set
          if (!lobbyConnections[lobbyId]) {
            lobbyConnections[lobbyId] = new Set();
          }
          lobbyConnections[lobbyId].add(ws);
          
          // Send confirmation
          ws.send(JSON.stringify({ 
            type: 'lobby_joined', 
            lobbyId, 
            message: `Connected to lobby ${lobbyId}` 
          }));
          
          console.log(`Client joined lobby: ${lobbyId}, total clients: ${lobbyConnections[lobbyId].size}`);
        }
      } catch (err) {
        console.error('Invalid WebSocket message:', err);
      }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
      if (clientLobbyId && lobbyConnections[clientLobbyId]) {
        lobbyConnections[clientLobbyId].delete(ws);
        
        // Clean up empty sets
        if (lobbyConnections[clientLobbyId].size === 0) {
          delete lobbyConnections[clientLobbyId];
        }
        
        console.log(`Client left lobby: ${clientLobbyId}, remaining clients: ${
          lobbyConnections[clientLobbyId]?.size || 0
        }`);
      }
    });
  });
  
  // Broadcast message to all clients in a specific lobby
  const broadcastToLobby = (lobbyId: number, message: any) => {
    const lobbyIdStr = String(lobbyId);
    const connections = lobbyConnections[lobbyIdStr];
    
    if (connections && connections.size > 0) {
      const messageStr = JSON.stringify(message);
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageStr);
        }
      });
      console.log(`Broadcast to lobby ${lobbyId}: ${connections.size} clients received message`);
    }
  };
  
  // Helper function to wrap an endpoint handler to add broadcasting
  const wrapEndpointWithBroadcast = (endpoint: any, path: string, method: string, transformFn: (req: Request, body: any) => Promise<{ lobbyId: number, message: any } | null> | { lobbyId: number, message: any } | null) => {
    const targetEndpoint = app._router.stack.find(
      (layer: any) => layer.route && layer.route.path === path && layer.route.methods[method]
    );
    
    if (targetEndpoint) {
      const originalHandler = targetEndpoint.route.stack[0].handle;
      
      targetEndpoint.route.stack[0].handle = async (req: Request, res: Response, next: Function) => {
        // Store the original json method
        const originalJson = res.json;
        
        // Override the json method to intercept the response
        res.json = function(body) {
          // Restore the original json method
          res.json = originalJson;
          
          try {
            // Apply transform function to get broadcast message
            const transformResult = transformFn(req, body);
            
            // Handle both synchronous and asynchronous transform functions
            if (transformResult instanceof Promise) {
              // For async transforms, process after original response is sent
              transformResult.then(broadcastData => {
                if (broadcastData) {
                  broadcastToLobby(broadcastData.lobbyId, broadcastData.message);
                }
              }).catch(error => {
                console.error('Error in async broadcast transform function:', error);
              });
            } else if (transformResult) {
              // For sync transforms, broadcast immediately
              broadcastToLobby(transformResult.lobbyId, transformResult.message);
            }
          } catch (error) {
            console.error('Error in broadcast transform function:', error);
          }
          
          // Call the original json method
          return originalJson.call(this, body);
        };
        
        // Call the original route handler
        return originalHandler(req, res, next);
      };
    }
  };
  
  // Add broadcast to the ready status endpoint
  wrapEndpointWithBroadcast(
    app, 
    '/api/lobbies/:id/ready', 
    'post',
    (req, body) => {
      if (body && body.participant) {
        return {
          lobbyId: parseInt(req.params.id),
          message: {
            type: 'ready_status_updated',
            participant: body.participant,
            allReady: body.allReady
          }
        };
      }
      return null;
    }
  );
  
  // Drawing broadcast wrappers removed
  
  // Supabase Storage Integration - Image Upload and Deletion
  
  // Upload image to Supabase Storage
  app.post("/api/upload-image", isAuthenticated, async (req, res) => {
    try {
      const { image, folder = 'game-images' } = req.body;
      
      if (!image) {
        return res.status(400).json({ message: "Image data is required" });
      }
      
      console.log('Processing image upload to Supabase Storage...');
      const { url, error } = await uploadImageToSupabase(image, folder);
      
      if (error) {
        console.error('Image upload error:', error);
        return res.status(500).json({ message: "Failed to upload image", error: error.message });
      }
      
      console.log('Image uploaded successfully to:', url);
      return res.json({ url });
    } catch (error) {
      console.error('Unexpected error during image upload:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete image from Supabase Storage
  app.post("/api/delete-image", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: "Image URL is required" });
      }
      
      console.log('Processing image deletion from Supabase Storage...');
      const { success, error } = await deleteFileFromSupabase(url);
      
      if (error) {
        console.error('Image deletion error:', error);
        // Continue anyway to prevent blocking user experience
        return res.json({ success: true, message: "Operation processed (with issues)" });
      }
      
      console.log('Image deleted successfully');
      return res.json({ success });
    } catch (error) {
      console.error('Unexpected error during image deletion:', error);
      // Return success anyway to prevent blocking user experience
      res.json({ success: true, message: "Operation processed (with issues)" });
    }
  });

  return httpServer;
}

// Helper function to generate a unique lobby code
function generateLobbyCode(gameType: string): string {
  let prefix = '';
  
  if (gameType === 'picture_puzzle') {
    prefix = 'PUZ';
  } else if (gameType === 'picture_matching') {
    prefix = 'MAT';
  } else if (gameType === 'true_or_false') {
    prefix = 'TOF';
  } else if (gameType === 'explain_image') {
    prefix = 'EXP';
  } else if (gameType === 'fill_blanks') {
    prefix = 'FIL';
  } else if (gameType === 'arrange_timeline') {
    prefix = 'TIM';
  } else if (gameType === 'tama_ang_ayos') {
    prefix = 'TAA';
  } else {
    prefix = 'GME';
  }
  
  const randomPart = nanoid(3).toUpperCase();
  return `${prefix}-${randomPart}`;
}
