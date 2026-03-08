import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sprout, TrendingUp, TrendingDown, Wallet, Plus, ChevronRight, Trash2, X, Calendar } from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useFarmStore } from '../../store/useFarmStore';

export default function Harvests() {
  const { userId } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress;

  const { activeFarmId } = useFarmStore();
  const farmId = activeFarmId;

  // Fetch harvests
  const { data: harvests, isLoading, refetch } = useQuery({
    queryKey: ['harvests', farmId],
    queryFn: () => api.getHarvests(farmId!),
    enabled: !!farmId,
  });

  // Close year mutation
  const closeYearMutation = useMutation({
    mutationFn: (year: number) => api.closeYear(farmId!, year),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['harvests', farmId] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary', farmId] });
      setShowCloseModal(false);
      Alert.alert('✅ Safra fechada!', `A safra de ${data.year} foi registrada com sucesso.`);
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.message || 'Não foi possível fechar a safra.');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteHarvest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests', farmId] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCloseYear = (year: number) => {
    Alert.alert(
      `Fechar safra ${year}?`,
      `Isso vai calcular os gastos e a produção de ${year} e salvar o resumo como uma safra encerrada. Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fechar Safra', onPress: () => closeYearMutation.mutate(year) },
      ]
    );
  };

  const handleDelete = (id: string, year: string) => {
    Alert.alert(
      `Excluir safra ${year}?`,
      'Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ]
    );
  };

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 1, currentYear - 2, currentYear - 3];

  if (!farmId && !isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-10">
        <Sprout size={80} color="#2D5A27" />
        <Text className="text-primary text-3xl font-bold mt-6 text-center">Nenhuma fazenda</Text>
        <Text className="text-gray-400 text-center mt-3 text-lg leading-relaxed">
          Cadastre sua fazenda na tela inicial para ver o histórico de safras.
        </Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#2D5A27" />
        <Text className="mt-4 text-secondary text-lg">Carregando safras...</Text>
      </View>
    );
  }

  const totalGains = (harvests || []).reduce((s: number, h: any) => s + (h.totalProfit || 0), 0);
  const totalProduced = (harvests || []).reduce((s: number, h: any) => s + (h.totalYield || 0), 0);

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5A27" />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-secondary text-sm italic mb-1">Histórico</Text>
            <Text className="text-primary text-2xl font-bold">Safras</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCloseModal(true)}
            className="bg-primary px-4 py-3 rounded-2xl flex-row items-center gap-2 shadow-md"
          >
            <Plus size={20} color="#fff" />
            <Text className="text-white font-bold text-base">Encerrar Ano</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state */}
        {!harvests || harvests.length === 0 ? (
          <View className="bg-white p-10 rounded-3xl items-center border border-gray-100 shadow-sm">
            <View className="bg-primary/10 p-6 rounded-full mb-5">
              <Sprout size={48} color="#2D5A27" />
            </View>
            <Text className="text-primary text-xl font-bold text-center">Nenhuma safra registrada</Text>
            <Text className="text-gray-400 text-center mt-3 text-sm leading-relaxed">
              Ao final de cada ano agrícola, feche a safra para registrar os resultados.
            </Text>
            <TouchableOpacity
              onPress={() => setShowCloseModal(true)}
              className="bg-primary mt-8 px-8 py-4 rounded-2xl shadow-md"
            >
              <Text className="text-white font-bold text-lg">Fechar Primeira Safra</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary banner - Refined scale */}
            <View className="bg-primary p-6 rounded-3xl mb-8 shadow-lg">
              <Text className="text-white/70 text-xs uppercase font-bold tracking-widest mb-1">Total de Safras</Text>
              <Text className="text-white text-3xl font-bold mb-6">
                {harvests.length} {harvests.length === 1 ? 'ano' : 'anos'} registrados
              </Text>

              <View className="flex-row justify-between items-end">
                <View>
                  <Text className="text-white/70 text-[10px] font-bold uppercase mb-1">Lucro Médio</Text>
                  <Text className="text-[#A7F3D0] text-2xl font-bold">
                    R$ {(totalGains / harvests.length).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-white/70 text-[10px] font-bold uppercase mb-1">Total Produzido</Text>
                  <Text className="text-white text-2xl font-bold">
                    {totalProduced.toLocaleString('pt-BR')} un.
                  </Text>
                </View>
              </View>
            </View>

            {/* Harvest list */}
            <Text className="text-primary text-xl font-bold italic mb-5">Resultados por Ano</Text>
            {harvests.map((h: any) => {
              const isProfit = h.totalProfit >= 0;
              return (
                <View key={h.id} className="bg-white rounded-3xl mb-5 shadow-sm border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-50 bg-gray-50/50">
                    <View className="flex-row items-center gap-3">
                      <View className="bg-primary/10 p-3 rounded-xl">
                        <Calendar size={22} color="#2D5A27" />
                      </View>
                      <View>
                        <Text className="text-primary text-xl font-bold">Ano {h.year}</Text>
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                          {h.crop?.name || 'Vários cultivos'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(h.id, h.year)}
                      className="bg-red-50 p-2 rounded-full"
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Metrics - Refined labels/values */}
                  <View className="p-6 gap-4">
                    <View className="flex-row items-center justify-between pb-3 border-b border-gray-50">
                      <View className="flex-row items-center gap-3">
                        <Sprout size={20} color="#3B82F6" />
                        <Text className="text-gray-500 text-base font-bold">Produção</Text>
                      </View>
                      <Text className="text-primary font-bold text-lg">{(h.totalYield || 0).toLocaleString('pt-BR')} un.</Text>
                    </View>

                    <View className="flex-row items-center justify-between pb-3 border-b border-gray-50">
                      <View className="flex-row items-center gap-3">
                        <TrendingDown size={20} color="#EF4444" />
                        <Text className="text-gray-500 text-base font-bold">Custos</Text>
                      </View>
                      <Text className="text-red-500 font-bold text-lg">
                        - R$ {(h.totalExpenses || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </Text>
                    </View>

                    <View className={`p-5 rounded-2xl mt-2 border ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-row items-center gap-2.5">
                          <Wallet size={20} color={isProfit ? '#10B981' : '#EF4444'} />
                          <Text className={`font-bold text-lg ${isProfit ? 'text-green-700' : 'text-red-700'}`}>Lucro Líquido</Text>
                        </View>
                        <Text className={`text-2xl font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
                          {isProfit ? '+' : ''} R$ {(h.totalProfit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
        <View className="h-12" />
      </ScrollView>

      {/* Close Year Modal */}
      <Modal visible={showCloseModal} animationType="slide" transparent={true} onRequestClose={() => setShowCloseModal(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-[50px] p-10 pb-16 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-3xl font-bold text-primary italic">Encerrar Ano</Text>
              <TouchableOpacity onPress={() => setShowCloseModal(false)} className="bg-gray-100 p-3 rounded-full">
                <X size={32} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 text-lg mb-8 leading-relaxed">
              O sistema irá buscar todos os seus gastos registrados no ano selecionado para calcular seu lucro final.
            </Text>

            <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Selecione o Ano Agrícula</Text>
            <View className="gap-5">
              {availableYears.map((year) => {
                const alreadyClosed = harvests?.some((h: any) => h.year === String(year));
                return (
                  <TouchableOpacity
                    key={year}
                    onPress={() => {
                      setShowCloseModal(false);
                      handleCloseYear(year);
                    }}
                    disabled={alreadyClosed || closeYearMutation.isPending}
                    className={`flex-row items-center justify-between p-6 rounded-[28px] border-2 ${alreadyClosed ? 'border-gray-50 bg-gray-50 opacity-40' : 'border-primary/20 bg-primary/5 shadow-sm'
                      }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className={`p-4 rounded-2xl ${alreadyClosed ? 'bg-gray-100' : 'bg-primary/20'}`}>
                        <Calendar size={28} color={alreadyClosed ? '#9CA3AF' : '#2D5A27'} />
                      </View>
                      <Text className={`font-bold text-2xl ${alreadyClosed ? 'text-gray-400' : 'text-primary'}`}>
                        Safra {year}
                      </Text>
                    </View>
                    {alreadyClosed ? (
                      <Text className="text-gray-500 font-bold">FECHADA</Text>
                    ) : (
                      <ChevronRight size={28} color="#2D5A27" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
