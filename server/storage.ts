import { gameLobbies, users, gameScores, lobbyParticipants, gameImages, 
  type User, type InsertUser, type GameLobby, type InsertGameLobby, type GameScore, type InsertGameScore,
  type LobbyParticipant, type InsertLobbyParticipant, type GameImage, type InsertGameImage } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { eq, and, desc, sql, inArray, asc, like, isNotNull, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, pool, supabase } from "./db";
import connectPgSimple from 'connect-pg-simple';
import { uploadImageToSupabase } from "./supabase-utils";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPgSimple(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined>;
  updateUserPassword(id: number, newPassword: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  
  // Game lobby methods
  createGameLobby(lobby: InsertGameLobby): Promise<GameLobby>;
  getGameLobbyByCode(code: string): Promise<GameLobby | undefined>;
  getGameLobbyById(id: number): Promise<GameLobby | undefined>;
  getGameLobbiesByTeacher(teacherId: number): Promise<GameLobby[]>;
  updateGameLobbyStatus(id: number, status: string): Promise<void>;
  updateGameLobby(id: number, data: Partial<Omit<GameLobby, "id" | "teacherId" | "lobbyCode" | "createdAt" | "status">>): Promise<GameLobby | undefined>;
  deleteGameLobby(id: number): Promise<boolean>;
  
  // Lobby participants methods
  addParticipantToLobby(participant: InsertLobbyParticipant): Promise<LobbyParticipant>;
  getLobbyParticipants(lobbyId: number): Promise<LobbyParticipant[]>;
  getLobbyParticipantCount(lobbyId: number): Promise<number>;
  getLobbyParticipantCounts(lobbyIds: number[]): Promise<Record<number, number>>;
  getStudentActiveLobbies(userId: number): Promise<GameLobby[]>;
  removeParticipantFromLobby(participantId: number): Promise<boolean>;
  getLobbyParticipant(lobbyId: number, userId: number): Promise<LobbyParticipant | undefined>;
  updateParticipantReadyStatus(lobbyId: number, userId: number, isReady: boolean): Promise<LobbyParticipant | undefined>;
  areAllParticipantsReady(lobbyId: number): Promise<boolean>;
  
  // Game scores methods
  addGameScore(score: InsertGameScore): Promise<GameScore>;
  getGameScoresByLobby(lobbyId: number): Promise<GameScore[]>;
  getGameScoresByLobbyAndUser(lobbyId: number, userId: number): Promise<GameScore | undefined>;
  getTopScoresByGameType(gameType: string, limit?: number): Promise<any[]>;
  deleteGameScore(id: number): Promise<boolean>;
  
  // Game images methods
  getGameImages(): Promise<GameImage[]>;
  getGameImagesByLobby(lobbyId: number): Promise<GameImage[]>;
  addGameImage(image: InsertGameImage): Promise<GameImage>;

  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameLobbies: Map<number, GameLobby>;
  private lobbyParticipants: Map<number, LobbyParticipant>;
  private gameScores: Map<number, GameScore>;
  private gameImages: Map<number, GameImage>;
  sessionStore: any;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.gameLobbies = new Map();
    this.lobbyParticipants = new Map();
    this.gameScores = new Map();
    this.gameImages = new Map();
    this.currentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Add some sample game images
    this.seedGameImages();
  }

  private seedGameImages() {
    const images = [
      {
        title: "Rizal Monument",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Rizal_Monument_in_Luneta_-_panoramio.jpg",
        description: "The Rizal Monument is a memorial in Rizal Park, Manila, to commemorate the Filipino nationalist and hero José Rizal."
      },
      {
        title: "EDSA Revolution",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/18/Edsa_revolution_25_anniversary.jpg",
        description: "The People Power Revolution was a series of popular demonstrations in the Philippines, mostly in Metro Manila, from February 22-25, 1986."
      },
      {
        title: "Aguinaldo Shrine",
        imageUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Aguinaldo_Shrine_front_view.jpg",
        description: "The Aguinaldo Shrine is where Philippine independence was declared on June 12, 1898."
      },
      {
        title: "Ferdinand Marcos",
        imageUrl: "/attached_assets/ferdinand marcos.jpg",
        description: "Ferdinand Emmanuel Edralin Marcos Sr. (September 11, 1917 – September 28, 1989) was a Filipino politician, lawyer, and kleptocrat who served as the 10th president of the Philippines from 1965 to 1986."
      }
    ];
    
    for (const image of images) {
      this.addGameImage(image as InsertGameImage);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    // Ensure class field is null when undefined
    const user: User = { 
      ...insertUser, 
      id,
      class: insertUser.class ?? null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // Make sure class field is explicitly set to null when undefined
    const updatedUser: User = { 
      ...user, 
      ...data,
      class: data.class ?? user.class
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    
    user.password = newPassword;
    this.users.set(id, user);
    return true;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async createGameLobby(lobby: InsertGameLobby): Promise<GameLobby> {
    const id = this.currentId++;
    const newLobby = { 
      ...lobby, 
      id, 
      createdAt: new Date(),
      class: lobby.class || null,
      status: lobby.status || 'active',
      description: lobby.description || null,
      customItems: lobby.customItems || null,
      gameTopic: lobby.gameTopic || null
    } as GameLobby;
    this.gameLobbies.set(id, newLobby);
    return newLobby;
  }

  async getGameLobbyByCode(code: string): Promise<GameLobby | undefined> {
    return Array.from(this.gameLobbies.values()).find(
      (lobby) => lobby.lobbyCode === code
    );
  }

  async getGameLobbyById(id: number): Promise<GameLobby | undefined> {
    return this.gameLobbies.get(id);
  }

  async getGameLobbiesByTeacher(teacherId: number): Promise<GameLobby[]> {
    return Array.from(this.gameLobbies.values())
      .filter(lobby => lobby.teacherId === teacherId)
      .sort((a, b) => {
        // Sort by created date descending
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  


  async updateGameLobbyStatus(id: number, status: string): Promise<void> {
    const lobby = this.gameLobbies.get(id);
    if (lobby) {
      lobby.status = status as any;
      this.gameLobbies.set(id, lobby);
    }
  }
  
  async updateGameLobby(id: number, data: Partial<Omit<GameLobby, "id" | "teacherId" | "lobbyCode" | "createdAt" | "status">>): Promise<GameLobby | undefined> {
    const lobby = this.gameLobbies.get(id);
    if (!lobby) return undefined;
    
    const updatedLobby: GameLobby = {
      ...lobby,
      ...data,
      // Ensure fields stay consistent
      name: data.name ?? lobby.name,
      description: data.description ?? lobby.description,
      class: data.class ?? lobby.class,
      customItems: data.customItems ?? lobby.customItems,
      gameTopic: data.gameTopic ?? lobby.gameTopic
    };
    
    this.gameLobbies.set(id, updatedLobby);
    return updatedLobby;
  }
  
  async deleteGameLobby(id: number): Promise<boolean> {
    // First, delete all participants and scores related to this lobby
    const participantsToDelete = Array.from(this.lobbyParticipants.values())
      .filter(p => p.lobbyId === id)
      .map(p => p.id);
    
    for (const participantId of participantsToDelete) {
      this.lobbyParticipants.delete(participantId);
    }
    
    const scoresToDelete = Array.from(this.gameScores.values())
      .filter(s => s.lobbyId === id)
      .map(s => s.id);
    
    for (const scoreId of scoresToDelete) {
      this.gameScores.delete(scoreId);
    }
    
    // Finally, delete the lobby itself
    const result = this.gameLobbies.delete(id);
    
    // Find the highest ID across all entity types to ensure we don't reuse IDs
    if (result) {
      const allIds = [
        ...Array.from(this.users.keys()),
        ...Array.from(this.gameLobbies.keys()),
        ...Array.from(this.lobbyParticipants.keys()),
        ...Array.from(this.gameScores.keys()),
        ...Array.from(this.gameImages.keys())
      ];
      
      const maxId = allIds.length > 0 ? Math.max(...allIds) : 0;
      this.currentId = Math.max(this.currentId, maxId + 1);
    }
    
    return result;
  }

  async addParticipantToLobby(participant: InsertLobbyParticipant): Promise<LobbyParticipant> {
    const id = this.currentId++;
    const newParticipant: LobbyParticipant = {
      ...participant,
      id,
      joinedAt: new Date(),
      isReady: participant.isReady === true ? true : false
    };
    this.lobbyParticipants.set(id, newParticipant);
    return newParticipant;
  }

  async getLobbyParticipants(lobbyId: number): Promise<LobbyParticipant[]> {
    return Array.from(this.lobbyParticipants.values())
      .filter(participant => participant.lobbyId === lobbyId);
  }

  async getLobbyParticipantCount(lobbyId: number): Promise<number> {
    return Array.from(this.lobbyParticipants.values())
      .filter(participant => participant.lobbyId === lobbyId)
      .length;
  }
  
  async getLobbyParticipantCounts(lobbyIds: number[]): Promise<Record<number, number>> {
    const counts: Record<number, number> = {};
    
    // Initialize counts with zeros
    for (const lobbyId of lobbyIds) {
      counts[lobbyId] = 0;
    }
    
    // Count participants for each lobby in a single loop through all participants
    const participants = Array.from(this.lobbyParticipants.values());
    for (const participant of participants) {
      if (lobbyIds.includes(participant.lobbyId)) {
        counts[participant.lobbyId] = (counts[participant.lobbyId] || 0) + 1;
      }
    }
    
    return counts;
  }

  async getStudentActiveLobbies(userId: number): Promise<GameLobby[]> {
    // Get all lobbies where the student is a participant
    const participantLobbies = Array.from(this.lobbyParticipants.values())
      .filter(participant => participant.userId === userId)
      .map(participant => participant.lobbyId);
    
    return Array.from(this.gameLobbies.values())
      .filter(lobby => participantLobbies.includes(lobby.id) && lobby.status === 'active');
  }
  
  async removeParticipantFromLobby(participantId: number): Promise<boolean> {
    return this.lobbyParticipants.delete(participantId);
  }
  
  async getLobbyParticipant(lobbyId: number, userId: number): Promise<LobbyParticipant | undefined> {
    return Array.from(this.lobbyParticipants.values())
      .find(p => p.lobbyId === lobbyId && p.userId === userId);
  }
  
  async updateParticipantReadyStatus(lobbyId: number, userId: number, isReady: boolean): Promise<LobbyParticipant | undefined> {
    const participant = await this.getLobbyParticipant(lobbyId, userId);
    if (!participant) return undefined;
    
    const updatedParticipant: LobbyParticipant = {
      ...participant,
      isReady
    };
    
    this.lobbyParticipants.set(participant.id, updatedParticipant);
    return updatedParticipant;
  }
  
  async areAllParticipantsReady(lobbyId: number): Promise<boolean> {
    const participants = Array.from(this.lobbyParticipants.values())
      .filter(p => p.lobbyId === lobbyId);
    
    if (participants.length === 0) return false;
    return participants.every(p => p.isReady === true);
  }

  async addGameScore(score: InsertGameScore): Promise<GameScore> {
    const id = this.currentId++;
    const newScore: GameScore = {
      ...score,
      id,
      completedAt: new Date(),
      completionTime: score.completionTime || null
    };
    this.gameScores.set(id, newScore);
    return newScore;
  }

  async getGameScoresByLobby(lobbyId: number): Promise<GameScore[]> {
    // If lobbyId is 0, return all scores (used for admin functions like deletion)
    if (lobbyId === 0) {
      return Array.from(this.gameScores.values());
    }
    
    return Array.from(this.gameScores.values())
      .filter(score => score.lobbyId === lobbyId)
      .sort((a, b) => b.score - a.score); // Sort by score descending
  }

  async getGameScoresByLobbyAndUser(lobbyId: number, userId: number): Promise<GameScore | undefined> {
    return Array.from(this.gameScores.values())
      .find(score => score.lobbyId === lobbyId && score.userId === userId);
  }

  async deleteGameScore(id: number): Promise<boolean> {
    return this.gameScores.delete(id);
  }

  async getTopScoresByGameType(gameType: string, limit: number = 10): Promise<any[]> {
    // We need to join the scores with users and lobbies
    // For in-memory DB, we'll need to do this manually
    const lobbiesOfType = Array.from(this.gameLobbies.values())
      .filter(lobby => lobby.gameType === gameType);
    
    const lobbyIds = lobbiesOfType.map(lobby => lobby.id);
    
    // Get all scores for lobbies of this game type
    const allScores = Array.from(this.gameScores.values())
      .filter(score => lobbyIds.includes(score.lobbyId));
    
    // Group by userId and keep only the highest score per user
    const userHighestScores = new Map<number, GameScore>();
    
    // First sort by completion time (ascending) so earlier submissions get priority
    const sortedScores = [...allScores].sort((a, b) => {
      // First check for completion date
      if (a.completedAt && b.completedAt) {
        return a.completedAt.getTime() - b.completedAt.getTime();
      }
      return 0; // If no completion date, preserve original order
    });
    
    // Then find highest score per user
    for (const score of sortedScores) {
      const existingScore = userHighestScores.get(score.userId);
      if (!existingScore || score.score > existingScore.score) {
        userHighestScores.set(score.userId, score);
      }
    }
    
    // Convert map to array and sort by score (descending)
    const highestScores = Array.from(userHighestScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    // Enrich the scores with user and lobby info
    return highestScores.map(score => {
      const user = this.users.get(score.userId);
      const lobby = this.gameLobbies.get(score.lobbyId);
      return {
        ...score,
        user: user ? { id: user.id, username: user.username, fullName: user.fullName, class: user.class } : null,
        lobby: lobby ? { id: lobby.id, name: lobby.name, gameType: lobby.gameType } : null
      };
    });
  }

  async getGameImages(): Promise<GameImage[]> {
    return Array.from(this.gameImages.values());
  }

  async getGameImagesByLobby(lobbyId: number): Promise<GameImage[]> {
    // First try to filter by lobbyId field (new schema)
    let images = Array.from(this.gameImages.values())
      .filter(img => (img as any).lobbyId === lobbyId);
    
    // If no images found with the lobbyId field (backward compatibility)
    if (images.length === 0) {
      // Fallback to filtering by title pattern
      images = Array.from(this.gameImages.values())
        .filter(img => {
          // Check for "for lobby {lobbyId}" format
          if (img.title && img.title.includes(`for lobby ${lobbyId}`)) {
            return true;
          }
          
          // Check for "Matching image for lobby {lobbyId}" format
          if (img.title && img.title.includes(`Matching image for lobby ${lobbyId}`)) {
            return true;
          }
          
          return false;
        });
    }
    
    return images;
  }

  async addGameImage(image: InsertGameImage): Promise<GameImage> {
    const id = this.currentId++;
    const newImage: GameImage = { ...image, id };
    this.gameImages.set(id, newImage);
    return newImage;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Use PostgreSQL for session storage with Supabase
    try {
      console.log('Setting up PostgreSQL session store...');
      this.sessionStore = new PostgresSessionStore({
        pool,
        tableName: 'sessions',
        createTableIfMissing: true
      });
      console.log('PostgreSQL session store initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PostgreSQL session store:', error);
      console.log('Falling back to memory store for sessions');
      // Fallback to memory store if PostgreSQL fails
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const db = getDb();
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async updateUser(id: number, data: Partial<Omit<User, "id">>): Promise<User | undefined> {
    const db = getDb();
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async deleteUser(id: number): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createGameLobby(lobby: InsertGameLobby): Promise<GameLobby> {
    const db = getDb();
    // Generate a unique lobby code if not provided
    if (!lobby.lobbyCode) {
      let prefix = 'GEN';
      switch (lobby.gameType) {
        case 'picture_puzzle':
          prefix = 'PUZ';
          break;
        case 'picture_matching':
          prefix = 'MAT';
          break;
        case 'arrange_timeline':
          prefix = 'TIM';
          break;
        case 'explain_image':
          prefix = 'EXP';
          break;
        case 'fill_blanks':
          prefix = 'FIL';
          break;
        case 'tama_ang_ayos':
          prefix = 'TAM';
          break;
        case 'true_or_false':
          prefix = 'TOF';
          break;
      }
      lobby.lobbyCode = `${prefix}-${nanoid(4)}`;
    }
    const [newLobby] = await db.insert(gameLobbies).values(lobby).returning();
    return newLobby;
  }

  async getGameLobbyByCode(code: string): Promise<GameLobby | undefined> {
    const db = getDb();
    const [lobby] = await db.select().from(gameLobbies).where(eq(gameLobbies.lobbyCode, code));
    return lobby;
  }

  async getGameLobbyById(id: number): Promise<GameLobby | undefined> {
    const db = getDb();
    const [lobby] = await db.select().from(gameLobbies).where(eq(gameLobbies.id, id));
    return lobby;
  }

  async getGameLobbiesByTeacher(teacherId: number): Promise<GameLobby[]> {
    const db = getDb();
    return await db.select()
      .from(gameLobbies)
      .where(eq(gameLobbies.teacherId, teacherId))
      .orderBy(desc(gameLobbies.createdAt));
  }
  


  async updateGameLobbyStatus(id: number, status: string): Promise<void> {
    const db = getDb();
    await db.update(gameLobbies)
      .set({ status: status as any })
      .where(eq(gameLobbies.id, id));
  }
  
  async updateGameLobby(id: number, data: Partial<Omit<GameLobby, "id" | "teacherId" | "lobbyCode" | "createdAt" | "status">>): Promise<GameLobby | undefined> {
    const db = getDb();
    const [updatedLobby] = await db.update(gameLobbies)
      .set(data)
      .where(eq(gameLobbies.id, id))
      .returning();
    return updatedLobby;
  }
  
  async deleteGameLobby(id: number): Promise<boolean> {
    const db = getDb();
    
    try {
      // Delete scores
      await db.delete(gameScores)
        .where(eq(gameScores.lobbyId, id));
      
      // Delete participants
      await db.delete(lobbyParticipants)
        .where(eq(lobbyParticipants.lobbyId, id));
      
      // Delete associated game images (for picture matching game)
      console.log(`Deleting associated game images for lobby ${id}...`);
      await db.delete(gameImages)
        .where(eq(gameImages.lobbyId, id));
      
      // Finally, delete the lobby
      const result = await db.delete(gameLobbies)
        .where(eq(gameLobbies.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting lobby ${id}:`, error);
      throw error;
    }
  }

  async addParticipantToLobby(participant: InsertLobbyParticipant): Promise<LobbyParticipant> {
    const db = getDb();
    
    // Ensure we have proper default values set for the participant
    const participantWithDefaults = {
      ...participant,
      joinedAt: new Date(),
      isReady: participant.isReady === true
    };
    
    try {
      const [newParticipant] = await db.insert(lobbyParticipants)
        .values(participantWithDefaults)
        .returning();
      return newParticipant;
    } catch (error) {
      console.error("Error adding participant to lobby:", error);
      throw error;
    }
  }

  async getLobbyParticipants(lobbyId: number): Promise<LobbyParticipant[]> {
    const db = getDb();
    return await db.select()
      .from(lobbyParticipants)
      .where(eq(lobbyParticipants.lobbyId, lobbyId));
  }

  async getLobbyParticipantCount(lobbyId: number): Promise<number> {
    const db = getDb();
    
    // Type cast the result to handle the SQL count result properly
    type CountResult = { count: unknown };
    
    const result = await db.select({ count: sql`count(*)` })
      .from(lobbyParticipants)
      .where(eq(lobbyParticipants.lobbyId, lobbyId)) as CountResult[];
    
    // Handle the result properly to avoid type uncertainty
    if (result && result.length > 0 && result[0].count !== undefined) {
      return parseInt(String(result[0].count));
    }
    return 0;
  }
  
  async getLobbyParticipantCounts(lobbyIds: number[]): Promise<Record<number, number>> {
    if (lobbyIds.length === 0) return {};
    
    const db = getDb();
    const counts: Record<number, number> = {};
    
    // Initialize all requested lobby IDs with 0 count
    for (const id of lobbyIds) {
      counts[id] = 0;
    }
    
    // Execute a single optimized SQL query that groups by lobby ID and counts
    const result = await db.select({
        lobbyId: lobbyParticipants.lobbyId,
        count: sql`count(*)`
      })
      .from(lobbyParticipants)
      .where(inArray(lobbyParticipants.lobbyId, lobbyIds))
      .groupBy(lobbyParticipants.lobbyId);
    
    // Update the counts from query results
    for (const row of result) {
      if (row.lobbyId !== undefined && row.count !== undefined) {
        counts[row.lobbyId] = parseInt(String(row.count));
      }
    }
    
    return counts;
  }

  async getStudentActiveLobbies(userId: number): Promise<GameLobby[]> {
    const db = getDb();
    // Get all active lobbies where the student is a participant
    const participantLobbies = await db.select({
      lobbyId: lobbyParticipants.lobbyId
    }).from(lobbyParticipants)
      .where(eq(lobbyParticipants.userId, userId));
    
    if (participantLobbies.length === 0) {
      return [];
    }
    
    const lobbyIds = participantLobbies.map(p => p.lobbyId);
    
    return await db.select()
      .from(gameLobbies)
      .where(and(
        inArray(gameLobbies.id, lobbyIds),
        eq(gameLobbies.status, 'active')
      ));
  }
  
  async removeParticipantFromLobby(participantId: number): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(lobbyParticipants)
      .where(eq(lobbyParticipants.id, participantId));
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async getLobbyParticipant(lobbyId: number, userId: number): Promise<LobbyParticipant | undefined> {
    const db = getDb();
    const [participant] = await db.select()
      .from(lobbyParticipants)
      .where(and(
        eq(lobbyParticipants.lobbyId, lobbyId),
        eq(lobbyParticipants.userId, userId)
      ));
    return participant;
  }
  
  async updateParticipantReadyStatus(lobbyId: number, userId: number, isReady: boolean): Promise<LobbyParticipant | undefined> {
    const db = getDb();
    const participant = await this.getLobbyParticipant(lobbyId, userId);
    if (!participant) return undefined;
    
    const [updatedParticipant] = await db.update(lobbyParticipants)
      .set({ isReady })
      .where(eq(lobbyParticipants.id, participant.id))
      .returning();
    
    return updatedParticipant;
  }
  
  async areAllParticipantsReady(lobbyId: number): Promise<boolean> {
    const db = getDb();
    const participants = await db.select()
      .from(lobbyParticipants)
      .where(eq(lobbyParticipants.lobbyId, lobbyId));
    
    if (participants.length === 0) return false;
    return participants.every(p => p.isReady === true);
  }

  async addGameScore(score: InsertGameScore): Promise<GameScore> {
    const db = getDb();
    const [newScore] = await db.insert(gameScores)
      .values(score)
      .returning();
    return newScore;
  }

  async getGameScoresByLobby(lobbyId: number): Promise<GameScore[]> {
    const db = getDb();
    
    // If lobbyId is 0, return all scores (used for admin functions like deletion)
    if (lobbyId === 0) {
      return await db.select().from(gameScores);
    }
    
    return await db.select()
      .from(gameScores)
      .where(eq(gameScores.lobbyId, lobbyId))
      .orderBy(desc(gameScores.score));
  }

  async getGameScoresByLobbyAndUser(lobbyId: number, userId: number): Promise<GameScore | undefined> {
    const db = getDb();
    const [score] = await db.select()
      .from(gameScores)
      .where(and(
        eq(gameScores.lobbyId, lobbyId),
        eq(gameScores.userId, userId)
      ));
    return score;
  }
  
  async deleteGameScore(id: number): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(gameScores)
      .where(eq(gameScores.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getTopScoresByGameType(gameType: string, limit: number = 10): Promise<any[]> {
    const db = getDb();
    
    // First get all lobbies of this game type
    const gameTypeLobbies = await db.select({
      id: gameLobbies.id
    })
    .from(gameLobbies)
    .where(eq(gameLobbies.gameType, gameType as any));
    
    if (gameTypeLobbies.length === 0) {
      return [];
    }
    
    const lobbyIds = gameTypeLobbies.map(lobby => lobby.id);
    
    // First, get all scores with user information
    const allScores = await db.select({
      scoreId: gameScores.id,
      score: gameScores.score,
      completionTime: gameScores.completionTime,
      completedAt: gameScores.completedAt,
      userId: gameScores.userId,
      lobbyId: gameScores.lobbyId,
      username: users.username,
      fullName: users.fullName,
      class: users.class,
      lobbyName: gameLobbies.name,
      gameType: gameLobbies.gameType
    })
    .from(gameScores)
    .innerJoin(users, eq(gameScores.userId, users.id))
    .innerJoin(gameLobbies, eq(gameScores.lobbyId, gameLobbies.id))
    .where(inArray(gameScores.lobbyId, lobbyIds))
    .orderBy(asc(gameScores.completedAt)); // Order by completion time ascending
    
    // Group by userId and keep only the highest score
    const userHighestScores = new Map<number, any>();
    
    // Process scores, keeping the highest score per user
    // Since we ordered by completion time, earlier submissions are processed first
    for (const score of allScores) {
      const existingScore = userHighestScores.get(score.userId);
      if (!existingScore || score.score > existingScore.score) {
        userHighestScores.set(score.userId, score);
      }
    }
    
    // Convert to array, sort by score, and limit
    const topScores = Array.from(userHighestScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return topScores.map(score => ({
      id: score.scoreId,
      score: score.score,
      completionTime: score.completionTime,
      completedAt: score.completedAt,
      userId: score.userId,
      lobbyId: score.lobbyId,
      user: {
        id: score.userId,
        username: score.username,
        fullName: score.fullName,
        class: score.class
      },
      lobby: {
        id: score.lobbyId,
        name: score.lobbyName,
        gameType: score.gameType
      }
    }));
  }

  async getGameImages(): Promise<GameImage[]> {
    const db = getDb();
    return await db.select().from(gameImages);
  }

  async getGameImagesByLobby(lobbyId: number): Promise<GameImage[]> {
    const db = getDb();
    
    // First try to get images directly by lobbyId
    const directImages = await db.select()
      .from(gameImages)
      .where(eq(gameImages.lobbyId, lobbyId));
    
    // If we found images directly, return them
    if (directImages.length > 0) {
      return directImages;
    }
    
    // For backward compatibility, if no direct images found, search by title pattern
    return await db.select()
      .from(gameImages)
      .where(
        or(
          sql`${gameImages.title} LIKE ${'%for lobby ' + lobbyId + '%'}`,
          sql`${gameImages.title} LIKE ${'%Matching image for lobby ' + lobbyId + '%'}`
        )
      );
  }

  async addGameImage(image: InsertGameImage): Promise<GameImage> {
    const db = getDb();
    
    // Log the image data for debugging
    console.log('Adding game image:', { 
      id: image.id, 
      hasImageUrl: !!image.imageUrl,
      title: image.title,
      lobbyId: image.lobbyId
    });
    
    // First verify if the lobby exists (to avoid foreign key constraint issues)
    if (image.lobbyId) {
      const lobby = await this.getGameLobbyById(image.lobbyId);
      if (!lobby) {
        throw new Error(`Cannot add image: Lobby with ID ${image.lobbyId} does not exist`);
      }
    }
    
    // If the image URL is a base64 data URL, upload it to Supabase Storage using our utility
    if (image.imageUrl && image.imageUrl.startsWith('data:image')) {
      try {
        // Use our Supabase utility to upload the image
        const { url, error } = await uploadImageToSupabase(image.imageUrl);
        
        if (error) {
          console.error('Error uploading image to Supabase Storage:', error);
        } else if (url) {
          // Update the image URL to the Storage URL
          image.imageUrl = url;
          console.log('Image uploaded to Supabase Storage:', url);
        }
      } catch (error) {
        console.error('Error processing image upload:', error);
      }
    }
    
    try {
      // Save the image metadata to the database
      // Note: The Drizzle ORM should handle the mapping between imageUrl in JavaScript 
      // and image_url in the database automatically based on the schema
      const [newImage] = await db.insert(gameImages)
        .values(image)
        .returning();
      
      return newImage;
    } catch (error) {
      console.error('Error creating game image in database:', error);
      throw new Error('Failed to create game image');
    }
  }
}

// Choose the storage implementation based on environment
// Always use DatabaseStorage since we have DATABASE_URL in our environment
export const storage = new DatabaseStorage();
