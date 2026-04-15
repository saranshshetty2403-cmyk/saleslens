// Vercel Serverless Function entry point.
// Imports from the pre-built CJS bundle (dist/vercel-app.cjs) which is generated
// during the build step. Using CJS format to avoid ESM/CJS interop issues with
// Express and its dependencies that use dynamic require().
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const app = require("../dist/vercel-app.cjs");

export default app.default ?? app;
