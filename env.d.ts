declare module '*.css'

declare module 'vitepress' {
  export function defineConfig(config: Record<string, unknown>): Record<string, unknown>
}

declare module 'vitepress/theme' {
  const theme: Record<string, unknown>
  export default theme
}
