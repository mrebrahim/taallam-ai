import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'

export default function SignupScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName || !email || !password) { Alert.alert('خطأ', 'أكمل جميع البيانات'); return }
    if (password.length < 6) { Alert.alert('خطأ', 'كلمة المرور 6 أحرف على الأقل'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    setLoading(false)
    if (error) Alert.alert('خطأ', error.message)
    else Alert.alert('تم!', 'تحقق من بريدك لتأكيد الحساب', [{ text: 'حسناً', onPress: () => router.back() }])
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.title}>إنشاء حساب جديد 🚀</Text>
        <View style={styles.form}>
          {[
            { label: 'الاسم الكامل', value: fullName, set: setFullName, type: 'default' as const },
            { label: 'البريد الإلكتروني', value: email, set: setEmail, type: 'email-address' as const },
            { label: 'كلمة المرور', value: password, set: setPassword, type: 'default' as const, secure: true },
          ].map((f, i) => (
            <View key={i}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput style={styles.input} value={f.value} onChangeText={f.set}
                keyboardType={f.type} secureTextEntry={f.secure} autoCapitalize="none" textAlign="right"
                placeholder={f.label} placeholderTextColor={Colors.textMuted} />
            </View>
          ))}
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }]} onPress={handleSignup} disabled={loading}>
            <Text style={styles.btnText}>{loading ? 'جاري...' : 'إنشاء الحساب'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: Colors.blue, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text, marginBottom: 32, textAlign: 'right' },
  form: { gap: 16 },
  label: { fontSize: 13, color: Colors.textSub, marginBottom: 6, textAlign: 'right', fontWeight: '600' },
  input: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 2, borderColor: Colors.border },
  btn: { backgroundColor: Colors.green, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8, shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
})
