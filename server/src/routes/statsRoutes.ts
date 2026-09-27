import { Router } from "express";
import { getStoreStats } from "../controllers/storeStatsController";

const router = Router();

// Public — the homepage's stats row. See storeStatsController.ts.
router.get("/", getStoreStats);

export default router;
