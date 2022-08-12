import { Router } from "express";
import { hashtagPosts, trendingRanking } from "../controllers/trendingController.js";
import { validateToken } from "../middlewares/validators/tokenValidator.js";

const router = Router();

router.get('/trendingRanking', validateToken, trendingRanking);
router.post('/hashtagPosts/:hashtag', validateToken, hashtagPosts);

export default router;