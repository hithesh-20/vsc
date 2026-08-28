import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Vendor } from '../types';

// Custom Map Marker Icons using SVGs
const vendorIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface VendorMapProps {
  vendors: Vendor[];
  userLocation: [number, number];
  onSelectVendor: (vendor: Vendor) => void;
  language: 'en' | 'kn';
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

export const VendorMap: React.FC<VendorMapProps> = ({
  vendors,
  userLocation,
  onSelectVendor,
  language
}) => {
  return (
    <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-md relative z-10">
      <MapContainer
        center={userLocation}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <ChangeView center={userLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker */}
        <Marker position={userLocation} icon={userIcon}>
          <Popup>
            <div className="font-semibold text-xs text-blue-800">
              📍 {language === 'kn' ? 'ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ' : 'Your Current Location'}
            </div>
          </Popup>
        </Marker>

        {/* Nearby Street Vendors */}
        {vendors.map((vendor) => (
          <Marker
            key={vendor.vendor_id}
            position={[vendor.latitude, vendor.longitude]}
            icon={vendorIcon}
          >
            <Popup>
              <div className="p-1 space-y-1.5 min-w-[160px]">
                <div className="font-bold text-sm text-slate-900">
                  {language === 'kn' && vendor.business_name_kn ? vendor.business_name_kn : vendor.business_name}
                </div>
                <div className="text-xs text-slate-500">
                  🏷️ {vendor.business_category} • ⭐ {vendor.rating_avg}
                </div>
                <div className="text-xs text-emerald-700 font-medium">
                  🚀 {vendor.distance_km} km away
                </div>
                <button
                  onClick={() => onSelectVendor(vendor)}
                  className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold py-1.5 rounded-lg transition"
                >
                  {language === 'kn' ? 'ವಸ್ತುಗಳನ್ನು ನೋಡಿ' : 'View Products'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
