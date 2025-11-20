/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_MODE: string
  // Agrega aquí todas tus variables de entorno...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}