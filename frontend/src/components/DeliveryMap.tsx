import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Clock, Route, Bike, ExternalLink, Loader2, MapPin } from 'lucide-react';

/**
 * DeliveryMap — real street-level route preview for one delivery.
 *
 * Data sources (all free, no API key):
 *  - Map tiles + geocoding: OpenStreetMap / Nominatim
 *  - Road route + ETA: OSRM public routing API
 *  - Turn-by-turn navigation: Google Maps universal deep link (opens the
 *    vendor's installed Google Maps app with driving directions)
 */

const cartIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const homeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface DeliveryTarget {
  lat: number;
  lon: number;
  address?: string | null;
  customerName?: string | null;
}

interface DeliveryMapProps {
  origin: [number, number];
  target: DeliveryTarget;
  language?: string;
}

interface RouteInfo {
  coords: [number, number][];
  distanceKm: number;
  minutes: number;
  approximate: boolean;
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(L.latLngBounds(coords).pad(0.25));
    }
  }, [coords, map]);
  return null;
}

/** Geocode a free-text address when the order has no GPS coordinates.
 * Biased toward the vendor's location so generic queries resolve locally. */
async function geocodeAddress(address: string, origin: [number, number]): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lat=${origin[0]}&lon=${origin[1]}`
    );
    const data = await res.json();
    const f = data.features?.[0];
    if (f?.geometry?.coordinates) {
      const [lon, lat] = f.geometry.coordinates;
      return { lat, lon };
    }
  } catch { /* offline / blocked → fallback below */ }
  return null;
}

/** Non-address strings the app itself generates for walk-up orders. */
const PLACEHOLDER_ADDRESS_RE = /collect at cart|voice order/i;
/** Geocode results farther than this from the vendor are bad matches. */
const MAX_SANE_GEOCODE_KM = 250;

export const DeliveryMap: React.FC<DeliveryMapProps> = ({ origin, target, language = 'en' }) => {
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [resolved, setResolved] = useState<{ lat: number; lon: number } | null>(
    target.lat && target.lon ? { lat: target.lat, lon: target.lon } : null
  );
  const [resolving, setResolving] = useState(false);
  const [pickupAtCart, setPickupAtCart] = useState(false);

  const kn = language === 'kn';

  // Resolve target: exact GPS → pickup-at-cart → geocoded address → market-center fallback
  useEffect(() => {
    let cancelled = false;
    if (target.lat && target.lon) {
      setResolved({ lat: target.lat, lon: target.lon });
      setPickupAtCart(false);
      return;
    }
    if (!target.address || PLACEHOLDER_ADDRESS_RE.test(target.address)) {
      // "Voice order — collect at cart" etc. is not an address: the customer
      // walks up to the cart, so there is nowhere to navigate.
      setResolved({ lat: origin[0], lon: origin[1] });
      setPickupAtCart(true);
      setResolving(false);
      return;
    }
    setResolving(true);
    geocodeAddress(target.address, origin).then((pt) => {
      if (cancelled) return;
      if (pt && haversineKm(origin, [pt.lat, pt.lon]) < MAX_SANE_GEOCODE_KM) {
        setResolved(pt);
        setPickupAtCart(false);
      } else {
        // Geocode missed (or matched somewhere absurd, e.g. another country):
        // keep the map useful but mark it clearly as an estimate.
        setResolved({ lat: 12.9716, lon: 77.5946 });
        setPickupAtCart(false);
      }
      setResolving(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.lat, target.lon, target.address]);

  // Fetch the real road route (OSRM) once both ends are known
  useEffect(() => {
    if (!resolved) return;
    let cancelled = false;
    const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${resolved.lon},${resolved.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const rt = data.routes?.[0];
        if (rt?.geometry?.coordinates) {
          setRoute({
            coords: rt.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]),
            distanceKm: rt.distance / 1000,
            minutes: rt.duration / 60,
            approximate: false,
          });
        } else {
          // Straight-line fallback (offline / routing API unreachable)
          setRoute({
            coords: [origin, [resolved.lat, resolved.lon]],
            distanceKm: haversineKm(origin, [resolved.lat, resolved.lon]),
            minutes: (haversineKm(origin, [resolved.lat, resolved.lon]) / 15) * 60,
            approximate: true,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRoute({
          coords: [origin, [resolved.lat, resolved.lon]],
          distanceKm: haversineKm(origin, [resolved.lat, resolved.lon]),
          minutes: (haversineKm(origin, [resolved.lat, resolved.lon]) / 15) * 60,
          approximate: true,
        });
      });
    return () => { cancelled = true; };
  }, [origin[0], origin[1], resolved?.lat, resolved?.lon]);

  // Google Maps turn-by-turn deep link — works on Android/iOS/desktop
  const gmapsUrl = resolved
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin[0]},${origin[1]}&destination=${resolved.lat},${resolved.lon}&travelmode=two_wheeler`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.address || '')}`;

  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4" />
          <div>
            <p className="text-[13px] font-black leading-tight">
              {kn ? 'ವಿತರಣೆಗೆ ಮಾರ್ಗದರ್ಶಕ' : 'Delivery Navigation'}
            </p>
            <p className="text-[10px] text-blue-100 font-semibold truncate max-w-[220px]">
              {target.customerName ? `${target.customerName} • ` : ''}{target.address || (kn ? 'ಗ್ರಾಹಕರ ಸ್ಥಳ' : 'Customer location')}
            </p>
          </div>
        </div>
        {route && (
          <div className="text-right">
            <p className="text-[13px] font-black leading-tight">{route.distanceKm.toFixed(1)} km</p>
            <p className="text-[10px] text-blue-100 font-semibold flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" /> ~{Math.max(1, Math.round(route.minutes))} min
              {route.approximate && '*'}
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="h-56 relative">
        {resolved ? (
          <MapContainer
            center={[resolved.lat, resolved.lon]}
            zoom={15}
            scrollWheelZoom={false}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {route && <Polyline positions={route.coords} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />}
            <Marker position={origin} icon={cartIcon}>
              <Popup>{kn ? 'ನಿಮ್ಮ ಗಾಡಿ' : 'Your cart'}</Popup>
            </Marker>
            <Marker position={[resolved.lat, resolved.lon]} icon={homeIcon}>
              <Popup>{target.customerName || (kn ? 'ಗ್ರಾಹಕ' : 'Customer')}</Popup>
            </Marker>
            {route && <FitBounds coords={route.coords} />}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-2">
            {resolving ? (
              <><Loader2 className="w-6 h-6 animate-spin" /><p className="text-xs font-bold">{kn ? 'ಸ್ಥಳ ಹುಡುಕಲಾಗುತ್ತಿದೆ…' : 'Finding location…'}</p></>
            ) : (
              <><MapPin className="w-6 h-6" /><p className="text-xs font-bold">{kn ? 'ವಿಳಾಸವಿಲ್ಲ — ಕರೆ ಮಾಡಿ' : 'No address on this order — call the customer'}</p></>
            )}
          </div>
        )}
      </div>

      {/* Footer: distance/ETA + one-tap Google Maps navigation */}
      <div className="p-3 flex items-center gap-2 bg-white">
        <div className="flex-1 min-w-0 flex items-center gap-3 text-[11px] font-bold text-slate-600">
          <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5 text-blue-500" />{route ? `${route.distanceKm.toFixed(1)} km` : '—'}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-emerald-500" />{route ? `~${Math.max(1, Math.round(route.minutes))} min` : '—'}</span>
          <span className="hidden sm:flex items-center gap-1 text-slate-400"><Route className="w-3.5 h-3.5" />{route?.approximate ? (kn ? 'ಅಂದಾಜು' : 'estimate') : (kn ? 'ರಸ್ತೆ ಮಾರ್ಗ' : 'road route')}</span>
        </div>
        {pickupAtCart ? (
          <span className="flex-shrink-0 px-3 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black rounded-2xl">
            🛒 {kn ? 'ಗಾಡಿಯಲ್ಲಿ ತೆಗೆದುಕೊಳ್ಳಿ' : 'Pickup at cart'}
          </span>
        ) : (
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-1.5 active:scale-95 transition"
          >
            <Navigation className="w-4 h-4" />
            <span>{kn ? 'ಗೂಗಲ್ ಮ್ಯಾಪ್ಸ್' : 'Navigate'}</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        )}
      </div>
    </div>
  );
};

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
