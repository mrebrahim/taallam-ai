import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { getLang } from '@/lib/i18n'

export default function LoginScreen() {
  const lang = getLang()
  const isAr = lang === 'ar'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'ادخل الإيميل وكلمة المرور' : 'Enter email and password')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'الإيميل أو كلمة المرور غلط' : 'Invalid email or password')
    } else {
      router.replace('/(tabs)/home')
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'taallam://auth/callback',
        skipBrowserRedirect: false,
      },
    })
    setGoogleLoading(false)
    if (error) Alert.alert('Error', error.message)
  }

  return (
    <View style={s.container}>
      {/* Logo */}
      <View style={s.logo}>
        <Text style={s.logoEmoji}>🤖</Text>
        <Text style={s.logoText}>Taallam AI</Text>
        <Text style={s.logoSub}>
          {isAr ? 'ابدأ رحلة التعلم اليومية' : 'Start your daily learning journey'}
        </Text>
      </View>

      {/* Google Button */}
      <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} disabled={googleLoading}>
        <Text style={s.googleIcon}>G</Text>
        <Text style={s.googleText}>
          {googleLoading
            ? (isAr ? 'جاري...' : 'Loading...')
            : (isAr ? 'الدخول بـ Google' : 'Continue with Google')}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={s.divider}>
        <View style={s.dividerLine} />
        <Text style={s.dividerText}>{isAr ? 'أو' : 'or'}</Text>
        <View style={s.dividerLine} />
      </View>

      {/* Email + Password */}
      <TextInput
        style={s.input}
        placeholder={isAr ? 'البريد الإلكتروني' : 'Email'}
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textAlign={isAr ? 'right' : 'left'}
      />
      <TextInput
        style={s.input}
        placeholder={isAr ? 'كلمة المرور' : 'Password'}
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textAlign={isAr ? 'right' : 'left'}
      />

      {/* Login Button */}
      <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>{isAr ? 'تسجيل الدخول' : 'Login'}</Text>}
      </TouchableOpacity>

      {/* Signup Link */}
      <View style={s.footer}>
        <Text style={s.footerText}>{isAr ? 'مالكش حساب؟ ' : "Don't have an account? "}</Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={s.footerLink}>{isAr ? 'سجل دلوقتي' : 'Sign up'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  logo: { alignItems: 'center', marginBottom: 36 },
  logoEmoji: { fontSize: 56, marginBottom: 10 },
  logoText: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 6 },
  logoSub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16 },
  googleIcon: { fontSize: 20, fontWeight: '900', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '700', color: '#333' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#334155' },
  dividerText: { color: '#64748b', fontSize: 13 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, fontSize: 15, color: '#fff', borderWidth: 2, borderColor: '#334155', marginBottom: 12 },
  btn: { backgroundColor: Colors.blue, borderRadius: 14, padding: 17, alignItems: 'center', marginBottom: 16, shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  btnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: Colors.blue, fontSize: 14, fontWeight: '700' },
})
