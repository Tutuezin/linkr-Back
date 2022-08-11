import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import router from "./routes/router.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

app.use(router)

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));