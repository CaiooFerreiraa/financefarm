import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, Search, RefreshCcw, Star, Sprout, Filter, Plus, X } from 'lucide-react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

type FilterMode = 'all' | 'watchlist';

export default function Monitor() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('saca (60kg)');
  const [newPrice, setNewPrice] = useState('');

  // Fetch all crops
  const { data: crops, isLoading: loadingCrops, refetch: refetchCrops } = useQuery({
    queryKey: ['crops'],
    queryFn: () => api.getCrops(),
    refetchInterval: 60 * 60 * 1000, // Atualiza a cada 1 hora
    refetchOnWindowFocus: true,
  });

  // Fetch user watchlist
  const { data: watchlist, isLoading: loadingWatchlist, refetch: refetchWatchlist } = useQuery({
    queryKey: ['watchlist', userId],
    queryFn: () => api.getWatchlist(userId!),
    enabled: !!userId,
  });

  const watchlistIds = useMemo(
    () => new Set((watchlist ?? []).map((c: any) => c.id)),
    [watchlist]
  );

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: () => api.seedCrops(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
  });

  // Toggle watchlist mutation
  const toggleMutation = useMutation({
    mutationFn: (cropId: string) => api.toggleWatchlist(userId!, cropId),
    onSuccess: (data: any, cropId: string) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      const crop = crops?.find((c: any) => c.id === cropId);
      if (data.action === 'added') {
        Alert.alert('⭐ Adicionado', `${crop?.name} foi adicionado à sua lista de monitoramento.`);
      }
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível atualizar o monitoramento. Tente novamente.');
    },
  });

  // Create crop mutation
  const createCropMutation = useMutation({
    mutationFn: (data: any) => api.createCrop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
      setShowAddModal(false);
      setNewName('');
      setNewPrice('');
      Alert.alert('Sucesso', 'Produto adicionado ao mercado!');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCrops(), refetchWatchlist()]);
    setRefreshing(false);
  };

  const handleAddProduct = () => {
    if (!newName || !newUnit) return;
    createCropMutation.mutate({
      name: newName,
      unit: newUnit,
      latestPrice: parseFloat(newPrice) || 0,
    });
  };

  // Filter + search logic
  const displayedCrops = useMemo(() => {
    let list = crops ?? [];
    if (filterMode === 'watchlist') {
      list = list.filter((c: any) => watchlistIds.has(c.id));
    }
    if (searchText.trim()) {
      list = list.filter((c: any) =>
        c.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    return list;
  }, [crops, filterMode, watchlistIds, searchText]);

  const isLoading = loadingCrops || loadingWatchlist;

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#2D5A27" />
        <Text className="mt-4 text-secondary text-lg">Carregando cotações...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <View className="flex-1 px-6 pt-6">

        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-secondary text-sm italic mb-1">Acompanhamento</Text>
            <Text className="text-primary text-2xl font-bold">Mercado</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="bg-primary p-3 rounded-full shadow-sm"
            >
              <Plus size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => seedMutation.mutate()}
              className="bg-white p-3 rounded-full shadow-sm border border-gray-50"
              disabled={seedMutation.isPending}
            >
              <RefreshCcw size={22} color={seedMutation.isPending ? '#9CA3AF' : '#2D5A27'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="bg-white flex-row items-center px-4 py-3 rounded-2xl mb-5 shadow-sm border border-gray-100">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-3 text-gray-700 text-base h-10"
            placeholder="Buscar produto agrícola..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Filter Tabs */}
        <View className="flex-row mb-5 bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          <TouchableOpacity
            onPress={() => setFilterMode('all')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-2 ${filterMode === 'all' ? 'bg-primary' : ''}`}
          >
            <Filter size={16} color={filterMode === 'all' ? '#fff' : '#9CA3AF'} />
            <Text className={`font-bold text-sm ${filterMode === 'all' ? 'text-white' : 'text-gray-400'}`}>
              Todos ({crops?.length ?? 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterMode('watchlist')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-2 ${filterMode === 'watchlist' ? 'bg-primary' : ''}`}
          >
            <Star size={16} color={filterMode === 'watchlist' ? '#fff' : '#9CA3AF'} />
            <Text className={`font-bold text-sm ${filterMode === 'watchlist' ? 'text-white' : 'text-gray-400'}`}>
              Monitorando ({watchlistIds.size})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Crops List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5A27" />
          }
        >
          {/* Empty State */}
          {!crops || crops.length === 0 ? (
            <View className="bg-white p-8 rounded-3xl items-center border border-gray-100 shadow-sm mt-4">
              <View className="bg-primary/10 p-5 rounded-full mb-4">
                <Sprout size={40} color="#2D5A27" />
              </View>
              <Text className="text-primary text-xl font-bold text-center">Nenhum produto cadastrado</Text>
              <Text className="text-gray-400 text-center mt-2 text-sm leading-relaxed">
                Toque em atualizar para popular os produtos disponíveis.
              </Text>
              <TouchableOpacity
                onPress={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                className="bg-primary mt-6 px-6 py-3 rounded-2xl"
              >
                {seedMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text className="text-white font-bold text-lg">Popular Produtos</Text>
                }
              </TouchableOpacity>
            </View>
          ) : displayedCrops.length === 0 ? (
            <View className="bg-white p-8 rounded-3xl items-center border border-gray-100 shadow-sm mt-4">
              <Star size={40} color="#9CA3AF" />
              <Text className="text-gray-500 font-bold text-lg mt-4">
                {filterMode === 'watchlist'
                  ? 'Lista vazia'
                  : 'Nenhum resultado'}
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center leading-relaxed">
                {filterMode === 'watchlist'
                  ? 'Toque na estrela para acompanhar aqui.'
                  : `Nenhum produto corresponde a "${searchText}".`}
              </Text>
            </View>
          ) : (
            displayedCrops.map((item: any) => {
              const inWatchlist = watchlistIds.has(item.id);
              const price = item.latestPrice;
              const hasPrice = price !== null && price !== undefined;

              return (
                <View
                  key={item.id}
                  className="bg-white p-4 rounded-3xl mb-3 shadow-sm border border-gray-50 flex-row items-center justify-between"
                >
                  {/* Left: info */}
                  <View className="flex-row items-center flex-1 pr-3">
                    <View className="bg-surface w-12 h-12 rounded-2xl items-center justify-center mr-4 shadow-sm">
                      <Text className="text-2xl">{item.name[0]}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-primary font-bold text-lg leading-6">{item.name}</Text>
                      <Text className="text-gray-400 text-xs italic font-bold uppercase">{item.unit}</Text>
                    </View>
                  </View>

                  {/* Right: price + watch button */}
                  <View className="items-end gap-2">
                    {hasPrice ? (
                      <Text className="text-primary font-bold text-lg">
                        R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    ) : (
                      <Text className="text-gray-300 text-xs italic">Sem cotação</Text>
                    )}

                    <TouchableOpacity
                      onPress={() => {
                        if (!userId) {
                          Alert.alert('Atenção', 'Você precisa estar logado.');
                          return;
                        }
                        toggleMutation.mutate(item.id);
                      }}
                      disabled={toggleMutation.isPending}
                      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl ${inWatchlist ? 'bg-amber-50 shadow-sm' : 'bg-gray-50'}`}
                    >
                      <Star
                        size={14}
                        color={inWatchlist ? '#F59E0B' : '#9CA3AF'}
                        fill={inWatchlist ? '#F59E0B' : 'transparent'}
                      />
                      <Text className={`text-xs font-bold ${inWatchlist ? 'text-amber-600' : 'text-gray-400'}`}>
                        {inWatchlist ? 'Monitorando' : 'Monitorar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          <View className="h-12" />
        </ScrollView>
      </View>

      {/* Add Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-primary italic">Novo Produto</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} className="bg-gray-100 p-2 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="gap-5">
              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Nome do Produto</Text>
                <TextInput
                  placeholder="Ex: Soja Transgênica"
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14 text-base"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>

              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Unidade</Text>
                <TextInput
                  placeholder="Ex: saca (60kg)"
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14 text-base"
                  value={newUnit}
                  onChangeText={setNewUnit}
                />
              </View>

              <View className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <View className="flex-row items-center">
                  <RefreshCcw size={12} color="#2D5A27" />
                  <Text className="text-[10px] font-bold text-primary uppercase ml-2 tracking-widest">Cotação Automática</Text>
                </View>
                <Text className="text-secondary text-[10px] mt-1 italic">
                  O sistema buscará a melhor cotação do mercado para este produto automaticamente após o cadastro.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleAddProduct}
                disabled={createCropMutation.isPending}
                className="bg-primary w-full py-4 rounded-xl items-center shadow-md mt-2"
              >
                {createCropMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Cadastrar e Buscar Preço</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
