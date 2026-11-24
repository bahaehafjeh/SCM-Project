import { Mail } from 'lucide-react'
import { AuthCard, AuthField, PasswordField } from './AuthCard'

export function LoginPage() {
  return (
    <AuthCard
      title="ورود به حساب"
      description="ایمیل و رمز عبور خود را وارد کنید."
      submitLabel="ورود"
      switchPrompt="حساب کاربری ندارید؟"
      switchLabel="ثبت‌نام"
      switchTo="/register"
    >
      <AuthField label="ایمیل" icon={Mail} name="email" type="email" autoComplete="email" placeholder="example@domain.com" />
      <PasswordField label="رمز عبور" name="password" autoComplete="current-password" placeholder="رمز عبور خود را وارد کنید" />
    </AuthCard>
  )
}
