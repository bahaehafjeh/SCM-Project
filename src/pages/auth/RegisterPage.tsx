import { Mail } from 'lucide-react'
import { AuthCard, AuthField, PasswordField } from './AuthCard'

export function RegisterPage() {
  return (
    <AuthCard
      title="ایجاد حساب کاربری"
      description="اطلاعات زیر را برای ساخت حساب وارد کنید."
      submitLabel="ثبت‌نام"
      switchPrompt="حساب کاربری دارید؟"
      switchLabel="ورود"
      switchTo="/login"
    >
      <div className="auth-form__row">
        <AuthField label="نام" name="firstName" autoComplete="given-name" placeholder="نام" />
        <AuthField label="نام خانوادگی" name="lastName" autoComplete="family-name" placeholder="نام خانوادگی" />
      </div>
      <AuthField label="ایمیل" icon={Mail} name="email" type="email" autoComplete="email" placeholder="example@domain.com" />
      <PasswordField label="رمز عبور" name="password" autoComplete="new-password" minLength={8} placeholder="حداقل ۸ کاراکتر" />
    </AuthCard>
  )
}
