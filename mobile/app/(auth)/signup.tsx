import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function SignupScreen() {
  const { isAr } = useLang()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'ادخل كل البيانات' : 'Fill all fields')
      return
    }
    if (password.length < 6) {
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName } }
    })
    setLoading(false)
    if (error) {
      Alert.alert(isAr ? 'خطأ' : 'Error', error.message)
    } else if (data.session) {
      // Session exists = email confirmation disabled, go directly to app
      router.replace('/(tabs)/home')
    } else {
      // Email confirmation required
      Alert.alert(
        isAr ? '✅ تم إنشاء الحساب' : '✅ Account Created',
        isAr ? 'تحقق من إيميلك لتأكيد الحساب ثم سجل دخول' : 'Check your email to confirm your account',
        [{ text: isAr ? 'حسناً' : 'OK', onPress: () => router.replace('/(auth)/login') }]
      )
    }
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{isAr ? 'إنشاء حساب جديد' : 'Create Account'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <TextInput style={s.input} placeholder={isAr ? 'الاسم الكامل' : 'Full Name'}
        placeholderTextColor="#64748b" value={fullName} onChangeText={setFullName}
        textAlign={isAr ? 'right' : 'left'} />
      <TextInput style={s.input} placeholder={isAr ? 'البريد الإلكتروني' : 'Email'}
        placeholderTextColor="#64748b" value={email} onChangeText={setEmail}
        keyboardType="email-address" autoCapitalize="none" textAlign={isAr ? 'right' : 'left'} />
      <TextInput style={s.input} placeholder={isAr ? 'كلمة المرور (6+ أحرف)' : 'Password (6+ chars)'}
        placeholderTextColor="#64748b" value={password} onChangeText={setPassword}
        secureTextEntry textAlign={isAr ? 'right' : 'left'} />

      <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>{isAr ? 'إنشاء الحساب' : 'Create Account'}</Text>}
      </TouchableOpacity>

      <View style={s.footer}>
        <Text style={s.footerText}>{isAr ? 'عندك حساب؟ ' : 'Have an account? '}</Text>
        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={s.footerLink}>{isAr ? 'سجل دخول' : 'Login'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 32 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '900', color: '#fff' },
  input: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, fontSize: 15, color: '#fff', borderWidth: 2, borderColor: '#334155', marginBottom: 12 },
  btn: { backgroundColor: Colors.green, borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 8, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  btnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: Colors.blue, fontSize: 14, fontWeight: '700' },
})
