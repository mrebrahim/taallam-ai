import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Image
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { StatusBar } from 'expo-status-bar'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('خطأ', 'أدخل البريد الإلكتروني وكلمة المرور'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('خطأ', 'البريد الإلكتروني أو كلمة المرور غلط')
    else router.replace('/(tabs)/home')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🦉</Text>
          <Text style={styles.logoTitle}>Taallam AI</Text>
          <Text style={styles.logoSub}>ابدأ رحلة التعلم اليومية</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="البريد الإلكتروني"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign="right"
          />
          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textAlign="right"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{loading ? 'جاري...' : 'تسجيل الدخول'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign up link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>مالكش حساب؟ </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.footerLink}>سجل دلوقتي</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoEmoji: { fontSize: 72, marginBottom: 12 },
  logoTitle: { fontSize: 28, fontWeight: '900', color: Colors.green, marginBottom: 6 },
  logoSub: { fontSize: 16, color: Colors.textSub },
  form: { gap: 12, marginBottom: 24 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 2,
    borderColor: Colors.border,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  btn: {
    backgroundColor: Colors.green,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: { backgroundColor: Colors.textMuted },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: Colors.textSub, fontSize: 14 },
  footerLink: { color: Colors.blue, fontSize: 14, fontWeight: '700' },
})
