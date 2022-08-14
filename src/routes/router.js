import { Router } from "express";
import postRouter from "./postRouter.js";
import authRouter from "./authRouter.js";
import trendingRouter from "./trendingRouter.js";
import userPageRouter from "./userPageRouter.js";
import hash from "./trendingRouter.js";
import likesRouter from "./likesRouter.js";

const router = Router();

router.use(authRouter);
router.use(trendingRouter);
router.use(userPageRouter);
router.use(postRouter);
router.use(likesRouter)

export default router;
