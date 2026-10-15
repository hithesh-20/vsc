import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  IconBadge,
  PageHeader,
  Pill,
  Screen,
  SectionHeader,
  StateView,
} from '@/components/ui';
import { api } from '@/lib/api';
import { qty as fmtQty } from '@/lib/format';
import { colors, radius, spacing } from '@/lib/theme';
import type { DemandForecast, Weather } from '@/lib/types';
import { useApi } from '@/lib/useApi';

function stockHealthColor(health: string): { fg: string; bg: string } {
  const h = health.toLowerCase();
  if (h.includes('low') || h.includes('short') || h.includes('under')) return { fg: colors.red, bg: colors.redSoft };
  if (h.includes('over') || h.includes('excess') || h.includes('high')) return { fg: colors.amber, bg: colors.amberSoft };
  return { fg: colors.green, bg: colors.greenSoft };
}

export default function WeatherScreen() {
  const fetchWeather = useCallback(async () => {
    const [weather, forecast] = await Promise.all([
      api.getWeather(),
      api.getDemandForecast(7),
    ]);
    return { weather, forecast };
  }, []);

  const { data, loading, refreshing, error, reload, refresh } = useApi<{
    weather: Weather;
    forecast: DemandForecast[];
  }>(fetchWeather, []);

  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Fetching weather…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" title="Couldn't load weather" message={error} onRetry={reload} /></Screen>;
  if (!data) return <Screen><StateView kind="empty" title="No weather data" /></Screen>;

  const { weather, forecast } = data;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Weather & Demand" subtitle="Bengaluru" />

      <Card style={styles.weatherCard}>
        <View style={styles.weatherTop}>
          <IconBadge
            icon={weather.is_outdoor_favorable ? 'sunny' : 'rainy'}
            fg={weather.is_outdoor_favorable ? colors.amber : colors.blue}
            bg={weather.is_outdoor_favorable ? colors.amberSoft : colors.blueSoft}
            size={52}
          />
          <View style={styles.flex1}>
            <AppText variant="display">{weather.temperature_celsius.toFixed(0)}°C</AppText>
            <AppText variant="body">{weather.weather_condition}</AppText>
            <AppText variant="caption">{weather.weather_condition_kn}</AppText>
          </View>
          <Pill
            label={weather.is_outdoor_favorable ? 'Good to sell' : 'Caution'}
            fg={weather.is_outdoor_favorable ? colors.green : colors.amber}
            bg={weather.is_outdoor_favorable ? colors.greenSoft : colors.amberSoft}
          />
        </View>
        <View style={styles.advisory}>
          <Ionicons name="information-circle" size={16} color={colors.purple} />
          <View style={styles.flex1}>
            <AppText variant="caption" color={colors.purple}>
              {weather.advisory}
            </AppText>
            <AppText variant="caption" color={colors.textFaint}>
              {weather.advisory_kn}
            </AppText>
          </View>
        </View>
        <View style={styles.precipRow}>
          <Ionicons name="rainy-outline" size={15} color={colors.blue} />
          <AppText variant="caption">Precipitation {weather.precipitation_mm.toFixed(1)} mm</AppText>
        </View>
      </Card>

      <SectionHeader title="7-day demand forecast" />
      {forecast.length === 0 ? (
        <StateView kind="empty" title="No forecast available" />
      ) : (
        forecast.map((item) => {
          const hc = stockHealthColor(item.stock_health);
          return (
            <Card key={item.product_id} style={styles.forecastCard}>
              <View style={styles.rowBetween}>
                <View style={styles.flex1}>
                  <AppText variant="heading">{item.product_name_en}</AppText>
                  <AppText variant="caption">
                    {item.product_name_kn} · Stock {fmtQty(item.current_stock)} {item.unit}
                  </AppText>
                </View>
                <Pill label={item.stock_health} fg={hc.fg} bg={hc.bg} />
              </View>

              <View style={styles.daysRow}>
                {item.daily_forecasts.map((day) => (
                  <View key={day.date} style={styles.dayCol}>
                    <AppText variant="caption" style={styles.dayName}>
                      {day.day_name.slice(0, 3)}
                    </AppText>
                    <AppText variant="body" style={styles.dayQty}>
                      {fmtQty(day.predicted_demand_qty)}
                    </AppText>
                    <AppText variant="caption" style={styles.dayStock}>
                      {fmtQty(day.recommended_morning_stock)} {item.unit}
                    </AppText>
                    <View style={styles.confBar}>
                      <View style={[styles.confFill, { width: `${Math.round(day.confidence_score * 100)}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="caption">
                Bars show confidence; bold value = predicted demand, grey = recommended morning stock.
              </AppText>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  weatherCard: { gap: spacing.md },
  weatherTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  advisory: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.purpleSoft,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  precipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  forecastCard: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  daysRow: { flexDirection: 'row', gap: spacing.sm },
  dayCol: { flex: 1, alignItems: 'center', gap: 3 },
  dayName: { textTransform: 'uppercase' },
  dayQty: { fontWeight: '800' },
  dayStock: { fontSize: 10 },
  confBar: {
    width: '100%',
    height: 5,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: 3,
  },
  confFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
});
