/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENSOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
