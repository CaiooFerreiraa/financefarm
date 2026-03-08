import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Cloud, Sun, CloudRain, Wind, Thermometer,
  MapPin, Newspaper, TrendingUp, TrendingDown, AlertTriangle, ExternalLink
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getCurrentWeather } from '../../lib/weather';
import { api } from '../../lib/api';
import { useFarmStore } from '../../store/useFarmStore';
import { useAuth, useUser } from '@clerk/clerk-expo';

const ICON_MAP = {
  Sun: Sun,
  Cloud: Cloud,
  CloudRain: CloudRain,
  Wind: Wind,
};

export default function Farmer() {
  const [refreshing, setRefreshing] = useState(false);
  const [newsLimit, setNewsLimit] = useState(5);

  const { userId } = useAuth();
  const { user } = useUser();
  const { activeFarmId } = useFarmStore();

  const { data: farms } = useQuery({
    queryKey: ['farms', userId],
    queryFn: () => api.getFarms(userId!),
    enabled: !!userId,
  });

  const activeFarm = farms?.find((f: any) => f.id === activeFarmId) || farms?.[0];

  // Weather Query
  const { data: weather, isLoading: loadingWeather, isError: weatherError, refetch: refetchWeather } = useQuery({
    queryKey: ['weather'],
    queryFn: getCurrentWeather,
  });

  // News Query
  const { data: news, isLoading: loadingNews, refetch: refetchNews } = useQuery({
    queryKey: ['news', newsLimit],
    queryFn: async () => {
      try {
        const data = await api.getFarmNews(newsLimit);
        return data ?? [];
      } catch (err) {
        console.error('Error in news queryFn:', err);
        return [];
      }
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchWeather(), refetchNews()]);
    setRefreshing(false);
  };

  const isLoading = loadingWeather || loadingNews;

  if (isLoading && !refreshing && newsLimit === 5) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#2D5A27" />
        <Text className="mt-4 text-secondary text-lg">Acompanhando o campo...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5A27" />
        }
      >
        {/* Header */}
        <View className="mb-5">
          <Text className="text-secondary text-xs mb-1 italic font-bold uppercase tracking-wider">
            {activeFarm ? `Fazenda ${activeFarm.name}` : 'Hoje no Campo'}
          </Text>
          <Text className="text-primary text-2xl font-bold">Agricultor</Text>
        </View>

        {/* Weather Card - Refined Scale */}
        {weatherError ? (
          <View className="bg-amber-50 p-4 rounded-2xl mb-5 flex-row items-center border border-amber-200">
            <AlertTriangle size={20} color="#D97706" />
            <Text className="text-amber-800 ml-3 font-bold flex-1 text-xs">
              Ative a localização para ver o clima na sua fazenda.
            </Text>
          </View>
        ) : weather && (
          <View className="bg-primary p-5 rounded-2xl shadow-md mb-5">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <MapPin size={14} color="#A7F3D0" />
                  <Text className="text-white/80 text-[10px] ml-1.5 font-bold uppercase tracking-widest" numberOfLines={1}>
                    {weather.location}
                  </Text>
                </View>
                <Text className="text-white text-4xl font-bold">{weather.temp}°</Text>
                <Text className="text-white/90 text-lg font-bold mt-0.5 capitalize">
                  {weather.condition}
                </Text>
              </View>
              <View className="bg-white/10 p-2.5 rounded-full">
                {(() => {
                  const CurrentIcon = ICON_MAP[weather.conditionIcon] || Sun;
                  return <CurrentIcon size={48} color="#FFD700" />;
                })()}
              </View>
            </View>

            {/* Current details */}
            <View className="flex-row justify-between bg-white/10 p-4 rounded-xl mb-4">
              <View className="items-center">
                <Thermometer size={18} color="#A7F3D0" />
                <Text className="text-white text-xs font-bold mt-1">{weather.humidity}%</Text>
                <Text className="text-white/60 text-[8px] uppercase font-bold">Umidade</Text>
              </View>
              <View className="items-center">
                <Wind size={18} color="#A7F3D0" />
                <Text className="text-white text-xs font-bold mt-1">{weather.wind}km/h</Text>
                <Text className="text-white/60 text-[8px] uppercase font-bold">Vento</Text>
              </View>
              <View className="items-center">
                <Sun size={18} color="#A7F3D0" />
                <Text className="text-white text-xs font-bold mt-1">Alta UV</Text>
                <Text className="text-white/60 text-[8px] uppercase font-bold">Resumo</Text>
              </View>
            </View>

            {/* FORECAST SECTION */}
            <View className="bg-white/5 p-3 rounded-xl">
              <Text className="text-white/50 text-[10px] font-bold uppercase mb-3 tracking-widest">
                Próximos Dias
              </Text>
              <View className="flex-row justify-between">
                {weather.forecast.map((f, i) => {
                  const WeatherIcon = ICON_MAP[f.icon] || Sun;
                  return (
                    <View key={i} className="items-center">
                      <Text className="text-white/80 text-[10px] font-bold mb-1.5">
                        {i === 0 ? 'Hoje' : f.day}
                      </Text>
                      <WeatherIcon size={18} color={f.icon === 'Sun' ? '#FFD700' : '#fff'} />
                      <Text className="text-white font-bold text-xs mt-1.5">{f.temp}°</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* News Section - IMPLEMENT PAGINATION */}
        <View className="flex-row items-center gap-2 mb-4">
          <Newspaper size={20} color="#2D5A27" />
          <Text className="text-primary text-lg font-bold">Notícias do Campo</Text>
        </View>

        {!news || news.length === 0 ? (
          <View className="bg-white p-8 rounded-2xl items-center border border-gray-100 italic">
            <Text className="text-gray-400 text-xs">Nenhuma notícia encontrada.</Text>
          </View>
        ) : (
          <>
            {news.map((item: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                onPress={() => Linking.openURL(item.link)}
                className="bg-white p-4 rounded-2xl mb-4 border border-gray-100 shadow-sm active:bg-gray-50"
              >
                <View className="flex-row gap-3">
                  {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} className="w-20 h-20 rounded-xl" />
                  ) : (
                    <View className="w-20 h-20 rounded-xl bg-gray-100 items-center justify-center">
                      <Newspaper size={24} color="#94a3b8" />
                    </View>
                  )}
                  <View className="flex-1 gap-1.5">
                    <Text className="text-primary font-bold text-sm leading-5" numberOfLines={3}>
                      {item.title}
                    </Text>
                    <View className="flex-row justify-between items-center mt-auto">
                      <Text className="text-primary/60 font-bold text-[9px] uppercase tracking-widest">Canal Rural</Text>
                      <ExternalLink size={12} color="#94a3b8" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Pagination Button */}
            <TouchableOpacity
              onPress={() => setNewsLimit(prev => prev + 5)}
              disabled={loadingNews}
              className="bg-primary/5 py-3 rounded-xl items-center border border-primary/10 mb-6"
            >
              {loadingNews ? (
                <ActivityIndicator size="small" color="#2D5A27" />
              ) : (
                <Text className="text-primary font-bold text-xs uppercase tracking-widest">Carregar mais notícias</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
