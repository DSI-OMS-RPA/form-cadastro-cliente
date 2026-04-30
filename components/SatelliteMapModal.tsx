"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { X } from "lucide-react";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";

type SatelliteMapModalProps = {
  latitude: number;
  longitude: number;
  accuracy?: string;
  onClose: () => void;
  onConfirm: (coordinates: { latitude: number; longitude: number }) => void;
};

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="h-5 w-5 rounded-full border-[3px] border-white bg-[#155892] shadow-lg ring-4 ring-[#155892]/25"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function SatelliteMapModal({
  latitude,
  longitude,
  accuracy,
  onClose,
  onConfirm,
}: SatelliteMapModalProps) {
  const initialCenter = useMemo<[number, number]>(() => [latitude, longitude], [latitude, longitude]);
  const [pinPosition, setPinPosition] = useState<[number, number]>(initialCenter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="w-full max-w-3xl overflow-hidden rounded-[10px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Localização no mapa</h2>
            <p className="text-sm text-slate-500">Arraste o marcador ou clique no mapa para ajustar.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
            aria-label="Fechar mapa"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="h-[420px] w-full sm:h-[520px]">
          <MapContainer center={initialCenter} zoom={20} maxZoom={21} scrollWheelZoom className="h-full w-full">
            <ResizeMap />
            <MapClickHandler onChange={setPinPosition} />
            <TileLayer
              attribution="Tiles &copy; Esri"
              maxNativeZoom={19}
              maxZoom={21}
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            <DraggableMarker position={pinPosition} onChange={setPinPosition} />
          </MapContainer>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="font-mono text-[13px] font-bold text-slate-700">
            Lat: {pinPosition[0].toFixed(6)} &nbsp; Lon: {pinPosition[1].toFixed(6)}
            {accuracy ? <span> &nbsp; Precisão inicial: ~{accuracy}m</span> : null}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm({ latitude: pinPosition[0], longitude: pinPosition[1] })}
              className="h-10 rounded-md bg-brand-blue px-4 text-sm font-semibold text-white transition hover:bg-brand-blueDark focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              Confirmar localização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableMarker({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (position: [number, number]) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  return (
    <Marker
      draggable
      position={position}
      icon={markerIcon}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current;
          if (!marker) {
            return;
          }

          const nextPosition = marker.getLatLng();
          onChange([nextPosition.lat, nextPosition.lng]);
        },
      }}
    >
              <Popup>
                <div className="text-sm">
                  <strong>Coordenadas GPS</strong>
                  <br />
          Lat: {position[0].toFixed(6)}
                  <br />
          Lon: {position[1].toFixed(6)}
                </div>
              </Popup>
            </Marker>
  );
}

function MapClickHandler({ onChange }: { onChange: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      onChange([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}
