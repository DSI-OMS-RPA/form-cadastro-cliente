import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: appRoot,
  },
  // Permite acesso pelo IP da rede local em modo dev
  // Adicionar aqui o IP do servidor para testes de desenvolvimento
  allowedDevOrigins: ["192.168.87.59"],
};

export default nextConfig;
