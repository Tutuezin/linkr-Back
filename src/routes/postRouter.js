

import { Router } from 'express';

import newPostSchema from '../schemas/newPostSchema.js';

import { createPost, getPosts } from '../controllers/postController.js';
import { validateToken } from '../middlewares/validators/tokenValidator.js';
import { validateSchema } from '../middlewares/validators/schemaValidator.js';

const router = Router();

//Colocar o validateToken na rota getposts!!!

router.post('/newpost', validateSchema(newPostSchema) , createPost);
router.get('/getposts', getPosts)
export default router;


