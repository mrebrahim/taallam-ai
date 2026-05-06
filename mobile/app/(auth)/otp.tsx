import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { useLang } from '@/lib/LanguageContext'

export default function OTPScreen() {
  const { isAr } = useLang()
  const { email, password } = useLocalSearchParams<{ email: string; password: string }>()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const inputs = useRef<any[]>([])

  const handleChange = (val: string, idx: number) => {
    // Handle paste - if more than 1 char, fill all boxes
    const digits = val.replace(/[^0-9]/g, '')
    if (digits.length > 1) {
      const newOtp = ['', '', '', '', '', '']
      for (let i = 0; i < 6 && i < digits.length; i++) {
        newOtp[i] = digits[i]
      }
      setOtp(newOtp)
      inputs.current[Math.min(digits.length, 5)]?.focus()
      return
    }
    // Single digit
    const newOtp = [...otp]
    newOtp[idx] = digits
    setOtp(newOtp)
    if (digits && idx < 5) inputs.current[idx + 1]?.focus()
    if (!digits && idx > 0) inputs.current[idx - 1]?.focus()
  }

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const newOtp = [...otp]
      newOtp[idx - 1] = ''
      setOtp(newOtp)
      inputs.current[idx - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) {
      Alert.alert(isAr ? 'تنبيه' : 'Alert', isAr ? 'ادخل الكود كامل' : 'Enter the full code')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email: email!,
      token: code,
      type: 'email',
    })
    if (error) {
      setLoading(false)
      Alert.alert(isAr ? 'خطأ' : 'Error', isAr ? 'كود غلط أو منتهي' : 'Wrong or expired code')
      return
    }
    // Auto login after verification
    if (password) {
      await supabase.auth.signInWithPassword({ email: email!, password })
    }
    setLoading(false)
    router.replace('/(tabs)/home')
  }

  const handleResend = async () => {
    setResending(true)
    const { error } = await supabase.auth.resend({ 
      type: 'signup', 
      email: email!,
      options: { emailRedirectTo: undefined }
    })
    setResending(false)
    if (error) {
      Alert.alert(isAr ? 'خطأ' : 'Error', error.message)
    } else {
      Alert.alert(isAr ? '✅ تم' : '✅ Sent', isAr ? 'تم إرسال كود جديد على إيميلك' : 'New code sent to your email')
    }
  }

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backTxt}>←</Text>
      </TouchableOpacity>

      <View style={s.content}>
        <Text style={s.icon}>📧</Text>
        <Text style={s.title}>{isAr ? 'تأكيد البريد الإلكتروني' : 'Verify Email'}</Text>
        <Text style={s.sub}>
          {isAr ? 'تم إرسال كود مكون من 6 أرقام إلى' : 'We sent a 6-digit code to'}
        </Text>
        <Text style={s.email}>{email}</Text>

        {/* OTP inputs */}
        <View style={s.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => inputs.current[idx] = r}
              style={[s.otpInput, digit ? s.otpInputFilled : {}]}
              value={digit}
              onChangeText={val => handleChange(val, idx)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnTxt}>{isAr ? 'تأكيد' : 'Verify'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={s.resendBtn}>
          <Text style={s.resendTxt}>
            {resending
              ? (isAr ? 'جاري الإرسال...' : 'Sending...')
              : (isAr ? 'إعادة إرسال الكود' : 'Resend code')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  backBtn:       { marginTop: 40, width: 40, height: 40, justifyContent: 'center' },
  backTxt:       { fontSize: 22, color: Colors.blue, fontWeight: '700' },
  content:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  icon:          { fontSize: 56, marginBottom: 20 },
  title:         { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 12, textAlign: 'center' },
  sub:           { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 6 },
  email:         { fontSize: 15, fontWeight: '700', color: Colors.blue, marginBottom: 32 },
  otpRow:        { flexDirection: 'row', gap: 10, marginBottom: 32, direction: 'ltr' },
  otpInput:      { width: 48, height: 56, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 2, borderColor: '#334155', color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  otpInputFilled: { borderColor: Colors.green },
  btn:           { backgroundColor: Colors.green, borderRadius: 14, padding: 18, alignItems: 'center', width: '100%', marginBottom: 16 },
  btnTxt:        { fontSize: 17, fontWeight: '900', color: '#fff' },
  resendBtn:     { padding: 10 },
  resendTxt:     { color: Colors.blue, fontSize: 14, fontWeight: '700' },
})
