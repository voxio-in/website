// Prompts live as .md files and are imported with Vite's ?raw suffix, which
// inlines the file contents as a string at build time.
declare module '*.md?raw' {
  const content: string
  export default content
}
