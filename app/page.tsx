"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  HomeIcon,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { locations } from "@/data/locations";

const SatelliteMapModal = dynamic(() => import("@/components/SatelliteMapModal"), {
  ssr: false,
});

const housingTypes = [
  "Uni-familiar",
  "Multi-familiar",
  "Comercial",
  "Mista",
  "Terreno",
  "Condomínio",
];

const housingStatus = [
  "Construída",
  "Em construção",
  "Apenas Lotes",
];

type Coordinates = {
  latitude: string;
  longitude: string;
  accuracy: string;
};

type RegistrationRecord = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  location: {
    island: string;
    council: string;
    zone: string;
    neighborhood: string;
    street?: string;
    doorReference?: string;
    housingType: string;
    housingStatus: string;
    apartmentCount?: string;
    gps: {
      latitude: string;
      longitude: string;
      accuracy?: string;
    };
  };
  clients: {
    name: string;
    phone?: string;
    nif?: string;
    document?: string;
    serviceNumber?: string;
    floor?: string;
    apartmentLocation?: string;
  }[];
  createdBy?: {
    username: string;
    name: string;
    role: string;
  };
};

type CurrentUser = {
  username: string;
  name: string;
  role: "admin" | "operador";
};

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientTargetId, setClientTargetId] = useState<string | null>(null);
  const [clientsViewTargetId, setClientsViewTargetId] = useState<string | null>(null);
  const [clientSubmitState, setClientSubmitState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [clientSubmitMessage, setClientSubmitMessage] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates>({
    latitude: "",
    longitude: "",
    accuracy: "",
  });
  const [selectedIsland, setSelectedIsland] = useState("");
  const [selectedCouncil, setSelectedCouncil] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [selectedHousingType, setSelectedHousingType] = useState("");
  const [selectedHousingStatus, setSelectedHousingStatus] = useState("");
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const [gpsErrorMessage, setGpsErrorMessage] = useState("");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
    initializeSession();
  }, []);

  async function initializeSession() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) {
      router.replace("/autenticacao");
      return;
    }

    const payload = (await response.json()) as { user: CurrentUser };
    setCurrentUser(payload.user);
    await loadRegistrations();
  }

  async function loadRegistrations() {
    setIsLoadingRegistrations(true);

    try {
      const response = await fetch("/api/registrations", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/autenticacao");
        return;
      }

      const payload = (await response.json()) as { registrations?: RegistrationRecord[] };
      setRegistrations(payload.registrations ?? []);
    } finally {
      setIsLoadingRegistrations(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/autenticacao");
  }

  function getGpsLocation() {
    setGpsErrorMessage("");

    if (!window.isSecureContext) {
      setGpsErrorMessage(
        "A geolocalização só funciona em HTTPS ou localhost. Aceda à aplicação por HTTPS para o navegador pedir permissão.",
      );
      setGpsState("error");
      return;
    }

    if (!navigator.geolocation) {
      setGpsErrorMessage("Este navegador não suporta geolocalização.");
      setGpsState("error");
      return;
    }

    setGpsState("loading");

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    const finish = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      if (bestPosition) {
        setCoordinates({
          latitude: bestPosition.coords.latitude.toFixed(6),
          longitude: bestPosition.coords.longitude.toFixed(6),
          accuracy: Math.round(bestPosition.coords.accuracy).toString(),
        });
        setGpsState("idle");
      } else {
        setGpsState("error");
      }
    };

    const timer = window.setTimeout(finish, 15000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }

        if (position.coords.accuracy <= 20) {
          window.clearTimeout(timer);
          finish();
        }
      },
      (error) => {
        window.clearTimeout(timer);
        setGpsErrorMessage(getGeolocationErrorMessage(error));
        finish();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (
      !selectedIsland ||
      !selectedCouncil ||
      !selectedZone ||
      !selectedNeighborhood ||
      !selectedHousingType ||
      !selectedHousingStatus
    ) {
      setLocationError(true);
      return;
    }

    setLocationError(false);
    setSubmitState("saving");
    setSubmitMessage("");

    const formData = new FormData(form);
    const payload = buildRegistrationPayload(formData);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível gravar o registo.");
      }

      setSubmitState("success");
      setSubmitMessage(`Localização registada com sucesso. Referência: ${result.id}`);
      resetForm(form);
      setIsCreateOpen(false);
      await loadRegistrations();
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "Não foi possível gravar o registo.");
    }
  }

  async function handleAddClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientTargetId) {
      return;
    }

    setClientSubmitState("saving");
    setClientSubmitMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const read = (name: string) => String(formData.get(name) ?? "").trim();

    try {
      const response = await fetch("/api/registrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: clientTargetId,
          client: {
            name: read("name"),
            phone: read("phone"),
            nif: read("nif"),
            document: read("document"),
            serviceNumber: read("serviceNumber"),
            floor: read("floor"),
            apartmentLocation: read("apartmentLocation"),
          },
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Não foi possível adicionar o cliente.");
      }

      form.reset();
      setClientSubmitState("success");
      setClientSubmitMessage("Cliente adicionado com sucesso.");
      await loadRegistrations();
    } catch (error) {
      setClientSubmitState("error");
      setClientSubmitMessage(error instanceof Error ? error.message : "Não foi possível adicionar o cliente.");
    }
  }

  function resetForm(form: HTMLFormElement) {
    form.reset();
    setCoordinates({ latitude: "", longitude: "", accuracy: "" });
    setSelectedIsland("");
    setSelectedCouncil("");
    setSelectedZone("");
    setSelectedNeighborhood("");
    setSelectedHousingType("");
    setSelectedHousingStatus("");
    setGpsState("idle");
    setGpsErrorMessage("");
    setIsMapOpen(false);
    setLocationError(false);
  }

  const councils = locations.find((location) => location.island === selectedIsland)?.councils ?? [];
  const zones = councils.find((council) => council.name === selectedCouncil)?.zones ?? [];
  const neighborhoods = zones.find((zone) => zone.name === selectedZone)?.neighborhoods ?? [];

  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-start justify-start overflow-x-hidden px-4 py-8 text-slate-700 sm:justify-center sm:py-12">
      <div className="w-full min-w-0 max-w-[358px] sm:max-w-[1180px]">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-[58px] w-[250px] max-w-full items-center justify-center">
            <Image
              src="/cvt_logo.png"
              alt="CVTelecom"
              width={217}
              height={59}
              className="h-auto w-full max-w-[217px]"
              priority
            />
          </div>

          <h1 className="mx-auto max-w-[340px] text-[29px] font-extrabold leading-[1.05] tracking-normal text-brand-blue sm:max-w-[380px] sm:text-[32px]">
            <span className="sm:hidden">
              Registo de
              <span className="block">Localização</span>
            </span>
            <span className="hidden sm:inline">Registo de Localização</span>
            <span className="block">FTTH</span>
          </h1>
        </header>

        {currentUser && (
          <section className="mb-4 flex flex-col gap-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-form sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{currentUser.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Terminar sessão
            </button>
          </section>
        )}

        <section className="mb-6 flex flex-col gap-3 rounded-[10px] border border-slate-200 bg-white p-4 shadow-form sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Prédios e residências</h2>
            <p className="text-sm text-slate-500">
              {registrations.length} registo{registrations.length === 1 ? "" : "s"} cadastrado
              {registrations.length === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitState("idle");
              setSubmitMessage("");
              setIsCreateOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-brand-blue px-4 text-sm font-bold text-white transition hover:bg-brand-blueDark focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo prédio/residência
          </button>
        </section>

        {isLoadingRegistrations ? (
          <div className="rounded-[10px] border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-form">
            A carregar registos...
          </div>
        ) : registrations.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {registrations.map((registration) => (
              <RegistrationCard
                key={registration.id}
                registration={registration}
                showCreatedBy={currentUser?.role === "admin"}
                onAddClient={() => {
                  setClientSubmitState("idle");
                  setClientSubmitMessage("");
                  setClientTargetId(registration.id);
                }}
                onViewClients={() => setClientsViewTargetId(registration.id)}
              />
            ))}
          </section>
        ) : (
          <div className="rounded-[10px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-form">
            <HomeIcon className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-800">Ainda não existem prédios/residências</h2>
            <p className="mt-1 text-sm text-slate-500">Crie o primeiro registo para começar o cadastro.</p>
          </div>
        )}

        {isCreateOpen && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/60 px-4 py-6">
            <div className="mx-auto w-full max-w-[920px]">
              <div className="mb-3 flex items-center justify-between rounded-[10px] border border-slate-200 bg-white px-4 py-3 shadow-form">
                <h2 className="text-base font-bold text-slate-900">Novo prédio/residência</h2>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  aria-label="Fechar formulário"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <form
          onSubmit={handleSubmit}
          className="rounded-[10px] border border-slate-200 bg-white px-8 py-9 shadow-form sm:px-9"
        >
          <SectionTitle>Localização</SectionTitle>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Ilha" required>
              <SearchableSelect
                name="island"
                placeholder="Pesquise ou selecione a ilha"
                value={selectedIsland}
                options={locations.map((location) => location.island)}
                onChange={(value) => {
                  setSelectedIsland(value);
                  setSelectedCouncil("");
                  setSelectedZone("");
                  setSelectedNeighborhood("");
                }}
              />
            </Field>

            <Field label="Concelho" required>
              <SearchableSelect
                name="council"
                placeholder={selectedIsland ? "Pesquise ou selecione o concelho" : "Selecione primeiro a ilha"}
                value={selectedCouncil}
                options={councils.map((council) => council.name)}
                disabled={!selectedIsland}
                onChange={(value) => {
                  setSelectedCouncil(value);
                  setSelectedZone("");
                  setSelectedNeighborhood("");
                }}
              />
            </Field>

            <Field label="Zona/Cidade" required>
              <SearchableSelect
                name="zone"
                placeholder={selectedCouncil ? "Pesquise ou selecione a zona/cidade" : "Selecione primeiro o concelho"}
                value={selectedZone}
                options={zones.map((zone) => zone.name)}
                disabled={!selectedCouncil}
                onChange={(value) => {
                  setSelectedZone(value);
                  setSelectedNeighborhood("");
                }}
              />
            </Field>

            <Field label="Bairro" required>
              <SearchableSelect
                name="neighborhood"
                placeholder={selectedZone ? "Pesquise ou selecione o bairro" : "Selecione primeiro a zona/cidade"}
                value={selectedNeighborhood}
                options={neighborhoods}
                disabled={!selectedZone}
                onChange={(value) => setSelectedNeighborhood(value)}
              />
            </Field>
          </div>

          {locationError && (
            <p className="-mt-2 mb-5 text-sm text-red-600">
              Preencha todos os campos obrigatórios antes de registar.
            </p>
          )}

          <Field label="Rua">
            <input name="street" placeholder="Ex: Rua 5 de Julho" className="field-input" />
          </Field>

          <Field label="Número da porta ou referência">
            <input name="doorNumber" placeholder="Ex: 12A, em frente à escola" className="field-input" />
          </Field>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="Tipo de Moradia" required>
              <SearchableSelect
                name="housingType"
                placeholder="Pesquise ou selecione o tipo de moradia"
                value={selectedHousingType}
                options={housingTypes}
                onChange={setSelectedHousingType}
              />
            </Field>

            <Field label="Estado da Moradia" required>
              <SearchableSelect
                name="housingStatus"
                placeholder="Pesquise ou selecione o estado da moradia"
                value={selectedHousingStatus}
                options={housingStatus}
                onChange={setSelectedHousingStatus}
              />
            </Field>
          </div>

          <Field label="Número de apartamento">
            <input min="0" name="apartmentCount" type="number" placeholder="Ex: 8" className="field-input" />
          </Field>

          <div className="mb-7">
            <label className="mb-2 block text-[15px] font-medium text-slate-700">
              Coordenadas GPS <span className="text-brand-red">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                required
                name="latitude"
                aria-label="Latitude"
                placeholder="Latitude"
                value={coordinates.latitude}
                onChange={(event) =>
                  setCoordinates((current) => ({
                    ...current,
                    latitude: event.target.value,
                    accuracy: "",
                  }))
                }
                className="field-input"
              />
              <input
                required
                name="longitude"
                aria-label="Longitude"
                placeholder="Longitude"
                value={coordinates.longitude}
                onChange={(event) =>
                  setCoordinates((current) => ({
                    ...current,
                    longitude: event.target.value,
                    accuracy: "",
                  }))
                }
                className="field-input"
              />
              <input type="hidden" name="gpsAccuracy" value={coordinates.accuracy} />
              <button
                type="button"
                onClick={getGpsLocation}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#1476cf] bg-[#f4f9ff] px-4 text-[15px] font-semibold text-brand-blue transition hover:bg-[#e9f4ff] focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                {gpsState === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                )}
                {coordinates.latitude && coordinates.longitude ? "Atualizar GPS" : "Obter GPS"}
              </button>
            </div>
            {coordinates.latitude && coordinates.longitude && (
              <>
                <p className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Localização obtida com sucesso
                </p>
                <div className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 font-mono text-[13px] font-bold text-slate-900">
                  <span className="mr-5">Lat: {coordinates.latitude}</span>
                  <span className="mr-5">Lon: {coordinates.longitude}</span>
                  <span>Precisão: ~{coordinates.accuracy || "-"}m</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 text-[14px] font-medium text-[#1476cf] hover:text-brand-blue focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Ver no mapa
                </button>
              </>
            )}
            {gpsState === "error" && (
              <p className="mt-2 text-sm text-red-600">
                {gpsErrorMessage || "Não foi possível obter a localização. Confirme a permissão do navegador."}
              </p>
            )}
          </div>

          <Divider />

          {submitState === "success" && (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
              {submitMessage}
            </p>
          )}

          {submitState === "error" && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
              {submitMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitState === "saving"}
            className="h-[54px] w-full rounded-md bg-brand-blue text-[17px] font-bold text-white transition hover:bg-brand-blueDark focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitState === "saving" ? "A gravar..." : "Registar"}
          </button>
              </form>
            </div>
          </div>
        )}

        {clientTargetId && (
          <ClientFormModal
            registration={registrations.find((registration) => registration.id === clientTargetId)}
            submitState={clientSubmitState}
            submitMessage={clientSubmitMessage}
            onClose={() => {
              setClientTargetId(null);
              setClientSubmitState("idle");
              setClientSubmitMessage("");
            }}
            onSubmit={handleAddClient}
          />
        )}

        {clientsViewTargetId && (
          <ClientsListModal
            registration={registrations.find((registration) => registration.id === clientsViewTargetId)}
            onClose={() => setClientsViewTargetId(null)}
          />
        )}

        <footer className="mx-auto mt-7 max-w-[410px] text-center text-[13px] leading-5 text-slate-500">
          <p>Se tiver dúvidas, contacte a nossa equipa de suporte.</p>
        </footer>

        {isMapOpen && coordinates.latitude && coordinates.longitude && (
          <SatelliteMapModal
            latitude={Number(coordinates.latitude)}
            longitude={Number(coordinates.longitude)}
            accuracy={coordinates.accuracy}
            onConfirm={(nextCoordinates) => {
              setCoordinates({
                latitude: nextCoordinates.latitude.toFixed(6),
                longitude: nextCoordinates.longitude.toFixed(6),
                accuracy: coordinates.accuracy ? `${coordinates.accuracy} ajustado` : "ajustado",
              });
              setIsMapOpen(false);
            }}
            onClose={() => setIsMapOpen(false)}
          />
        )}
      </div>
    </main>
  );
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Permissão de localização negada. Ative a localização nas permissões do navegador para este site.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "A localização não está disponível neste dispositivo ou rede. Tente ativar o GPS/Wi-Fi e repetir.";
  }

  if (error.code === error.TIMEOUT) {
    return "O navegador demorou demasiado a obter a localização. Tente novamente num local com melhor sinal.";
  }

  return "Não foi possível obter a localização. Confirme a permissão do navegador.";
}

function buildRegistrationPayload(formData: FormData) {
  const read = (name: string) => String(formData.get(name) ?? "").trim();

  return {
    location: {
      island: read("island"),
      council: read("council"),
      zone: read("zone"),
      neighborhood: read("neighborhood"),
      street: read("street"),
      doorReference: read("doorNumber"),
      housingType: read("housingType"),
      housingStatus: read("housingStatus"),
      apartmentCount: read("apartmentCount"),
      gps: {
        latitude: read("latitude"),
        longitude: read("longitude"),
        accuracy: read("gpsAccuracy"),
      },
    },
    clients: [],
  };
}

function RegistrationCard({
  registration,
  showCreatedBy,
  onAddClient,
  onViewClients,
}: {
  registration: RegistrationRecord;
  showCreatedBy: boolean;
  onAddClient: () => void;
  onViewClients: () => void;
}) {
  const addressParts = [
    registration.location.neighborhood,
    registration.location.zone,
    registration.location.council,
    registration.location.island,
  ].filter(Boolean);

  return (
    <article className="rounded-[10px] border border-slate-200 bg-white p-5 shadow-form">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <HomeIcon className="h-5 w-5 text-brand-blue" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              {registration.location.housingType || "Prédio/residência"}
            </h2>
          </div>
          <p className="text-sm leading-6 text-slate-600">{addressParts.join(", ")}</p>
          {(registration.location.street || registration.location.doorReference) && (
            <p className="mt-1 text-sm text-slate-500">
              {[registration.location.street, registration.location.doorReference].filter(Boolean).join(" - ")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={onAddClient}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#1476cf] bg-[#f4f9ff] px-3 text-sm font-semibold text-brand-blue transition hover:bg-[#e9f4ff] focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar cliente
          </button>
          <button
            type="button"
            onClick={onViewClients}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Ver clientes
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="Estado" value={registration.location.housingStatus} />
        <InfoItem label="Clientes cadastrados" value={String(registration.clients.length)} />
        <InfoItem
          label="GPS"
          value={`${registration.location.gps.latitude}, ${registration.location.gps.longitude}`}
        />
        {showCreatedBy && (
          <InfoItem
            label="Inserido por"
            value={registration.createdBy?.name || registration.createdBy?.username || "Desconhecido"}
          />
        )}
      </div>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}

function ClientFormModal({
  registration,
  submitState,
  submitMessage,
  onClose,
  onSubmit,
}: {
  registration?: RegistrationRecord;
  submitState: "idle" | "saving" | "success" | "error";
  submitMessage: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6">
      <div className="mx-auto w-full max-w-[520px]">
        <form onSubmit={onSubmit} className="rounded-[10px] border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Adicionar cliente</h2>
              <p className="text-sm text-slate-500">
                {registration
                  ? `${registration.location.neighborhood}, ${registration.location.zone}`
                  : "Prédio/residência selecionado"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <Field label="Nome completo" required>
            <input required name="name" placeholder="Ex: João Manuel Silva" className="field-input" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input name="phone" placeholder="Ex: 991 34 67" className="field-input" />
          </Field>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="NIF">
              <input name="nif" placeholder="Ex: 123456789" className="field-input" />
            </Field>
            <Field label="CNI/BI">
              <input name="document" placeholder="Ex: 123456" className="field-input" />
            </Field>
          </div>

          <Field label="Número de cliente/serviço">
            <input name="serviceNumber" placeholder="Ex: 1002456" className="field-input" />
          </Field>
          <Field label="Piso">
            <input name="floor" placeholder="Ex: 2" className="field-input" />
          </Field>
          <Field label="Localização do apartamento (piso)">
            <input name="apartmentLocation" placeholder="Ex: Frente direita" className="field-input" />
          </Field>

          {submitState === "error" && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitMessage}
            </p>
          )}

          {submitState === "success" && (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {submitMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={submitState === "saving"}
            className="h-11 w-full rounded-md bg-brand-blue text-sm font-bold text-white transition hover:bg-brand-blueDark focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitState === "saving" ? "A gravar..." : "Adicionar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClientsListModal({
  registration,
  onClose,
}: {
  registration?: RegistrationRecord;
  onClose: () => void;
}) {
  const clients = registration?.clients ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6">
      <div className="mx-auto w-full max-w-[720px] rounded-[10px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Clientes cadastrados</h2>
            <p className="text-sm text-slate-500">
              {registration
                ? `${registration.location.neighborhood}, ${registration.location.zone}`
                : "Prédio/residência selecionado"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {clients.length > 0 ? (
          <div className="grid gap-3">
            {clients.map((client, index) => (
              <div key={`${client.name}-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{client.name}</p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <InfoItem label="Telefone" value={client.phone || "-"} />
                  <InfoItem label="Número de cliente/serviço" value={client.serviceNumber || "-"} />
                  <InfoItem label="NIF" value={client.nif || "-"} />
                  <InfoItem label="CNI/BI" value={client.document || "-"} />
                  <InfoItem label="Piso" value={client.floor || "-"} />
                  <InfoItem label="Localização do apartamento" value={client.apartmentLocation || "-"} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
            Ainda não há clientes associados a este prédio/residência.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mb-0 flex-1" : "mb-4"} flex items-center gap-4`}>
      <h2 className="shrink-0 text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {children}
      </h2>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 block last:mb-0">
      <span className="mb-2 block text-[15px] font-medium text-slate-700">
        {label} {required && <span className="text-brand-red">*</span>}
      </span>
      {children}
    </div>
  );
}

function SearchableSelect({
  name,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  name: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(value);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-PT");
    if (!normalizedQuery) {
      return options.slice(0, 60);
    }

    return options
      .filter((option) => option.toLocaleLowerCase("pt-PT").includes(normalizedQuery))
      .slice(0, 60);
  }, [options, query]);

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          className="field-input pl-10 pr-[4.5rem] disabled:cursor-not-allowed disabled:opacity-60"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-10 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
            aria-label="Limpar seleção"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Abrir opções"
        >
          <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setQuery(option);
                  setIsOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left text-[15px] transition hover:bg-blue-50 ${
                  option === value ? "font-semibold text-brand-blue" : "text-slate-700"
                }`}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">Sem resultados.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="mb-7 mt-1 h-px bg-slate-200" />;
}
