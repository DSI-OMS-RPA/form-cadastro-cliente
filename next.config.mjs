import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
  // Permite acesso pelo IP da rede local em modo dev (necessário para testar no servidor)
  allowedDevOrigins: ["*"],
};

export default nextConfig;
