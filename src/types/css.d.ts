// Lets TypeScript accept plain CSS imports such as:  import "@/styles/admin.css";
// (Next.js already handles the files at build time; this only silences the editor / `tsc` error TS2882.)
declare module "*.css";