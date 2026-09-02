import { Router } from 'express';
import { getBoardByMonth, getAllBoards, createBoard, updateBoard, deleteBoard } from '../db.js';

const router = Router();

// GET /api/boards - list all boards
router.get('/', (req, res) => {
  try {
    const boards = getAllBoards();
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// GET /api/boards/:month - get board by month
router.get('/:month', (req, res) => {
  try {
    const board = getBoardByMonth(req.params.month);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// POST /api/boards - create new board
router.post('/', (req, res) => {
  try {
    const { month } = req.body;
    if (!month) {
      return res.status(400).json({ error: 'Month is required' });
    }

    // Check if board already exists
    const existing = getBoardByMonth(month);
    if (existing) {
      return res.status(409).json({ error: 'Board already exists for this month' });
    }

    const board = createBoard(month);
    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// PUT /api/boards/:month - update board (save ideas)
router.put('/:month', (req, res) => {
  try {
    const { month } = req.params;
    const { ideas } = req.body;

    const board = getBoardByMonth(month);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    if (!Array.isArray(ideas)) {
      return res.status(400).json({ error: 'Ideas must be an array' });
    }

    updateBoard(board.id, ideas);
    const updated = getBoardByMonth(month);
    res.json(updated);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
});

// DELETE /api/boards/:id - delete board
router.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid board ID' });
    }

    deleteBoard(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
});

export default router;
