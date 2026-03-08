import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, LayoutDashboard, Plus, DollarSign, Wallet, Sprout, X, BarChart2, Info, RefreshCcw, Leaf } from 'lucide-react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useFarmStore } from '../../store/useFarmStore';
import { Settings, ChevronDown, Check } from 'lucide-react-native';

export default function Home() {
  const { userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { activeFarmId, setActiveFarmId } = useFarmStore();

  // Registration State
  const [showRegForm, setShowRegForm] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [showFarmSwitcher, setShowFarmSwitcher] = useState(false);

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCat, setExpCat] = useState('Produção');

  // Harvest Modal State
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [harvCrop, setHarvCrop] = useState('');
  const [harvYear, setHarvYear] = useState(String(new Date().getFullYear()));
  const [harvYield, setHarvYield] = useState('');
  const [harvUnitPrice, setHarvUnitPrice] = useState('');
  const [harvProfit, setHarvProfit] = useState('');

  // Summary Modal State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryView, setSummaryView] = useState<'month' | 'semester'>('month');
  const currentYear = new Date().getFullYear();

  const email = user?.primaryEmailAddress?.emailAddress;

  const { data: farms, isLoading: isLoadingFarms, refetch } = useQuery({
    queryKey: ['farms', userId, email],
    queryFn: () => api.getFarms(userId!, email),
    enabled: !!userId,
  });

  // Sync active farm with store
  useEffect(() => {
    if (farms && farms.length > 0 && !activeFarmId) {
      setActiveFarmId(farms[0].id);
    }
  }, [farms, activeFarmId]);

  const activeFarm = farms?.find((f: any) => f.id === activeFarmId) || farms?.[0];

  // Fetch expense summary (full year)
  const { data: summaryData } = useQuery({
    queryKey: ['expenses-summary', activeFarm?.id, currentYear],
    queryFn: () => api.getExpenseSummary(activeFarm!.id, currentYear),
    enabled: !!activeFarm?.id,
  });

  // Fetch harvests (historical results)
  const { data: harvests, refetch: refetchHarvests } = useQuery({
    queryKey: ['harvests', activeFarm?.id],
    queryFn: () => api.getHarvests(activeFarm!.id),
    enabled: !!activeFarm?.id,
  });

  // Fetch Crops for market rates comparison
  const { data: crops } = useQuery({
    queryKey: ['crops'],
    queryFn: () => api.getCrops(),
  });

  // Fetch currencies (USD, EUR, BTC, GBP)
  const { data: currencies, refetch: refetchCurrencies } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => api.getCurrency(),
  });

  // Create Farm Mutation
  // ...
  const createFarmMutation = useMutation({
    mutationFn: (name: string) => api.createFarm({ name, clerkId: userId!, email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farms', userId, email] });
      setFarmName('');
      setShowRegForm(false);
    },
  });

  // Create Expense Mutation
  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => api.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', activeFarm?.id] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary', activeFarm?.id, currentYear] });
      setShowExpenseModal(false);
      setExpDesc('');
      setExpAmount('');
      Alert.alert('Sucesso', 'Gasto registrado com sucesso!');
    },
  });

  // Derived state: Auto-calculate profit
  useEffect(() => {
    const qty = parseFloat(harvYield) || 0;
    const price = parseFloat(harvUnitPrice) || 0;
    if (qty > 0 && price > 0) {
      setHarvProfit((qty * price).toFixed(2));
    } else {
      setHarvProfit('');
    }
  }, [harvYield, harvUnitPrice]);

  // Create Harvest mutation
  const createHarvestMutation = useMutation({
    mutationFn: (data: any) => api.createHarvest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests', activeFarm?.id] });
      setShowHarvestModal(false);
      setHarvCrop('');
      setHarvYield('');
      setHarvUnitPrice('');
      setHarvProfit('');
      Alert.alert('Sucesso', 'Venda de safra registrada com sucesso!');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refetch(),
        refetchCurrencies(),
        refetchHarvests(),
        queryClient.invalidateQueries({ queryKey: ['expenses-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['crops'] })
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateFarm = () => {
    if (!farmName.trim()) return;
    createFarmMutation.mutate(farmName);
  };

  const handleAddExpense = () => {
    if (!expDesc || !expAmount || !activeFarm) return;
    createExpenseMutation.mutate({
      farmId: activeFarm.id,
      description: expDesc,
      amount: parseFloat(expAmount),
      category: expCat,
      date: new Date().toISOString(),
    });
  };

  const handleAddHarvest = () => {
    if (!harvCrop || !activeFarm || !harvProfit) return;
    createHarvestMutation.mutate({
      farmId: activeFarm.id,
      cropName: harvCrop,
      year: parseInt(harvYear),
      production: parseFloat(harvYield) || 0,
      totalProfit: parseFloat(harvProfit),
    });
  };

  if (isLoadingFarms) {
    return (
      <View className="flex-1 justify-center items-center bg-surface">
        <ActivityIndicator size="large" color="#2D5A27" />
        <Text className="mt-4 text-secondary text-lg">Carregando fazenda...</Text>
      </View>
    );
  }

  // If user has no farm, show a setup screen with form
  if (!activeFarm) {
    return (
      <SafeAreaView className="flex-1 bg-surface px-6 justify-center">
        <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <View className="bg-primary/10 p-4 rounded-full self-center mb-6">
            <Sprout size={48} color="#2D5A27" />
          </View>
          <Text className="text-2xl font-bold text-primary text-center">Configurar Fazenda</Text>
          <Text className="text-secondary text-center mt-2 mb-8">
            Dê um nome para sua propriedade para começar a gerenciar seus dados.
          </Text>

          <View className="mb-6">
            <Text className="text-xs font-bold text-gray-400 uppercase mb-2">Nome da Fazenda</Text>
            <TextInput
              placeholder="Ex: Fazenda Santa Maria"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 h-14"
              value={farmName}
              onChangeText={setFarmName}
            />
          </View>

          <TouchableOpacity
            className={`bg-primary w-full py-4 rounded-xl flex-row items-center justify-center ${createFarmMutation.isPending ? 'opacity-70' : ''}`}
            onPress={handleCreateFarm}
            disabled={createFarmMutation.isPending}
          >
            {createFarmMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Plus size={20} color="#fff" className="mr-2" />
                <Text className="text-white font-bold text-lg">Criar Minha Fazenda</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Real data balance: (Sum of profits from past harvests) - (Current year expenses)
  const pastHarvestsProfit = (harvests || []).reduce((s: number, h: any) => s + (h.totalProfit || 0), 0);
  const currentExpenses = summaryData?.grandTotal || 0;
  const currentBalance = pastHarvestsProfit - currentExpenses;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5A27" />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            onPress={() => setShowFarmSwitcher(true)}
            className="flex-1 mr-4"
          >
            <Text className="text-secondary text-[10px] font-bold uppercase tracking-wider">Minha Propriedade</Text>
            <View className="flex-row items-center">
              <Text className="text-primary text-2xl font-bold mr-1" numberOfLines={1}>
                {activeFarm?.name || 'Selecionar...'}
              </Text>
              <ChevronDown size={20} color="#2D5A27" strokeWidth={3} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.navigate('/farmer')}
            className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 items-center justify-center"
          >
            <LayoutDashboard size={24} color="#2D5A27" />
          </TouchableOpacity>
        </View>

        {/* Financial Summary Card - Refined scale */}
        <View className={`p-6 rounded-3xl shadow-lg mb-6 ${currentBalance >= 0 ? 'bg-primary' : 'bg-red-600'}`}>
          <Text className="text-white/80 text-xs mb-1 font-bold italic uppercase tracking-widest">Saldo do Campo</Text>
          <Text className="text-white text-4xl font-bold mb-6">
            R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>

          <View className="flex-row justify-between">
            <View>
              <View className="flex-row items-center mb-1">
                <TrendingUp size={16} color="#A7F3D0" />
                <Text className="text-[#A7F3D0] text-[10px] ml-2 font-bold uppercase">Ganhos</Text>
              </View>
              <Text className="text-white text-xl font-bold">
                R$ {pastHarvestsProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center mb-1">
                <TrendingDown size={16} color="#FECACA" />
                <Text className="text-[#FECACA] text-[10px] ml-2 font-bold uppercase">Gastos</Text>
              </View>
              <Text className="text-white text-xl font-bold">
                R$ {currentExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Market Rates - NEW SECTION */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-primary text-lg font-bold italic">Cotações</Text>
            <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-full">
              <View className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-700 text-[8px] font-bold uppercase">Ao Vivo</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
            {[
              { id: 'USDBRL', label: 'Dólar' },
              { id: 'EURBRL', label: 'Euro' },
              { id: 'BTCBRL', label: 'Bitcoin' },
              { id: 'GBPBRL', label: 'Libra' },
            ].map((cur) => {
              const data = currencies?.[cur.id];
              if (!data) return null;
              const isUp = parseFloat(data.pctChange) >= 0;
              return (
                <View key={cur.id} className="bg-white p-4 rounded-2xl mr-3 border border-gray-100 shadow-sm min-w-[120px]">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase mb-1">{cur.label}</Text>
                  <Text className="text-primary font-bold text-lg mb-1">R$ {parseFloat(data.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: cur.id === 'BTCBRL' ? 0 : 2 })}</Text>
                  <View className="flex-row items-center">
                    {isUp ? <TrendingUp size={12} color="#16a34a" /> : <TrendingDown size={12} color="#dc2626" />}
                    <Text className={`ml - 1 font - bold text - [10px] ${isUp ? 'text-green-600' : 'text-red-600'} `}>
                      {isUp ? '+' : ''}{data.pctChange}%
                    </Text>
                  </View>
                </View>
              );
            })}
            {!currencies && <Text className="text-gray-400 italic text-xs">Aguardando cotações...</Text>}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
          <TouchableOpacity
            onPress={() => setShowExpenseModal(true)}
            className="bg-white w-[47%] p-5 rounded-3xl items-center border border-gray-100 shadow-sm"
          >
            <View className="bg-red-50 p-4 rounded-full mb-3">
              <Plus size={24} color="#dc2626" />
            </View>
            <Text className="text-primary font-bold text-sm">Add Gasto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowHarvestModal(true)}
            className="bg-white w-[47%] p-5 rounded-3xl items-center border border-gray-100 shadow-sm"
          >
            <View className="bg-green-50 p-4 rounded-full mb-3">
              <TrendingUp size={24} color="#16a34a" />
            </View>
            <Text className="text-primary font-bold text-sm">Vender Safra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSummaryModal(true)}
            className="bg-white w-[47%] p-5 rounded-3xl items-center border border-gray-100 shadow-sm"
          >
            <View className="bg-blue-50 p-4 rounded-full mb-3">
              <BarChart2 size={24} color="#3b82f6" />
            </View>
            <Text className="text-primary font-bold text-sm">Histórico</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/harvests')}
            className="bg-white w-[47%] p-5 rounded-3xl items-center border border-gray-100 shadow-sm"
          >
            <View className="bg-gray-50 p-4 rounded-full mb-3">
              <Wallet size={24} color="#64748B" />
            </View>
            <Text className="text-primary font-bold text-sm">Safras</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity (Bank Extract Style) */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-primary text-xl font-bold italic">Extrato de Atividade</Text>
            <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Últimos 2 meses</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/harvests')}>
            <Text className="text-secondary font-bold">Ver tudo</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-6 bg-white p-6 rounded-[32px] border border-gray-50 shadow-sm">
          {(() => {
            const now = new Date();
            const currM = now.getMonth() + 1;
            const prevM = currM === 1 ? 12 : currM - 1;

            const recentExpenses = (summaryData?.byMonth || [])
              .filter(m => m.month === currM || m.month === prevM)
              .map((m: any) => ({
                ...m,
                type: 'expense',
                sortDate: new Date(currentYear, m.month - 1, 31), // End of month for sorting
                month: m.month,
                title: `Gastos de ${m.label}`,
                subtitle: `${m.count} lançamentos`,
                value: m.total,
              }));

            const recentGains = (harvests || [])
              .filter(h => {
                const date = h.createdAt ? new Date(h.createdAt) : new Date();
                const m = date.getMonth() + 1;
                const y = date.getFullYear();
                return y === currentYear && (m === currM || m === prevM);
              })
              .map((h: any) => {
                const date = h.createdAt ? new Date(h.createdAt) : new Date();
                return {
                  ...h,
                  type: 'gain',
                  sortDate: date,
                  month: date.getMonth() + 1,
                  title: h.cropName,
                  subtitle: `Venda Safra ${h.year}`,
                  value: h.totalProfit,
                };
              });

            const combined = [...recentExpenses, ...recentGains]
              .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

            if (combined.length === 0) {
              return <Text className="text-gray-400 italic text-center py-4">Sem movimentações recentes.</Text>;
            }

            // Grouping by "Este Mês" and "Mês Anterior"
            return Array.from(new Set(combined.map(i => i.month))).map(monthId => (
              <View key={monthId} className="mb-4 last:mb-0">
                <Text className="text-primary/40 text-[10px] font-black uppercase mb-3 px-1">
                  {monthId === currM ? 'Este Mês' : 'Mês Anterior'}
                </Text>
                <View className="gap-4">
                  {combined.filter(i => i.month === monthId).map((item: any, idx: number) => (
                    <View key={`${monthId}-${idx}`} className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-3">
                        <View className={`${item.type === 'gain' ? 'bg-green-50' : 'bg-red-50'} p-2.5 rounded-xl`}>
                          {item.type === 'gain' ? (
                            <Sprout size={16} color="#16a34a" />
                          ) : (
                            <TrendingDown size={16} color="#dc2626" />
                          )}
                        </View>
                        <View>
                          <Text className="text-primary font-bold text-sm">{item.title}</Text>
                          <Text className="text-gray-400 text-[10px]">{item.subtitle}</Text>
                        </View>
                      </View>
                      <Text className={`font-bold text-base ${item.type === 'gain' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.type === 'gain' ? '+' : '-'} R$ {item.value.toLocaleString('pt-BR')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ));
          })()}
        </View>
      </ScrollView>

      {/* MODALS */}
      <Modal visible={showExpenseModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-primary italic">Novo Gasto</Text>
              <TouchableOpacity onPress={() => setShowExpenseModal(false)} className="bg-gray-100 p-2 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="gap-5">
              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Descrição</Text>
                <TextInput
                  placeholder="Ex: Adubo NPK"
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14 text-base"
                  value={expDesc}
                  onChangeText={setExpDesc}
                />
              </View>

              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Valor (R$)</Text>
                <TextInput
                  placeholder="0,00"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14 text-xl font-bold text-primary"
                  value={expAmount}
                  onChangeText={setExpAmount}
                />
              </View>

              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Categoria</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['Produção', 'Logística', 'Mão de Obra', 'Outros'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setExpCat(cat)}
                      className={`px-4 py-2.5 rounded-xl border ${expCat === cat ? 'bg-primary border-primary' : 'bg-white border-gray-100'}`}
                    >
                      <Text className={`font-bold text-xs ${expCat === cat ? 'text-white' : 'text-gray-400'}`}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleAddExpense}
                disabled={createExpenseMutation.isPending}
                className="bg-primary w-full py-4 rounded-xl items-center shadow-md mt-2"
              >
                {createExpenseMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Salvar Gasto</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Harvest Modal (Sales) */}
      <Modal visible={showHarvestModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-primary italic">Venda de Safra</Text>
              <TouchableOpacity onPress={() => setShowHarvestModal(false)} className="bg-gray-100 p-2 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="gap-5">
              <View>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Cultura/Produto</Text>
                <TextInput
                  placeholder="Ex: Soja"
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14 text-base"
                  value={harvCrop}
                  onChangeText={setHarvCrop}
                />
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Quantidade (Sacas/Kg)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="0"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14"
                    value={harvYield}
                    onChangeText={setHarvYield}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">Preço Unitário (R$)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="0,00"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 h-14"
                    value={harvUnitPrice}
                    onChangeText={setHarvUnitPrice}
                  />
                </View>
              </View>

              {/* Market Comparison Indicator */}
              {(() => {
                const matchedCrop = crops?.find((c: any) =>
                  harvCrop.toLowerCase().trim() && (
                    harvCrop.toLowerCase().includes(c.name.toLowerCase()) ||
                    c.name.toLowerCase().includes(harvCrop.toLowerCase())
                  )
                );

                if (!matchedCrop || !harvUnitPrice) return null;

                const marketPrice = matchedCrop.latestPrice;
                const userPrice = parseFloat(harvUnitPrice);
                const isAbove = userPrice > marketPrice;
                const isBelow = userPrice < marketPrice;
                const percentDiff = Math.abs(((userPrice - marketPrice) / marketPrice) * 100).toFixed(1);

                return (
                  <View className={`p-3 rounded-xl flex-row items-center ${isAbove ? 'bg-green-50' : isBelow ? 'bg-red-50' : 'bg-blue-50'}`}>
                    {isAbove ? <TrendingUp size={16} color="#16a34a" /> : isBelow ? <TrendingDown size={16} color="#dc2626" /> : <Info size={16} color="#3b82f6" />}
                    <View className="ml-3 flex-1">
                      <Text className={`text-[10px] font-bold uppercase ${isAbove ? 'text-green-700' : isBelow ? 'text-red-700' : 'text-blue-700'}`}>
                        {isAbove ? 'Venda acima do mercado' : isBelow ? 'Venda abaixo do mercado' : 'Preço de mercado'}
                      </Text>
                      <Text className="text-gray-500 text-[10px]">
                        Mercado: R$ {marketPrice.toLocaleString('pt-BR')} | Dif: {isAbove ? '+' : isBelow ? '-' : ''}{percentDiff}%
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <View className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <Text className="text-primary/60 text-[10px] font-bold uppercase mb-1">Total da Venda (Lucro Estimado)</Text>
                <Text className="text-primary text-3xl font-bold">
                  R$ {parseFloat(harvProfit || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleAddHarvest}
                disabled={createHarvestMutation.isPending}
                className="bg-primary w-full py-4 rounded-xl items-center shadow-md mt-2"
              >
                {createHarvestMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">Confirmar Venda</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Summary Modal */}
      <Modal visible={showSummaryModal} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl h-[80%]">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-xl font-bold text-primary italic">Gastos Totais</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ano de {currentYear}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSummaryModal(false)} className="bg-gray-100 p-2 rounded-full">
                <X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Total Banner */}
            <View className="bg-red-50 p-5 rounded-2xl mb-6 flex-row justify-between items-center border border-red-100">
              <View>
                <Text className="text-red-700/60 text-[10px] font-bold uppercase mb-1">Total acumulado</Text>
                <Text className="text-red-600 text-3xl font-bold">
                  R$ {(summaryData?.grandTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <TrendingDown size={24} color="#dc2626" />
            </View>

            {/* View Toggle */}
            <View className="flex-row bg-gray-100 p-1 rounded-xl mb-6">
              <TouchableOpacity
                onPress={() => setSummaryView('month')}
                className={`flex-1 py-2.5 rounded-lg items-center ${summaryView === 'month' ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold text-xs ${summaryView === 'month' ? 'text-primary' : 'text-gray-400'}`}>Por Mês</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSummaryView('semester')}
                className={`flex-1 py-2.5 rounded-lg items-center ${summaryView === 'semester' ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`font-bold text-xs ${summaryView === 'semester' ? 'text-primary' : 'text-gray-400'}`}>Por Semestre</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(() => {
                const dataList = summaryView === 'month' ? summaryData?.byMonth : summaryData?.semesters;
                if (!dataList || dataList.length === 0) {
                  return <Text className="text-gray-400 italic text-center mt-10">Nenhum dado para exibir.</Text>;
                }

                const maxVal = Math.max(...dataList.map((i: any) => i.total), 1);

                return dataList.map((item: any, idx: number) => {
                  const progress = (item.total / maxVal) * 100;

                  return (
                    <View key={idx} className="mb-5">
                      <View className="flex-row justify-between items-end mb-2">
                        <View>
                          <Text className="text-primary font-bold text-base">{item.label}</Text>
                          {summaryView === 'semester' && <Text className="text-gray-400 text-[10px] font-bold uppercase">{item.months}</Text>}
                        </View>
                        <Text className="text-primary font-bold text-base">R$ {item.total.toLocaleString('pt-BR')}</Text>
                      </View>
                      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${Math.max(progress, 5)}%` }}
                        />
                      </View>
                      <Text className="text-gray-400 text-[10px] font-bold uppercase text-right mt-1">{item.count} gastos</Text>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Farm Switcher Modal */}
      <Modal visible={showFarmSwitcher} animationType="fade" transparent={true}>
        <View className="flex-1 justify-center bg-black/60 px-6">
          <View className="bg-white rounded-[40px] p-8 shadow-2xl max-h-[80%]">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-2xl font-bold text-primary italic">Suas Fazendas</Text>
                <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gerencie múltiplas áreas</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFarmSwitcher(false)} className="bg-gray-100 p-2.5 rounded-full">
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView className="mb-8" showsVerticalScrollIndicator={false}>
              {(farms || []).map((farm: any) => (
                <TouchableOpacity
                  key={farm.id}
                  onPress={() => {
                    setActiveFarmId(farm.id);
                    setShowFarmSwitcher(false);
                    onRefresh();
                  }}
                  className={`flex-row items-center justify-between p-6 rounded-3xl mb-4 border ${activeFarmId === farm.id
                    ? 'bg-primary border-primary'
                    : 'bg-gray-50 border-gray-100'
                    }`}
                >
                  <View className="flex-row items-center flex-1">
                    <View className={`${activeFarmId === farm.id ? 'bg-white/20' : 'bg-primary/10'} p-3 rounded-2xl mr-4`}>
                      <Sprout size={24} color={activeFarmId === farm.id ? '#fff' : '#2D5A27'} />
                    </View>
                    <Text
                      className={`text-lg font-bold flex-1 ${activeFarmId === farm.id ? 'text-white' : 'text-primary'}`}
                      numberOfLines={1}
                    >
                      {farm.name}
                    </Text>
                  </View>
                  {activeFarmId === farm.id && <Check size={24} color="#fff" strokeWidth={3} />}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => {
                  setShowFarmSwitcher(false);
                  setShowRegForm(true);
                  setFarmName('');
                }}
                className="flex-row items-center p-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50/50"
              >
                <View className="bg-gray-200 p-3 rounded-2xl mr-4">
                  <Plus size={24} color="#64748B" />
                </View>
                <Text className="text-gray-500 font-bold text-lg">Adicionar Nova Fazenda</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowFarmSwitcher(false)}
              className="bg-primary w-full py-5 rounded-2xl items-center shadow-lg"
            >
              <Text className="text-white font-black text-lg uppercase">Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Farm Registration Modal (when already has farms) */}
      <Modal visible={showRegForm && !!farms?.length} animationType="slide" transparent={true}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-2xl font-bold text-primary italic">Nova Propriedade</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Expanda sua produção</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRegForm(false)} className="bg-gray-100 p-2.5 rounded-full">
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="mb-8">
              <Text className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest px-1">Nome da Fazenda</Text>
              <TextInput
                placeholder="Ex: Fazenda Santa Maria"
                className="bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 h-16 text-lg font-bold text-primary"
                value={farmName}
                onChangeText={setFarmName}
              />
            </View>

            <TouchableOpacity
              className={`bg-primary w-full py-5 rounded-2xl flex-row items-center justify-center shadow-xl ${createFarmMutation.isPending ? 'opacity-70' : ''}`}
              onPress={handleCreateFarm}
              disabled={createFarmMutation.isPending}
            >
              {createFarmMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Plus size={22} color="#fff" className="mr-3" strokeWidth={3} />
                  <Text className="text-white font-black text-xl uppercase">Cadastrar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
