// Vercel Serverless Function entry point.
// Imports from the pre-built bundle (dist/vercel-app.js) which is generated
// during the build step. This avoids Vercel's TypeScript compiler failing to
// resolve relative imports from ../server/_core/*.
import app from "../dist/vercel-app.js";

export default app;
