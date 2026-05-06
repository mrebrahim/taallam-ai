import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'
import { Analytics } from '@/lib/analytics'

export default function LoginScreen() {
  const { isAr } = useLang()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        isAr ? 'تنبيه' : 'Alert',
        isAr ? 'ادخل الإيميل وكلمة المرور' : 'Enter email and password'
      )
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (error) {
      Alert.alert(
        isAr ? 'خطأ' : 'Error',
        isAr ? 'الإيميل أو كلمة المرور غلط' : 'Wrong email or password'
      )
    } else {
      Analytics.login('email')
      Analytics.identify(email.trim().toLowerCase())
      router.replace('/(tabs)/home')
    }
  }

  const handleGoogle = async () => {
    try {
      const redirectUrl = 'taallam://auth/callback'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })
      if (error) { Alert.alert('Error', error.message); return }
      
      const { WebBrowser } = await import('expo-web-browser')
      const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectUrl)
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url)
        const accessToken = url.searchParams.get('access_token')
        const refreshToken = url.searchParams.get('refresh_token')
        
        if (accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          if (!sessionError) router.replace('/(tabs)/home')
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
  }

  return (
    <View style={s.container}>
      {/* Logo */}
      <View style={s.logo}>
        <Image source={require('@/assets/logo.png')} style={s.logoImg} />
        <Text style={s.logoSub}>
          {isAr ? 'ابدأ رحلة التعلم اليومية' : 'Start your daily learning journey'}
        </Text>
      </View>

      {/* Google */}
      <TouchableOpacity style={s.googleBtn} onPress={handleGoogle}>
        <Text style={s.googleG}>G</Text>
        <Text style={s.googleText}>
          {isAr ? 'الدخول بـ Google' : 'Continue with Google'}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.divTxt}>{isAr ? 'أو' : 'or'}</Text>
        <View style={s.line} />
      </View>

      {/* Fields */}
      <TextInput
        style={s.input}
        placeholder={isAr ? 'البريد الإلكتروني' : 'Email address'}
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textAlign={isAr ? 'right' : 'left'}
        textContentType="emailAddress"
      />
      <TextInput
        style={s.input}
        placeholder={isAr ? 'كلمة المرور' : 'Password'}
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textAlign={isAr ? 'right' : 'left'}
        textContentType="oneTimeCode"
        autoComplete="off"
      />

      {/* Login Button */}
      <TouchableOpacity
        style={[s.btn, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnTxt}>{isAr ? 'تسجيل الدخول' : 'Login'}</Text>}
      </TouchableOpacity>

      {/* Signup */}
      <View style={s.footer}>
        <Text style={s.footerTxt}>
          {isAr ? 'مالكش حساب؟ ' : "Don't have an account? "}
        </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
          <Text style={s.footerLink}>{isAr ? 'سجل دلوقتي' : 'Sign up'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 28, justifyContent: 'center' },
  logo: { alignItems: 'center', marginBottom: 40 },
  logoImg: { width: 120, height: 120, borderRadius: 24, marginBottom: 12 },
  logoSub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3,
  },
  googleG: { fontSize: 20, fontWeight: '900', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '700', color: '#333' },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  divTxt: { color: '#475569', fontSize: 13 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16,
    fontSize: 15, color: '#fff', borderWidth: 2, borderColor: '#334155', marginBottom: 12,
  },
  btn: {
    backgroundColor: Colors.blue, borderRadius: 14, padding: 18,
    alignItems: 'center', marginTop: 4, marginBottom: 18,
    shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  btnTxt: { fontSize: 17, fontWeight: '900', color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerTxt: { color: '#64748b', fontSize: 14 },
  footerLink: { color: Colors.blue, fontSize: 14, fontWeight: '800' },
})
