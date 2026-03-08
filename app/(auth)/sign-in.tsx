import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Sprout, Mail, Lock } from 'lucide-react-native';

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignInResult = async (result: any) => {
    if (!isLoaded || !signIn || !setActive) return;

    if (result.status === 'complete') {
      console.log('Sign in complete, setting session');
      await setActive({ session: result.createdSessionId });
      router.replace('/(tabs)');
      return;
    }

    if (result.status === 'needs_first_factor' || result.status === 'needs_second_factor' || result.status === 'needs_client_trust') {
      console.log('Action needed for status:', result.status);

      const firstFactor = result.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code');
      const secondFactor = result.supportedSecondFactors?.find((f: any) => f.strategy === 'email_code');

      // If we need email code verification
      if (result.status === 'needs_client_trust' || firstFactor || secondFactor) {

        // Prepare verification if needed
        if (result.status === 'needs_client_trust' || result.firstFactorVerification.status === 'unverified') {
          try {
            const factor = firstFactor || result.supportedFirstFactors?.[0];
            await signIn.prepareFirstFactor({
              strategy: 'email_code',
              ...(factor?.emailAddressId ? { emailAddressId: factor.emailAddressId } : {})
            } as any);
          } catch (e) {
            console.log('Prepare first factor failed or not needed:', e);
          }
        } else if (result.status === 'needs_second_factor') {
          try {
            await signIn.prepareSecondFactor({
              strategy: 'email_code'
            });
          } catch (e) {
            console.log('Prepare second factor failed or not needed:', e);
          }
        }

        setPendingVerification(true);
      } else {
        setError('Login requer um passo não suportado nesta interface: ' + result.status);
      }
    } else {
      console.warn('Unhandled sign in status:', result.status);
      setError('Login incompleto. Status: ' + result.status);
    }
  };

  const handleError = (err: any) => {
    const clerkError = err.errors?.[0]?.message;
    if (clerkError === 'Identifier is invalid') {
      setError('E-mail inválido ou não cadastrado.');
    } else if (clerkError?.includes('password')) {
      setError('Senha incorreta.');
    } else if (clerkError?.includes('code')) {
      setError('Código de verificação incorreto.');
    } else {
      setError(clerkError || 'Erro ao fazer login. Verifique sua conexão.');
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError('');
    try {
      console.log('Attempting sign in for:', email);
      const result = await signIn.create({ identifier: email, password });
      console.log('Sign in result status:', result.status);

      await handleSignInResult(result);
    } catch (err: any) {
      console.error('Sign in error details:', JSON.stringify(err, null, 2));
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError('');
    try {
      console.log('Attempting to verify code:', code);
      // Attempt verification for either first or second factor
      const result = await (signIn.firstFactorVerification.status === 'unverified'
        ? signIn.attemptFirstFactor({ strategy: 'email_code', code })
        : signIn.attemptSecondFactor({ strategy: 'email_code', code }));

      console.log('Verification result status:', result.status);
      await handleSignInResult(result);
    } catch (err: any) {
      console.error('Verification error details:', JSON.stringify(err, null, 2));
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="flex-1 justify-center px-6 py-10">
            {/* Logo */}
            <View className="items-center mb-10">
              <View className="bg-primary w-20 h-20 rounded-3xl items-center justify-center mb-4 shadow-lg">
                <Sprout size={40} color="#FFD700" />
              </View>
              <Text className="text-primary text-3xl font-bold">Finance Farm</Text>
              <Text className="text-secondary text-sm mt-1">Gestão inteligente do campo</Text>
            </View>

            {/* Form */}
            <View className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <Text className="text-primary text-2xl font-bold mb-6">
                {pendingVerification ? 'Verificação' : 'Entrar'}
              </Text>

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                  <Text className="text-red-600 text-sm font-bold">{error}</Text>
                </View>
              ) : null}

              {!pendingVerification ? (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">E-mail</Text>
                    <View className="flex-row items-center border border-gray-100 rounded-2xl px-4 bg-gray-50/50">
                      <Mail size={20} color="#2D5A27" />
                      <TextInput
                        className="flex-1 h-14 ml-3 text-gray-800 font-bold"
                        placeholder="seu@email.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View className="mb-8">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 ml-1">Senha</Text>
                    <View className="flex-row items-center border border-gray-100 rounded-2xl px-4 bg-gray-50/50">
                      <Lock size={20} color="#2D5A27" />
                      <TextInput
                        className="flex-1 h-14 ml-3 text-gray-800 font-bold"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSignIn}
                    disabled={loading}
                    className="bg-primary rounded-2xl py-5 items-center shadow-lg shadow-primary/20"
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text className="text-white font-black text-lg uppercase">Entrar</Text>
                    }
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-gray-500 text-base mb-6 leading-relaxed">
                    Para sua segurança, enviamos um código de verificação para seu e-mail. Por favor, insira-o abaixo.
                  </Text>

                  <View className="mb-8">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3 text-center">Código de 6 dígitos</Text>
                    <TextInput
                      className="bg-gray-50 border-2 border-primary/10 rounded-2xl h-20 text-center text-4xl font-black tracking-[10px] text-primary"
                      placeholder="000000"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="numeric"
                      maxLength={6}
                      autoFocus
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleVerifyCode}
                    disabled={loading}
                    className="bg-primary rounded-2xl py-5 items-center shadow-lg shadow-primary/20"
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text className="text-white font-black text-lg uppercase">Verificar e Entrar</Text>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setPendingVerification(false)}
                    className="mt-6 py-2 items-center"
                  >
                    <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Voltar para login</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!pendingVerification && (
              <View className="flex-row justify-center mt-8">
                <Text className="text-secondary font-medium">Não tem conta? </Text>
                <Link href="/(auth)/sign-up">
                  <Text className="text-primary font-black uppercase text-sm">Cadastre-se</Text>
                </Link>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
