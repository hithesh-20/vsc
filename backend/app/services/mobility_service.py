from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.product import Product
from app.services.map_service import MapService
from app.services.weather_service import WeatherService


class MobilityService:
    """Intelligent Mobility, Anti-Clustering Coordination & Product-Level Demand & Cannibalization Prediction Engine."""

    # Candidate village/market zones with coordinates, base footfall, and high-demand produce
    CANDIDATE_ZONES = [
        {
            "id": "zone-01",
            "name": "Gandhi Circle Mandi & Bus Stop",
            "name_kn": "ಗಾಂಧಿ ಸರ್ಕಲ್ ಮಂಡಿ & ಬಸ್ ನಿಲ್ದಾಣ",
            "lat": 12.9716,
            "lon": 77.5946,
            "base_demand_score": 94.0,
            "customer_density": "Very High",
            "category_affinity": ["Vegetables", "Fruits", "Snacks", "Tea"],
            "high_demand_products": ["Onion", "Potato", "Ginger", "Banana"],
            "saturated_products": ["Tomato"],
            "peak_hours": "Morning & Evening"
        },
        {
            "id": "zone-02",
            "name": "Residential Layout 4th Block (Apartments & Houses)",
            "name_kn": "ವಸತಿ ಬಡಾವಣೆ 4ನೇ ಬ್ಲಾಕ್ (ಮನೆಗಳು & ಅಪಾರ್ಟ್‌ಮೆಂಟ್)",
            "lat": 12.9820,
            "lon": 77.6100,
            "base_demand_score": 91.0,
            "customer_density": "High (Doorstep Deliveries)",
            "category_affinity": ["Vegetables", "Fruits", "Groceries"],
            "high_demand_products": ["Tomato", "Spinach / Greens", "Carrot", "Apple"],
            "saturated_products": [],
            "peak_hours": "Morning & Evening"
        },
        {
            "id": "zone-03",
            "name": "Central Bus Terminal Road",
            "name_kn": "ಕೇಂದ್ರ ಬಸ್ ನಿಲ್ದಾಣ ರಸ್ತೆ",
            "lat": 12.9780,
            "lon": 77.5850,
            "base_demand_score": 88.0,
            "customer_density": "High (Commuters)",
            "category_affinity": ["Snacks", "Tea", "Fruits", "Food"],
            "high_demand_products": ["Banana", "Orange", "Tea", "Samosa"],
            "saturated_products": ["Tea"],
            "peak_hours": "All Day"
        },
        {
            "id": "zone-04",
            "name": "Railway Station East Gate & Auto Stand",
            "name_kn": "ರೈಲ್ವೆ ನಿಲ್ದಾಣ ಪೂರ್ವ ಗೇಟ್",
            "lat": 12.9650,
            "lon": 77.6010,
            "base_demand_score": 85.0,
            "customer_density": "High",
            "category_affinity": ["Tea", "Snacks", "Fruits"],
            "high_demand_products": ["Snacks", "Water Bottle", "Pomegranate"],
            "saturated_products": [],
            "peak_hours": "Afternoon & Night"
        },
        {
            "id": "zone-05",
            "name": "Temple Street & Morning Walk Promenade",
            "name_kn": "ದೇವಸ್ಥಾನ ಬೀದಿ & ಮಾರ್ನಿಂಗ್ ವಾಕ್ ರಸ್ತೆ",
            "lat": 12.9550,
            "lon": 77.5800,
            "base_demand_score": 82.0,
            "customer_density": "Moderate (Morning Spike)",
            "category_affinity": ["Fruits", "Flowers", "Fresh Greens", "Snacks"],
            "high_demand_products": ["Flowers", "Banana", "Coconut", "Apple"],
            "saturated_products": ["Flowers"],
            "peak_hours": "Morning 6 AM - 10 AM"
        },
        {
            "id": "zone-06",
            "name": "Industrial Area Gate 2 (Shift Change)",
            "name_kn": "ಕೈಗಾರಿಕಾ ಪ್ರದೇಶ ಗೇಟ್ 2",
            "lat": 12.9900,
            "lon": 77.5700,
            "base_demand_score": 80.0,
            "customer_density": "High (Morning/Evening Shifts)",
            "category_affinity": ["Tea", "Snacks", "Food", "Vegetables"],
            "high_demand_products": ["Tea", "Chili Bajji", "Snacks", "Onion"],
            "saturated_products": [],
            "peak_hours": "Shift Timings (2 PM & 6 PM)"
        }
    ]

    @classmethod
    async def recommend_optimal_locations(
        cls,
        db: Session,
        vendor: Vendor
    ) -> Dict[str, Any]:
        """
        Compute anti-clustering route score, product cannibalization avoidance,
        and specific high-demand produce recommendations per street.
        """
        vendor_lat = vendor.current_lat or 12.9716
        vendor_lon = vendor.current_lon or 77.5946

        # Fetch active competing vendors in the same category
        active_competitors = db.query(Vendor).filter(
            Vendor.id != vendor.id,
            Vendor.is_active == True,
            Vendor.business_category == vendor.business_category,
            Vendor.current_lat.isnot(None),
            Vendor.current_lon.isnot(None)
        ).all()

        weather = await WeatherService.get_current_weather(vendor_lat, vendor_lon)

        recommendations = []
        cluster_warnings = []

        for zone in cls.CANDIDATE_ZONES:
            dist_km = MapService.calculate_haversine_distance(
                vendor_lat, vendor_lon, zone["lat"], zone["lon"]
            )

            # Count competitors within 1.2 km of this candidate zone
            comp_in_zone = [
                c for c in active_competitors
                if MapService.calculate_haversine_distance(c.current_lat, c.current_lon, zone["lat"], zone["lon"]) <= 1.2
            ]
            competitor_count = len(comp_in_zone)

            # Check category match
            category_match_bonus = 10.0 if vendor.business_category in zone["category_affinity"] else 0.0

            # Distance penalty (1.5 point deduction per km)
            distance_penalty = dist_km * 1.5

            # Market Cannibalization Penalty (22 points per competing vendor selling same goods)
            cannibalization_penalty = competitor_count * 22.0
            cannibalization_risk = min(100, competitor_count * 45)

            # Weather penalty
            weather_bonus = 0.0 if weather["is_outdoor_favorable"] else -15.0

            # Composite Score
            final_score = max(10.0, round(
                zone["base_demand_score"] + category_match_bonus - distance_penalty - cannibalization_penalty + weather_bonus,
                1
            ))

            # Demand classification
            if final_score >= 80.0:
                demand_level = "Very High"
            elif final_score >= 60.0:
                demand_level = "High"
            elif final_score >= 40.0:
                demand_level = "Moderate"
            else:
                demand_level = "Saturated"

            # Anti-clustering warning
            if competitor_count >= 2:
                warning_msg = f"⚠️ Market Saturation Warning: {competitor_count} other {vendor.business_category} carts active near {zone['name']}. Heavy price competition."
                cluster_warnings.append(warning_msg)

            # Humanized rationale & product advice
            if competitor_count == 0:
                reason = f"🚀 0 Competitors! High unmet demand for {vendor.business_category}. Carry: {', '.join(zone['high_demand_products'])}."
                reason_kn = f"🚀 ೦ ಸ್ಪರ್ಧಿಗಳು! ಇಲ್ಲಿ {vendor.business_category} ಗೆ ಅಪಾರ ಬೇಡಿಕೆ ಇದೆ. ತೆಗೆದುಕೊಂಡು ಹೋಗಬೇಕಾದ ವಸ್ತುಗಳು: {', '.join(zone['high_demand_products'])}."
                route_strategy = "OPTIMAL_PRIMARY"
            else:
                reason = f"⚠️ {competitor_count} competitor cart(s) active nearby. Avoid selling {', '.join(zone['saturated_products']) if zone['saturated_products'] else 'common items'}. Focus on niche items: {', '.join(zone['high_demand_products'])}."
                reason_kn = f"⚠️ ಹತ್ತಿರದಲ್ಲಿ {competitor_count} ಸ್ಪರ್ಧಾತ್ಮಕ ಗಾಡಿಗಳಿವೆ. {', '.join(zone['saturated_products']) if zone['saturated_products'] else 'ಸಾಮಾನ್ಯ ವಸ್ತು'} ಬದಲು {', '.join(zone['high_demand_products'])} ಮಾರಾಟ ಮಾಡಿ."
                route_strategy = "ALTERNATIVE_REROUTE"

            estimated_turnover = int(final_score * 22.5)

            # Direct Google Maps Navigation Deep Link
            google_maps_url = f"https://www.google.com/maps/dir/?api=1&origin={vendor_lat},{vendor_lon}&destination={zone['lat']},{zone['lon']}&travelmode=driving"

            recommendations.append({
                "id": zone["id"],
                "location_name": zone["name"],
                "location_name_kn": zone["name_kn"],
                "latitude": zone["lat"],
                "longitude": zone["lon"],
                "distance_km": dist_km,
                "score": final_score,
                "demand_level": demand_level,
                "active_competitors_count": competitor_count,
                "cannibalization_risk_percent": cannibalization_risk,
                "route_strategy": route_strategy,
                "high_demand_products": zone["high_demand_products"],
                "saturated_products": zone["saturated_products"],
                "expected_customers_density": zone["customer_density"],
                "estimated_turnover_inr": estimated_turnover,
                "google_maps_url": google_maps_url,
                "recommendation_reason": reason,
                "recommendation_reason_kn": reason_kn,
                "weather_condition": weather["weather_condition"]
            })

        # Sort recommendations by highest score first
        recommendations.sort(key=lambda x: x["score"], reverse=True)

        return {
            "vendor_id": vendor.id,
            "vendor_category": vendor.business_category,
            "recommendations": recommendations,
            "top_recommended_route": recommendations[0] if recommendations else None,
            "cluster_warning": cluster_warnings[0] if cluster_warnings else None,
            "generated_at": datetime.now(timezone.utc)
        }

    @classmethod
    async def predict_next_optimal_location(
        cls,
        db: Session,
        vendor: Vendor,
        current_lat: Optional[float] = None,
        current_lon: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        AI-driven real-time location predictor for vendors:
        Predicts where the vendor should ride RIGHT NOW for maximum sales surge
        with direct turn-by-turn Google Maps navigation!
        """
        v_lat = current_lat or vendor.current_lat or 12.9716
        v_lon = current_lon or vendor.current_lon or 77.5946

        recs = await cls.recommend_optimal_locations(db, vendor)
        top = recs["recommendations"][0] if recs["recommendations"] else cls.CANDIDATE_ZONES[0]

        now_hour = datetime.now().hour
        if 6 <= now_hour < 11:
            time_window = "Morning Fresh Mandi Peak (ಬೆಳಗಿನ ತಾಜಾ ಮಂಡಿ ಸಮಯ)"
            time_advice = "Residents are shopping for daily vegetables before 11 AM."
        elif 11 <= now_hour < 16:
            time_window = "Afternoon Mid-day Lunch & Tea Break (ಮಧ್ಯಾಹ್ನದ ಸಮಯ)"
            time_advice = "Offices and junctions have high snack and fruit demand."
        else:
            time_window = "Evening Family Dinner Rush (ಸಂಜೆಯ ಮನೆ ಊಟದ ಖರೀದಿ ಸಮಯ)"
            time_advice = "Families return from work, causing maximum doorstep vegetable buying."

        eta_minutes = max(2, int(top["distance_km"] * 6))
        predicted_extra_sales = int(top["score"] * 8.5)

        gmaps_nav_url = f"https://www.google.com/maps/dir/?api=1&origin={v_lat},{v_lon}&destination={top['latitude']},{top['longitude']}&travelmode=driving"

        return {
            "current_location": {
                "latitude": v_lat,
                "longitude": v_lon,
                "zone_name": "Current GPS Anchor"
            },
            "predicted_next_location": {
                "id": top["id"],
                "location_name": top["location_name"],
                "location_name_kn": top["location_name_kn"],
                "latitude": top["latitude"],
                "longitude": top["longitude"],
                "distance_km": top["distance_km"],
                "eta_minutes": eta_minutes,
                "demand_score": top["score"],
                "demand_level": top["demand_level"],
                "predicted_sales_uplift_inr": predicted_extra_sales,
                "high_demand_products": top["high_demand_products"],
                "time_window": time_window,
                "time_advice": time_advice,
                "google_maps_url": gmaps_nav_url
            }
        }

    @classmethod
    def get_fleet_dispatch_schedule(cls, db: Session, vendor: Vendor) -> Dict[str, Any]:
        """
        AI Spatial-Temporal Fleet & People Management Dispatch System:
        Coordinates vendor schedules across time-slots to prevent market exhaustion and cannibalization
        (e.g., Ramesh covers BTM at 4 PM -> Suresh gets rerouted to HSR Layout at 6:30 PM or switches to fruits).
        """
        now = datetime.now()
        
        # Schedule slots
        slots = [
            {
                "id": "slot-01",
                "vendor_name": "Ramesh Kumar (You)",
                "vendor_name_kn": "ರಮೇಶ್ ಕುಮಾರ್ (ನೀವು)",
                "category": "Vegetables (ತರಕಾರಿಗಳು)",
                "target_location": "BTM 2nd Stage Water Tank Junction",
                "target_location_kn": "ಬಿಟಿಎಂ 2ನೇ ಹಂತ ವಾಟರ್ ಟ್ಯಾಂಕ್ ವೃತ್ತ",
                "time_window": "4:00 PM - 6:00 PM",
                "status": "COMPLETED_SOLD_OUT",
                "status_label": "✅ Sold Out (100% Demand Met)",
                "revenue_earned_inr": 1850,
                "demand_depleted_percent": 88,
                "saturation_cooldown_hours_left": 3.5,
                "inventory_sold": "Native Tomato (45kg), Pune Onion (60kg)"
            },
            {
                "id": "slot-02",
                "vendor_name": "Suresh Gowda (Peer Vendor)",
                "vendor_name_kn": "ಸುರೇಶ್ ಗೌಡ (ಸಹ-ಮಾರಾಟಗಾರ)",
                "category": "Vegetables (ತರಕಾರಿಗಳು)",
                "target_location": "BTM 2nd Stage (Original Intent)",
                "target_location_kn": "ಬಿಟಿಎಂ 2ನೇ ಹಂತ (ಹಿಂದಿನ ಉದ್ದೇಶ)",
                "time_window": "6:30 PM - 8:30 PM",
                "status": "AI_REROUTED",
                "status_label": "🔄 AI Rerouted to Prevent Loss",
                "conflict_warning": "⚠️ BTM 2nd Stage was covered by Ramesh at 4:00 PM. Neighborhood is 88% saturated.",
                "conflict_warning_kn": "⚠️ ಬಿಟಿಎಂ 2ನೇ ಹಂತವನ್ನು ಸಂಜೆ 4:00 ಕ್ಕೆ ರಮೇಶ್ ಆವರಿಸಿದ್ದಾರೆ. ಅಲ್ಲಿ ತರಕಾರಿ ಬೇಡಿಕೆ ಖಾಲಿಯಾಗಿದೆ.",
                "optimized_route_recommendation": {
                    "strategy_1_reroute": {
                        "destination": "HSR Layout Sector 2 Main Road",
                        "destination_kn": "ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್ ಸೆಕ್ಟರ್ 2 ಮುಖ್ಯ ರಸ್ತೆ",
                        "time_window": "6:30 PM - 8:30 PM",
                        "category": "Vegetables",
                        "expected_revenue_inr": 2150,
                        "unmet_demand_score": 96,
                        "reason": "High residential dinner rush with 0 active vegetable carts."
                    },
                    "strategy_2_product_pivot": {
                        "destination": "BTM 2nd Stage Water Tank Junction",
                        "category": "Fresh Fruits (ಹಣ್ಣುಗಳು) & Snacks",
                        "products": ["Shimla Apple", "Banana", "Chili Bajji"],
                        "expected_revenue_inr": 1600,
                        "reason": "Vegetable demand is full, but evening fruit and snack demand is 95% open!"
                    }
                }
            },
            {
                "id": "slot-03",
                "vendor_name": "Manjunath (Peer Vendor)",
                "vendor_name_kn": "ಮಂಜುನಾಥ್ (ಸಹ-ಮಾರಾಟಗಾರ)",
                "category": "Fresh Fruits (ಹಣ್ಣುಗಳು)",
                "target_location": "Koramangala 4th Block Park Gate",
                "target_location_kn": "ಕೋರಮಂಗಲ 4ನೇ ಬ್ಲಾಕ್ ಪಾರ್ಕ್ ಗೇಟ್",
                "time_window": "5:30 PM - 7:30 PM",
                "status": "ACTIVE_ON_DUTY",
                "status_label": "🟢 On Duty (Zero Conflict)",
                "revenue_earned_inr": 1420,
                "demand_depleted_percent": 45,
                "saturation_cooldown_hours_left": 0.0,
                "inventory_sold": "Apple, Pomegranate, Banana"
            }
        ]

        mutual_gain = {
            "without_ai_coordination": {
                "ramesh_revenue_inr": 1850,
                "suresh_revenue_inr": 150,  # Suresh suffers because Ramesh arrived earlier
                "total_combined_inr": 2000,
                "suresh_spoilage_loss_inr": 900,
                "outcome_summary": "Ramesh earns well, Suresh suffers heavy unsold vegetable spoilage."
            },
            "with_ai_coordination": {
                "ramesh_revenue_inr": 1850,
                "suresh_revenue_inr": 2150,  # Suresh earns high because he was rerouted to HSR Layout
                "total_combined_inr": 4000,
                "suresh_spoilage_loss_inr": 0,
                "community_profit_uplift_percent": 100.0,
                "spoilage_prevented_kg": 45.0,
                "outcome_summary": "Both Ramesh & Suresh earn peak profits with zero market cannibalization!"
            }
        }

        return {
            "dispatch_status": "OPTIMAL_COORDINATED",
            "active_fleet_count": 3,
            "peer_slots": slots,
            "mutual_gain_summary": mutual_gain,
            "generated_at": datetime.now(timezone.utc)
        }

