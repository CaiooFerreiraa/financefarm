import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sprout, TrendingUp, TrendingDown, ChevronRight,
  CheckCircle2, X, RefreshCcw, Trash2
} from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useFarmStore } from '../../store/useFarmStore';

export default function Calculator() {
  const { userId } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const email = user?.primaryEmailAddress?.emailAddress;

  // Step-by-step form state
  const [step, setStep] = useState<'idle' | 'crop' | 'yield' | 'price' | 'confirm'>('idle');
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const [yieldVal, setYieldVal] = useState('');
  const [priceVal, setPriceVal] = useState('');

  const currentYear = new Date().getFullYear();

  const { activeFarmId } = useFarmStore();
  const farmId = activeFarmId;

  // Fetch crops
  const { data: crops, isLoading: loadingCrops } = useQuery({
    queryKey: ['crops'],
    queryFn: () => api.getCrops(),
  });

  // Fetch existing forecasts
  const { data: forecastsData, isLoading: loadingForecasts, refetch: refetchForecasts } = useQuery({
    queryKey: ['forecasts', farmId],
    queryFn: () => api.getForecasts(farmId!),
    enabled: !!farmId,
  });

  // Fetch real expenses (as the default cost)
  const { data: summaryData } = useQuery({
    queryKey: ['expenses-summary', farmId, currentYear],
    queryFn: () => api.getExpenseSummary(farmId!, currentYear),
    enabled: !!farmId,
  });

  // Pre-fill custo com gastos reais do ano
  const realCost = summaryData?.grandTotal ?? 0;

  // Live calculation
  const yieldNum = parseFloat(yieldVal) || 0;
  const priceNum = parseFloat(priceVal) || 0;
  const revenue = yieldNum * priceNum;
  const profit = revenue - realCost;
  const isProfit = profit >= 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchForecasts();
    setRefreshing(false);
  };

  const resetForm = () => {
    setStep('idle');
    setSelectedCrop(null);
    setYieldVal('');
    setPriceVal('');
  };

  // Save forecast mutation
  const createForecast = useMutation({
    mutationFn: (data: any) => api.createForecast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forecasts', farmId] });
      resetForm();
      Alert.alert('✅ Simulação salva!', 'Você pode ver o resultado nos cenários abaixo.');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    },
  });

  const handleSave = () => {
    if (!farmId || !selectedCrop) return;
    createForecast.mutate({
      farmId,
      cropId: selectedCrop.id,
      predictedYield: yieldNum,
      unitPrice: priceNum,
      estimatedCost: realCost,
    });
  };

  const isLoading = loadingForecasts;

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#2D5A27" />
        <Text className="mt-4 text-secondary text-lg">Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5A27" />}
      >
        {/* Header */}
        <Text className="text-secondary text-sm mb-1 uppercase tracking-wider font-bold">Quanto vou ganhar?</Text>
        <Text className="text-primary text-2xl font-bold mb-6">Calculadora</Text>

        {/* === STEP: IDLE — Start button === */}
        {step === 'idle' && (
          <TouchableOpacity
            onPress={() => setStep('crop')}
            className="bg-primary rounded-2xl p-6 items-center shadow-md mb-6"
            activeOpacity={0.85}
          >
            <Sprout size={40} color="#fff" />
            <Text className="text-white text-xl font-bold mt-3">Nova Simulação</Text>
            <Text className="text-white/70 text-sm mt-1 text-center">
              Toque aqui para calcular seu lucro estimado
            </Text>
          </TouchableOpacity>
        )}

        {/* === STEP: CROP — pick product === */}
        {step === 'crop' && (
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <Text className="text-primary text-xl font-bold mb-1">Qual produto?</Text>
            <Text className="text-gray-400 text-sm mb-5">
              Escolha o que você vai produzir nesta safra.
            </Text>

            {loadingCrops ? (
              <ActivityIndicator color="#2D5A27" />
            ) : (
              crops?.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => {
                    setSelectedCrop(c);
                    setPriceVal(c.latestPrice ? String(c.latestPrice) : '');
                    setStep('yield');
                  }}
                  className="flex-row items-center justify-between bg-surface p-4 rounded-xl mb-2.5"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="bg-primary/10 w-12 h-12 rounded-xl items-center justify-center">
                      <Text style={{ fontSize: 22 }}>{c.name[0]}</Text>
                    </View>
                    <View>
                      <Text className="text-primary font-bold text-lg">{c.name}</Text>
                      <Text className="text-gray-400 text-xs font-bold uppercase">{c.unit}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#2D5A27" />
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity onPress={resetForm} className="items-center mt-4">
              <Text className="text-gray-400 text-sm font-bold uppercase tracking-wider">Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === STEP: YIELD — how much produces === */}
        {step === 'yield' && (
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <View className="bg-primary/10 self-start px-3 py-1 rounded-full mb-3">
              <Text className="text-primary font-bold text-xs">{selectedCrop?.name}</Text>
            </View>

            <Text className="text-primary text-xl font-bold mb-1">
              Quanto espera produzir?
            </Text>
            <Text className="text-gray-400 text-sm mb-5">
              Em {selectedCrop?.unit ?? 'unidades'}.
            </Text>

            <TextInput
              className="bg-surface border-2 border-primary/20 rounded-xl px-4 text-primary font-bold text-2xl text-center"
              style={{ height: 64 }}
              placeholder="Ex: 200"
              placeholderTextColor="#CBD5E1"
              keyboardType="numeric"
              value={yieldVal}
              onChangeText={setYieldVal}
              autoFocus
            />

            <TouchableOpacity
              onPress={() => setStep('price')}
              disabled={!yieldVal || parseFloat(yieldVal) <= 0}
              className={`bg-primary mt-6 py-4 rounded-xl items-center shadow-sm ${(!yieldVal || parseFloat(yieldVal) <= 0) ? 'opacity-40' : ''}`}
            >
              <Text className="text-white font-bold text-lg">Próximo →</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('crop')} className="items-center mt-4">
              <Text className="text-gray-400 text-sm font-bold uppercase tracking-wider">← Voltar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === STEP: PRICE — unit price === */}
        {step === 'price' && (
          <View className="bg-white rounded-2xl p-5 shadow-sm mb-5">
            <View className="bg-primary/10 self-start px-3 py-1 rounded-full mb-3">
              <Text className="text-primary font-bold text-xs">{selectedCrop?.name}</Text>
            </View>

            <Text className="text-primary text-xl font-bold mb-1">
              Qual o preço de venda?
            </Text>
            <Text className="text-gray-400 text-sm mb-2">
              Valor por {selectedCrop?.unit ?? 'unidade'} em reais (R$).
            </Text>
            {selectedCrop?.latestPrice && (
              <View className="bg-green-50 px-3 py-1.5 rounded-lg mb-4 self-start">
                <Text className="text-green-700 text-xs font-bold uppercase">
                  Mercado: R$ {selectedCrop.latestPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <TextInput
              className="bg-surface border-2 border-primary/20 rounded-xl px-4 text-primary font-bold text-2xl text-center"
              style={{ height: 64 }}
              placeholder="Ex: 135.50"
              placeholderTextColor="#CBD5E1"
              keyboardType="numeric"
              value={priceVal}
              onChangeText={setPriceVal}
              autoFocus
            />

            <TouchableOpacity
              onPress={() => setStep('confirm')}
              disabled={!priceVal || parseFloat(priceVal) <= 0}
              className={`bg-primary mt-6 py-4 rounded-xl items-center shadow-sm ${(!priceVal || parseFloat(priceVal) <= 0) ? 'opacity-40' : ''}`}
            >
              <Text className="text-white font-bold text-lg">Ver Resultado →</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('yield')} className="items-center mt-4">
              <Text className="text-gray-400 text-sm font-bold uppercase tracking-wider">← Voltar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === STEP: CONFIRM — final result === */}
        {step === 'confirm' && (
          <View className="mb-5">
            {/* Result card - Refined scale */}
            <View className={`rounded-2xl p-6 shadow-md mb-4 ${isProfit ? 'bg-primary' : 'bg-red-500'}`}>
              <Text className="text-white/70 text-sm font-bold uppercase mb-1">
                {isProfit ? '🎉 Lucro Previsto' : '⚠️ Resultado Negativo'}
              </Text>
              <Text className="text-white text-4xl font-bold">
                {isProfit ? '+' : ''}R$ {Math.abs(profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
              <Text className="text-white/70 text-xs mt-1 italic font-bold">Estimativa para esta safra</Text>
            </View>

            {/* Breakdown */}
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4 gap-3">
              <Text className="text-primary text-lg font-bold mb-1">Detalhes do cálculo</Text>

              <View className="flex-row justify-between items-center bg-surface p-3.5 rounded-xl">
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Produto</Text>
                  <Text className="text-primary font-bold text-base">{selectedCrop?.name}</Text>
                </View>
                <Text className="text-primary font-bold text-sm">{yieldVal} {selectedCrop?.unit}</Text>
              </View>

              <View className="flex-row justify-between items-center bg-green-50 p-3.5 rounded-xl">
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Receita bruta</Text>
                  <Text className="text-green-700 font-bold text-base">
                    R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <Text className="text-green-600 font-bold text-xs">
                  {yieldVal} × R$ {priceNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View className="flex-row justify-between items-center bg-red-50 p-3.5 rounded-xl">
                <View>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">Custos (Ano Real)</Text>
                  <Text className="text-red-600 font-bold text-base">
                    - R$ {realCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <TrendingDown size={14} color="#EF4444" />
              </View>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={createForecast.isPending}
              className="bg-primary py-4 rounded-xl items-center shadow-md mb-3"
            >
              {createForecast.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text className="text-white font-bold text-lg">💾 Salvar Simulação</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={resetForm}
              className="bg-white border border-gray-100 py-3.5 rounded-xl items-center"
            >
              <Text className="text-gray-400 text-sm font-bold uppercase tracking-wider">Refazer cálculo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* === Saved Forecasts === */}
        {step === 'idle' && forecastsData && forecastsData.forecasts.length > 0 && (
          <>
            <Text className="text-primary text-lg font-bold mb-4 italic">Simulações salvas</Text>

            {/* Summary banner */}
            <View className="bg-primary/5 p-4 rounded-2xl mb-4 flex-row justify-between border border-primary/10">
              <View>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Receita total prevista</Text>
                <Text className="text-primary font-bold text-xl">
                  R$ {(forecastsData.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Lucro estimado</Text>
                <Text className="text-green-700 font-bold text-xl">
                  R$ {(forecastsData.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {forecastsData.forecasts.map((f: any) => {
              const fp = f.estimatedProfit ?? (f.predictedYield * f.unitPrice - f.estimatedCost);
              const pos = fp >= 0;
              return (
                <View key={f.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-50">
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-primary/10 w-10 h-10 rounded-xl items-center justify-center">
                        <Text style={{ fontSize: 18 }}>{f.crop?.name?.[0] ?? '?'}</Text>
                      </View>
                      <View>
                        <Text className="text-primary font-bold text-base leading-5">{f.crop?.name}</Text>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase">
                          {f.predictedYield} {f.crop?.unit} · R$ {f.unitPrice}/un
                        </Text>
                      </View>
                    </View>
                    <View className={`px-2.5 py-1.5 rounded-xl ${pos ? 'bg-green-50' : 'bg-red-50'}`}>
                      <Text className={`font-bold text-sm ${pos ? 'text-green-700' : 'text-red-700'}`}>
                        {pos ? '+' : ''} R$ {Math.abs(fp).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
