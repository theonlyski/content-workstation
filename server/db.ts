import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/content.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    board_id INTEGER NOT NULL,
    day INTEGER,
    seed_idea TEXT NOT NULL DEFAULT '',
    pillar TEXT,
    pillar_source TEXT NOT NULL DEFAULT 'ai',
    job TEXT,
    job_source TEXT NOT NULL DEFAULT 'ai',
    stage TEXT NOT NULL DEFAULT 'draft',
    angle_candidates TEXT NOT NULL DEFAULT '[]',
    selected_angle_index INTEGER,
    hooks TEXT NOT NULL DEFAULT '[]',
    selected_hook_index INTEGER,
    caption TEXT NOT NULL DEFAULT '',
    repurposed TEXT NOT NULL DEFAULT '{}',
    review TEXT NOT NULL DEFAULT '{}',
    notes TEXT NOT NULL DEFAULT '',
    parent_idea_id TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_ideas_board_id ON ideas(board_id);
  CREATE INDEX IF NOT EXISTS idx_boards_month ON boards(month);
`);

// Helper to parse JSON fields from DB
function parseIdea(row: any): any {
  return {
    id: row.id,
    day: row.day,
    seedIdea: row.seed_idea,
    pillar: row.pillar,
    pillarSource: row.pillar_source,
    job: row.job,
    jobSource: row.job_source,
    stage: row.stage,
    angleCandidates: JSON.parse(row.angle_candidates || '[]'),
    selectedAngleIndex: row.selected_angle_index,
    hooks: JSON.parse(row.hooks || '[]'),
    selectedHookIndex: row.selected_hook_index,
    caption: row.caption,
    repurposed: JSON.parse(row.repurposed || '{}'),
    review: JSON.parse(row.review || '{}'),
    notes: row.notes,
    parentIdeaId: row.parent_idea_id,
    updatedAt: row.updated_at,
  };
}

// Helper to stringify JSON fields for DB
function prepareIdea(idea: any): any {
  return {
    ...idea,
    angle_candidates: JSON.stringify(idea.angleCandidates || []),
    hooks: JSON.stringify(idea.hooks || []),
    repurposed: JSON.stringify(idea.repurposed || {}),
    review: JSON.stringify(idea.review || {}),
  };
}

// Board operations
export function getBoardByMonth(month: string): any | null {
  const board = db.prepare('SELECT * FROM boards WHERE month = ?').get(month) as any;
  if (!board) return null;

  const ideas = db.prepare('SELECT * FROM ideas WHERE board_id = ?').all(board.id);
  return {
    id: board.id,
    month: board.month,
    ideas: ideas.map(parseIdea),
    createdAt: board.created_at,
    updatedAt: board.updated_at,
  };
}

export function getAllBoards(): any[] {
  const boards = db.prepare('SELECT * FROM boards ORDER BY month DESC').all() as any[];
  return boards.map(board => {
    const ideas = db.prepare('SELECT * FROM ideas WHERE board_id = ?').all(board.id);
    return {
      id: board.id,
      month: board.month,
      ideas: ideas.map(parseIdea),
      createdAt: board.created_at,
      updatedAt: board.updated_at,
    };
  });
}

export function createBoard(month: string): any {
  const now = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO boards (month, created_at, updated_at) VALUES (?, ?, ?)'
  ).run(month, now, now);

  return {
    id: result.lastInsertRowid,
    month,
    ideas: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBoard(boardId: number, ideas: any[]): void {
  const now = new Date().toISOString();

  // Delete existing ideas and insert new ones
  const deleteStmt = db.prepare('DELETE FROM ideas WHERE board_id = ?');
  const insertStmt = db.prepare(`
    INSERT INTO ideas (
      id, board_id, day, seed_idea, pillar, pillar_source, job, job_source,
      stage, angle_candidates, selected_angle_index, hooks, selected_hook_index,
      caption, repurposed, review, notes, parent_idea_id, updated_at
    ) VALUES (
      @id, @boardId, @day, @seedIdea, @pillar, @pillarSource, @job, @jobSource,
      @stage, @angleCandidates, @selectedAngleIndex, @hooks, @selectedHookIndex,
      @caption, @repurposed, @review, @notes, @parentIdeaId, @updatedAt
    )
  `);

  const transaction = db.transaction((ideas) => {
    deleteStmt.run(boardId);
    for (const idea of ideas) {
      const prepared = prepareIdea(idea);
      insertStmt.run({
        id: prepared.id,
        boardId,
        day: prepared.day,
        seedIdea: prepared.seedIdea,
        pillar: prepared.pillar,
        pillarSource: prepared.pillarSource,
        job: prepared.job,
        jobSource: prepared.jobSource,
        stage: prepared.stage,
        angleCandidates: prepared.angle_candidates,
        selectedAngleIndex: prepared.selectedAngleIndex,
        hooks: prepared.hooks,
        selectedHookIndex: prepared.selectedHookIndex,
        caption: prepared.caption,
        repurposed: prepared.repurposed,
        review: prepared.review,
        notes: prepared.notes,
        parentIdeaId: prepared.parentIdeaId,
        updatedAt: prepared.updatedAt,
      });
    }
    db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(now, boardId);
  });

  transaction(ideas);
}

export function deleteBoard(id: number): void {
  db.prepare('DELETE FROM boards WHERE id = ?').run(id);
}
