"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AuthenticationPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: String(formData.get("username") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      }),
    });

    const payload = (await response.json()) as { error?: string };
    setIsLoading(false);

    if (!response.ok) {
      setError(payload.error || "Não foi possível iniciar sessão.");
      return;
    }

    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-700">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[420px] rounded-[10px] border border-slate-200 bg-white px-7 py-8 shadow-form"
      >
        <div className="mb-7 text-center">
          <Image
            src="/cvt_logo.png"
            alt="CVTelecom"
            width={217}
            height={59}
            style={{ height: "auto" }}
            className="mx-auto w-full max-w-[210px]"
            priority
          />
          <h1 className="mt-6 text-2xl font-extrabold text-brand-blue">Autenticação</h1>
          <p className="mt-2 text-sm text-slate-500">Projeto GPON - IFT Cadastro Clientes</p>
        </div>

        <label className="mb-5 block">
          <span className="mb-2 block text-[15px] font-medium text-slate-700">Utilizador</span>
          <input name="username" autoComplete="username" className="field-input" required />
        </label>

        <label className="mb-5 block">
          <span className="mb-2 block text-[15px] font-medium text-slate-700">Palavra-passe</span>
          <input name="password" type="password" autoComplete="current-password" className="field-input" required />
        </label>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="h-11 w-full rounded-md bg-brand-blue text-sm font-bold text-white transition hover:bg-brand-blueDark focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "A entrar..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
