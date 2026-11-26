import { handleRequest } from './routes/request-handler';

const port = 3333;

Bun.serve({ port, fetch: handleRequest });

console.info(`API local disponível em http://localhost:${port}`);
