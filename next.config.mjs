import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
  // Permite acesso pelo IP da rede local em modo dev (necessário para testar no servidor)
  // Adicionar o IP do servidor se necessário, ex: ["192.168.87.59"]
  allowedDevOrigins: ["*"],
  // Para Next.js 16 que ainda usa lista de strings:
  // allowedDevOrigins: ["192.168.87.59"],
};

export default nextConfig;
