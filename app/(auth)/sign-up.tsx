import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignUp } from '@clerk/clerk-expo';
import { Link, useRouter } from 'expo-router';
import { Sprout, Mail, Lock, User } from 'lucide-react-native';

export default function SignUp() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerify, setPendingVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      console.log('Starting sign up for:', email);
      await signUp.create({ emailAddress: email, password, firstName: name });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerify(true);
      console.log('Verification email sent');
    } catch (err: any) {
      console.error('Sign up error:', JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    setError('');
    try {
      console.log('Attempting verification code:', code);
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === 'complete') {
        console.log('Verification complete, setting session');
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.warn('Verification incomplete status:', result.status);
        setError('Verificação incompleta. Status: ' + result.status);
      }
    } catch (err: any) {
      console.error('Verification error:', JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Código inválido');
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
          <View className="flex-1 justify-center px-6">
            <View className="items-center mb-10">
              <View className="bg-primary w-20 h-20 rounded-3xl items-center justify-center mb-4 shadow-lg">
                <Sprout size={40} color="#FFD700" />
              </View>
              <Text className="text-primary text-3xl font-bold">Finance Farm</Text>
              <Text className="text-secondary text-sm mt-1">Gestão inteligente do campo</Text>
            </View>

            <View className="bg-white rounded-2xl p-6 shadow-sm">
              <Text className="text-primary text-xl font-bold mb-6">
                {pendingVerify ? 'Verificar E-mail' : 'Criar Conta'}
              </Text>

              {error ? (
                <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <Text className="text-red-600 text-sm">{error}</Text>
                </View>
              ) : null}

              {!pendingVerify ? (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-2">Nome</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50">
                      <User size={18} color="#2D5A27" />
                      <TextInput
                        className="flex-1 h-12 ml-2 text-gray-800"
                        placeholder="Seu nome"
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-2">E-mail</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50">
                      <Mail size={18} color="#2D5A27" />
                      <TextInput
                        className="flex-1 h-12 ml-2 text-gray-800"
                        placeholder="seu@email.com"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View className="mb-6">
                    <Text className="text-gray-500 text-sm mb-2">Senha</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 bg-gray-50">
                      <Lock size={18} color="#2D5A27" />
                      <TextInput
                        className="flex-1 h-12 ml-2 text-gray-800"
                        placeholder="Mín. 8 caracteres"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleSignUp}
                    disabled={loading}
                    className="bg-primary rounded-xl py-4 items-center"
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text className="text-white font-bold text-lg">Criar Conta</Text>
                    }
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="text-gray-500 text-sm mb-4">
                    Enviamos um código de 6 dígitos para {email}
                  </Text>
                  <View className="mb-6">
                    <Text className="text-gray-500 text-sm mb-2">Código de verificação</Text>
                    <TextInput
                      className="border border-gray-200 rounded-xl px-4 h-14 text-center text-2xl tracking-widest bg-gray-50 text-gray-800"
                      placeholder="000000"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleVerify}
                    disabled={loading}
                    className="bg-primary rounded-xl py-4 items-center"
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text className="text-white font-bold text-lg">Verificar</Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!pendingVerify && (
              <View className="flex-row justify-center mt-6">
                <Text className="text-gray-500">Já tem conta? </Text>
                <Link href="/(auth)/sign-in">
                  <Text className="text-primary font-bold">Entrar</Text>
                </Link>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
