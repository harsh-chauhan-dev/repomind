import { app } from './app.js';

const port = Number(process.env.API_PORT ?? 5000);
app.listen(port, () => console.log(`RepoMind API listening on port ${port}`));
