"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
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

type ClientForm = {
  id: number;
};

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
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
  const [clients, setClients] = useState<ClientForm[]>([{ id: 1 }]);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  function getGpsLocation() {
    if (!navigator.geolocation) {
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
      () => {
        window.clearTimeout(timer);
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
    const payload = buildRegistrationPayload(formData, clients.length);

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
    } catch (error) {
      setSubmitState("error");
      setSubmitMessage(error instanceof Error ? error.message : "Não foi possível gravar o registo.");
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
    setClients([{ id: Date.now() }]);
    setGpsState("idle");
    setIsMapOpen(false);
    setLocationError(false);
  }

  function addClient() {
    setClients((current) => [...current, { id: Date.now() }]);
  }

  function removeClient(id: number) {
    setClients((current) => current.filter((client) => client.id !== id));
  }

  const councils = locations.find((location) => location.island === selectedIsland)?.councils ?? [];
  const zones = councils.find((council) => council.name === selectedCouncil)?.zones ?? [];
  const neighborhoods = zones.find((zone) => zone.name === selectedZone)?.neighborhoods ?? [];

  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-start justify-start overflow-x-hidden px-4 py-8 text-slate-700 sm:justify-center sm:py-12">
      <div className="w-full min-w-0 max-w-[358px] sm:max-w-[604px]">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f2fc] text-brand-blue">
            <MapPin className="h-7 w-7 fill-brand-blue stroke-brand-blue" aria-hidden="true" />
          </div>

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
          <p className="mx-auto mt-4 max-w-[350px] text-[15px] leading-7 text-slate-600 sm:max-w-[520px]">
            Preencha os dados abaixo para registar a sua morada. A sua localização será utilizada
            para planear a Rede FTTH.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-[10px] border border-slate-200 bg-white px-8 py-9 shadow-form sm:px-9"
        >
          <SectionTitle>Localização</SectionTitle>

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

          <Field label="Tipo de Moradia" required>
            <SearchableSelect
              name="housingType"
              placeholder="Pesquise ou selecione o tipo de moradia"
              value={selectedHousingType}
              options={housingTypes}
              onChange={setSelectedHousingType}
            />
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
                Não foi possível obter a localização. Confirme a permissão do navegador.
              </p>
            )}
          </div>

          <Field label="Número de apartamento">
            <input min="0" name="apartmentCount" type="number" placeholder="Ex: 8" className="field-input" />
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

          <Divider />

          <div className="mb-5 flex items-center justify-between gap-3">
            <SectionTitle compact>Clientes</SectionTitle>
            <button
              type="button"
              onClick={addClient}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[#1476cf] bg-[#f4f9ff] px-3 text-[14px] font-semibold text-brand-blue transition hover:bg-[#e9f4ff] focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar cliente
            </button>
          </div>

          <div className="grid gap-5">
            {clients.map((client, index) => (
              <div
                key={client.id}
                className="rounded-md border border-slate-200 bg-slate-50/40 p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-[14px] font-bold text-slate-700">Cliente {index + 1}</h3>
                  {clients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeClient(client.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-white text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100"
                      aria-label={`Remover cliente ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <Field label="Nome completo" required>
                  <input
                    required
                    name={`clients[${index}].name`}
                    placeholder="Ex: João Manuel Silva"
                    className="field-input"
                  />
                </Field>

                <Field label="Telefone / WhatsApp">
                  <input
                    name={`clients[${index}].phone`}
                    placeholder="Ex: 991 34 67"
                    className="field-input"
                  />
                </Field>

                <Field label="NIF">
                  <input
                    name={`clients[${index}].nif`}
                    placeholder="Ex: 123456789"
                    className="field-input"
                  />
                </Field>

                <Field label="CNI/BI">
                  <input
                    name={`clients[${index}].document`}
                    placeholder="Ex: 123456"
                    className="field-input"
                  />
                </Field>

                <Field label="Número de cliente/serviço">
                  <input
                    name={`clients[${index}].serviceNumber`}
                    placeholder="Ex: 1002456"
                    className="field-input"
                  />
                </Field>

                <Field label="Piso">
                  <input
                    name={`clients[${index}].floor`}
                    placeholder="Ex: 2"
                    className="field-input"
                  />
                </Field>

                <Field label="Localização do apartamento (piso)">
                  <input
                    name={`clients[${index}].apartmentLocation`}
                    placeholder="Ex: Frente direita"
                    className="field-input"
                  />
                </Field>
              </div>
            ))}
          </div>

          <Divider />

          <div className="mb-7 flex gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-4 text-[14px] leading-6 text-amber-800">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              Os seus dados são recolhidos exclusivamente para efeitos de planeamento da rede FTTH.
              Não serão partilhados com terceiros nem utilizados para outros fins.
            </p>
          </div>

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
            {submitState === "saving" ? "A gravar..." : "Registar Localização"}
          </button>
        </form>

        <footer className="mx-auto mt-7 max-w-[410px] text-center text-[13px] leading-5 text-slate-500">
          <p>Os dados são enviados de forma segura e guardados numa base de dados privada.</p>
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

function buildRegistrationPayload(formData: FormData, clientCount: number) {
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
    clients: Array.from({ length: clientCount }, (_, index) => ({
      name: read(`clients[${index}].name`),
      phone: read(`clients[${index}].phone`),
      nif: read(`clients[${index}].nif`),
      document: read(`clients[${index}].document`),
      serviceNumber: read(`clients[${index}].serviceNumber`),
      floor: read(`clients[${index}].floor`),
      apartmentLocation: read(`clients[${index}].apartmentLocation`),
    })),
  };
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
