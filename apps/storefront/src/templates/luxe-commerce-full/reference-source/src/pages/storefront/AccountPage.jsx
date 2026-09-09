import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Box,
  ChevronLeft,
  Clock,
  Eye,
  EyeOff,
  Glasses,
  Heart,
  Headphones,
  Home,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  PenLine,
  Phone,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  User,
  UserCog,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { getCartItemCount } from '@/lib/storefrontCart.js';
import { getFavoriteCount } from '@/lib/storefrontFavorites.js';
import { getCustomerProfileImage } from '@/lib/customerProfileImage.js';
import './AccountPage.css';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User, active: true },
];

const signedInSections = [
  { label: 'طلباتي', description: 'تابع جميع طلباتك وحالتها', icon: Box, href: '/orders' },
  { label: 'سلة التسوق', description: 'مراجعة المنتجات قبل إتمام الشراء', icon: ShoppingCart, href: '/cart' },
  { label: 'المفضلة', description: 'منتجاتك المفضلة في مكان واحد', icon: Heart, href: '/favorites' },
  { label: 'إعدادات الحساب', description: 'تحديث بياناتك وعنوانك وكلمة المرور', icon: UserCog, href: '/account/settings' },
  { label: 'الدعم والمساعدة', description: 'نحن هنا لمساعدتك في أي وقت', icon: Headphones, href: '/store#contact', variant: 'support' },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'ع';
}

function validateSignUp(values) {
  const errors = {};

  if (!values.fullName.trim()) {
    errors.fullName = 'الاسم الكامل مطلوب.';
  }

  if (!values.phone.trim()) {
    errors.phone = 'رقم الهاتف مطلوب.';
  }

  if (!values.password) {
    errors.password = 'كلمة المرور مطلوبة.';
  } else if (values.password.length < 6) {
    errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'تأكيد كلمة المرور غير مطابق.';
  }

  return errors;
}

function validateSignIn(values) {
  const errors = {};

  if (!values.phone.trim()) {
    errors.phone = 'رقم الهاتف مطلوب.';
  }

  if (!values.password) {
    errors.password = 'كلمة المرور مطلوبة.';
  }

  return errors;
}

function validateResetPhone(values) {
  const errors = {};

  if (!values.phone.trim()) {
    errors.phone = 'رقم الهاتف مطلوب.';
  }

  return errors;
}

function validateResetPassword(values) {
  const errors = {};

  if (!values.password) {
    errors.password = 'كلمة المرور الجديدة مطلوبة.';
  } else if (values.password.length < 6) {
    errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  }

  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'تأكيد كلمة المرور غير مطابق.';
  }

  return errors;
}

export default function AccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    customerSession,
    currentCustomer,
    confirmPasswordReset,
    isCustomerAuthenticated,
    isCustomerLoading,
    requestPasswordResetOtp,
    requestSignUpOtp,
    signInCustomer,
    signOutCustomer,
    verifyPasswordResetOtp,
    verifySignUpOtp,
  } = useCustomerAuth();
  const [mode, setMode] = useState('signIn');
  const [signUpStep, setSignUpStep] = useState('form');
  const [passwordResetStep, setPasswordResetStep] = useState('phone');
  const [passwordResetToken, setPasswordResetToken] = useState('');
  const [values, setValues] = useState({
    fullName: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState(location.state?.authMessage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [orderCount, setOrderCount] = useState(null);
  const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    setProfileImage(getCustomerProfileImage(currentCustomer?.id));
  }, [currentCustomer?.id]);

  useEffect(() => {
    if (location.state?.authMessage) {
      setNotice(location.state.authMessage);
    }
  }, [location.state]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrderCount() {
      if (!isCustomerAuthenticated || !customerSession?.accessToken) {
        setOrderCount(null);
        return;
      }

      try {
        const response = await apiServerClient.fetch('/customer/orders', {
          headers: {
            Authorization: `Bearer ${customerSession.accessToken}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load customer order count');
        }

        const payload = await response.json();
        if (!controller.signal.aborted) {
          setOrderCount(Number(payload.count ?? payload.items?.length ?? 0));
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrderCount(Number(currentCustomer?.totalOrders || 0));
        }
      }
    }

    loadOrderCount();

    return () => controller.abort();
  }, [currentCustomer?.totalOrders, customerSession?.accessToken, isCustomerAuthenticated]);

  const profileStats = useMemo(() => ([
    { label: 'المفضلة', value: getFavoriteCount(), icon: Heart },
    { label: 'السلة', value: getCartItemCount(), icon: ShoppingBag },
    { label: 'الطلبات', value: orderCount ?? currentCustomer?.totalOrders ?? 0, icon: Box },
  ]), [currentCustomer?.totalOrders, orderCount]);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setSignUpStep('form');
    setPasswordResetStep('phone');
    setPasswordResetToken('');
    setOtpCode('');
    setErrors({});
    setSubmitError('');
    setNotice('');
  }

  function startPasswordReset() {
    setMode('passwordReset');
    setSignUpStep('form');
    setPasswordResetStep('phone');
    setPasswordResetToken('');
    setOtpCode('');
    setValues((current) => ({
      ...current,
      password: '',
      confirmPassword: '',
    }));
    setErrors({});
    setSubmitError('');
    setNotice('');
  }

  function updateOtpCode(event) {
    setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6));
    setErrors((current) => ({ ...current, otpCode: '' }));
    setSubmitError('');
  }

  async function requestOtpCode() {
    const validationErrors = validateSignUp(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return false;

    try {
      await requestSignUpOtp(values);
    } catch (error) {
      if (error.status === 409) {
        setMode('signIn');
        setSignUpStep('form');
        setPasswordResetStep('phone');
        setPasswordResetToken('');
        setOtpCode('');
        setValues((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
        }));
        setNotice(error.message || 'يوجد حساب مسجل بهذا الرقم. سجل الدخول باستخدام رقمك.');
      }

      throw error;
    }

    setSignUpStep('otp');
    setOtpCode('');
    setNotice('تم إرسال رمز التحقق إلى رقمك عبر واتساب. أدخل الرمز لإكمال إنشاء الحساب.');
    return true;
  }

  async function requestPasswordResetCode() {
    const validationErrors = validateResetPhone(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return false;

    await requestPasswordResetOtp({ phone: values.phone });
    setPasswordResetStep('otp');
    setPasswordResetToken('');
    setOtpCode('');
    setNotice('تم إرسال رمز التحقق إلى رقمك عبر واتساب. أدخل الرمز لتعيين كلمة مرور جديدة.');
    return true;
  }

  async function handleResendOtp() {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      if (mode === 'passwordReset') {
        await requestPasswordResetCode();
      } else {
        await requestOtpCode();
      }
      toast.success('تم إرسال رمز تحقق جديد.');
    } catch (error) {
      if (mode === 'signUp' && error.status === 409) {
        setSubmitError('');
        return;
      }

      setSubmitError(error.message || 'تعذر إرسال رمز التحقق. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError('');
    setNotice('');
    const redirectTo = location.state?.redirectTo || '/account';

    let validationErrors = {};
    if (mode === 'signUp') {
      validationErrors = signUpStep === 'otp'
        ? (otpCode.length === 6 ? {} : { otpCode: 'رمز التحقق يجب أن يتكون من 6 أرقام.' })
        : validateSignUp(values);
    } else if (mode === 'passwordReset') {
      if (passwordResetStep === 'phone') {
        validationErrors = validateResetPhone(values);
      } else if (passwordResetStep === 'otp') {
        validationErrors = otpCode.length === 6 ? {} : { otpCode: 'رمز التحقق يجب أن يتكون من 6 أرقام.' };
      } else {
        validationErrors = validateResetPassword(values);
      }
    } else {
      validationErrors = validateSignIn(values);
    }
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      setIsSubmitting(true);

      if (mode === 'signUp') {
        if (signUpStep !== 'otp') {
          await requestOtpCode();
          return;
        }

        await verifySignUpOtp({ ...values, code: otpCode });
        setMode('signIn');
        setSignUpStep('form');
        setPasswordResetStep('phone');
        setPasswordResetToken('');
        setOtpCode('');
        setValues((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
        }));
        setNotice('تم إنشاء الحساب بنجاح. سجل الدخول الآن باستخدام رقمك وكلمة المرور.');
        toast.success('تم إنشاء الحساب بنجاح.');
        return;
      } else if (mode === 'passwordReset') {
        if (passwordResetStep === 'phone') {
          await requestPasswordResetCode();
          return;
        }

        if (passwordResetStep === 'otp') {
          const payload = await verifyPasswordResetOtp({ phone: values.phone, code: otpCode });
          setPasswordResetToken(payload.resetToken || '');
          setPasswordResetStep('password');
          setOtpCode('');
          setValues((current) => ({
            ...current,
            password: '',
            confirmPassword: '',
          }));
          setNotice('تم تأكيد رقم الهاتف. اختر كلمة مرور جديدة لحسابك.');
          return;
        }

        await confirmPasswordReset({
          phone: values.phone,
          resetToken: passwordResetToken,
          password: values.password,
        });
        setMode('signIn');
        setPasswordResetStep('phone');
        setPasswordResetToken('');
        setOtpCode('');
        setValues((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
        }));
        setNotice('تم حفظ كلمة المرور الجديدة. سجل الدخول الآن باستخدامها.');
        toast.success('تم حفظ كلمة المرور الجديدة.');
        return;
      } else {
        await signInCustomer(values);
        toast.success('تم تسجيل الدخول بنجاح.');
      }

      navigate(redirectTo, { replace: true, state: null });
    } catch (error) {
      if (mode === 'signUp' && error.status === 409) {
        setSubmitError('');
        return;
      }

      if (mode === 'signUp' && signUpStep === 'otp' && error.status === 429) {
        setSignUpStep('form');
        setOtpCode('');
      }

      if (mode === 'passwordReset' && passwordResetStep === 'otp' && error.status === 429) {
        setPasswordResetStep('phone');
        setPasswordResetToken('');
        setOtpCode('');
      }

      setSubmitError(error.message || 'تعذر إكمال العملية. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOutCustomer();
    toast.success('تم تسجيل الخروج.');
    navigate('/account', { replace: true, state: null });
  }

  const submitLabel = (() => {
    if (mode === 'signUp') {
      return signUpStep === 'otp' ? 'تأكيد وإنشاء الحساب' : 'إرسال رمز التحقق';
    }

    if (mode === 'passwordReset') {
      if (passwordResetStep === 'phone') return 'إرسال رمز التحقق';
      if (passwordResetStep === 'otp') return 'تأكيد الرمز';
      return 'حفظ كلمة المرور الجديدة';
    }

    return 'تسجيل الدخول';
  })();

  if (isCustomerLoading) {
    return (
      <main className="account-page" dir="rtl">
        <div className="account-page__shell account-page__shell--loading">
          <Loader2 className="account-page__spinner" aria-hidden="true" />
          <span>جاري تحميل الحساب</span>
        </div>
      </main>
    );
  }

  return (
    <main className={`account-page ${isCustomerAuthenticated ? 'account-page--signed' : 'account-page--guest'}`} dir="rtl">
      <div className="account-page__shell">
        <section className={`account-page__intro${isCustomerAuthenticated ? ' account-page__intro--signed' : ' account-page__intro--guest'}`} aria-labelledby="account-page-title">
          {isCustomerAuthenticated ? (
            <>
              <h1 className="account-page__sr-only" id="account-page-title">حسابي</h1>
              <p className="account-page__sr-only">بياناتك، طلباتك، سلتك، ومفضلتك في مكان واحد.</p>
            </>
          ) : (
            <>
              <h1 id="account-page-title">ادخل إلى حسابك</h1>
              <span className="account-page__ornament" aria-hidden="true" />
              <p>سجل الدخول أو أنشئ حساباً برقم الهاتف لحفظ مشترياتك ومفضلتك.</p>
            </>
          )}
        </section>

        {isCustomerAuthenticated ? (
          <section className="account-page__content" aria-label="محتوى الحساب">
            <section className="account-page__profile-card" aria-labelledby="account-profile-title">
              <div className="account-page__avatar">
                {profileImage ? (
                  <img src={profileImage} alt="صورة الحساب" />
                ) : (
                  <span aria-hidden="true">{getInitials(currentCustomer?.fullName)}</span>
                )}
              </div>

              <div className="account-page__profile-copy">
                <span>مرحباً بك</span>
                <h2 id="account-profile-title">{currentCustomer?.fullName}</h2>
                <p dir="ltr">
                  <Phone aria-hidden="true" />
                  <span>{currentCustomer?.phone}</span>
                </p>
              </div>

              <span className="account-page__profile-divider" aria-hidden="true" />

              <div className="account-page__verified-block" aria-label="حساب موثق">
                <ShieldCheck className="account-page__verified" aria-hidden="true" />
                <strong>حساب موثق</strong>
                <span>تسوق بأمان</span>
              </div>
            </section>

            <section className="account-page__stats" aria-label="ملخص الحساب">
              {profileStats.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="account-page__stat" key={item.label}>
                    <Icon aria-hidden="true" />
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </article>
                );
              })}
            </section>

            <section className="account-page__sections" aria-label="أقسام حساب العميل">
              {signedInSections.map((item) => {
                const Icon = item.icon;

                return (
                  <button className={`account-page__section-row${item.variant ? ` account-page__section-row--${item.variant}` : ''}`} type="button" key={item.label} onClick={() => navigate(item.href)}>
                    <ChevronLeft className="account-page__section-chevron" aria-hidden="true" />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                    <span className="account-page__section-icon-wrap" aria-hidden="true">
                      <Icon className="account-page__section-icon" />
                    </span>
                  </button>
                );
              })}
            </section>

            <button className="account-page__logout" type="button" onClick={handleSignOut}>
              <LogOut aria-hidden="true" />
              <span>تسجيل الخروج</span>
            </button>
          </section>
        ) : (
          <section className="account-page__auth-card" aria-label="تسجيل الدخول وإنشاء الحساب">
            <div className="account-page__auth-toggle" role="tablist" aria-label="اختيار نوع الدخول">
              <button className={mode === 'signIn' ? 'is-active' : undefined} type="button" onClick={() => switchMode('signIn')}>
                <LogIn aria-hidden="true" />
                <span>تسجيل الدخول</span>
              </button>
              <button className={mode === 'signUp' ? 'is-active' : undefined} type="button" onClick={() => switchMode('signUp')}>
                <UserPlus aria-hidden="true" />
                <span>إنشاء حساب</span>
              </button>
            </div>

            {notice ? (
              <div className="account-page__notice" role="status">
                <AlertCircle aria-hidden="true" />
                <span>{notice}</span>
              </div>
            ) : null}

            <form className="account-page__form" onSubmit={handleSubmit} noValidate>
              {mode === 'signUp' && signUpStep === 'otp' ? (
                <div className="account-page__otp-panel">
                  <label className="account-page__field">
                    <span>رمز التحقق</span>
                    <div className="account-page__input-wrap">
                      <span className="account-page__input-icon" aria-hidden="true">
                        <ShieldCheck />
                      </span>
                      <input
                        autoComplete="one-time-code"
                        dir="ltr"
                        inputMode="numeric"
                        name="otpCode"
                        onChange={updateOtpCode}
                        placeholder="123456"
                        type="text"
                        value={otpCode}
                      />
                    </div>
                    {errors.otpCode ? <em>{errors.otpCode}</em> : null}
                  </label>
                  <div className="account-page__otp-actions">
                    <button type="button" onClick={handleResendOtp} disabled={isSubmitting}>إعادة إرسال الرمز</button>
                    <button type="button" onClick={() => setSignUpStep('form')} disabled={isSubmitting}>تعديل البيانات</button>
                  </div>
                </div>
              ) : null}

              {mode === 'passwordReset' && passwordResetStep === 'otp' ? (
                <div className="account-page__otp-panel">
                  <label className="account-page__field">
                    <span>رمز التحقق</span>
                    <div className="account-page__input-wrap">
                      <span className="account-page__input-icon" aria-hidden="true">
                        <ShieldCheck />
                      </span>
                      <input
                        autoComplete="one-time-code"
                        dir="ltr"
                        inputMode="numeric"
                        name="otpCode"
                        onChange={updateOtpCode}
                        placeholder="123456"
                        type="text"
                        value={otpCode}
                      />
                    </div>
                    {errors.otpCode ? <em>{errors.otpCode}</em> : null}
                  </label>
                  <div className="account-page__otp-actions">
                    <button type="button" onClick={handleResendOtp} disabled={isSubmitting}>إعادة إرسال الرمز</button>
                    <button type="button" onClick={() => setPasswordResetStep('phone')} disabled={isSubmitting}>تغيير الرقم</button>
                  </div>
                </div>
              ) : null}

              {mode === 'signUp' && signUpStep === 'form' ? (
                <label className="account-page__field">
                  <span>الاسم الكامل</span>
                  <div className="account-page__input-wrap">
                    <span className="account-page__input-icon" aria-hidden="true">
                      <UserPlus />
                    </span>
                    <input
                      autoComplete="name"
                      name="fullName"
                      onChange={updateField}
                      placeholder="مثال: محمد السنوسي"
                      type="text"
                      value={values.fullName}
                    />
                  </div>
                  {errors.fullName ? <em>{errors.fullName}</em> : null}
                </label>
              ) : null}

              {mode === 'signIn' || (mode === 'signUp' && signUpStep === 'form') || (mode === 'passwordReset' && passwordResetStep === 'phone') ? (
              <label className="account-page__field">
                <span>رقم الهاتف</span>
                <div className="account-page__input-wrap">
                  <span className="account-page__input-icon" aria-hidden="true">
                    <Phone />
                  </span>
                  <input
                    autoComplete="tel"
                    dir="ltr"
                    inputMode="tel"
                    name="phone"
                    onChange={updateField}
                    placeholder="218+ 09xxxxxxxx"
                    type="tel"
                    value={values.phone}
                  />
                </div>
                {errors.phone ? <em>{errors.phone}</em> : null}
              </label>
              ) : null}

              {mode === 'signIn' || (mode === 'signUp' && signUpStep === 'form') || (mode === 'passwordReset' && passwordResetStep === 'password') ? (
              <label className="account-page__field">
                <span>{mode === 'passwordReset' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}</span>
                <div className="account-page__input-wrap">
                  <span className="account-page__input-icon" aria-hidden="true">
                    <LockKeyhole />
                  </span>
                  <input
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    name="password"
                    onChange={updateField}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                  />
                  <button
                    className="account-page__visibility"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
                {errors.password ? <em>{errors.password}</em> : null}
              </label>
              ) : null}

              {(mode === 'signUp' && signUpStep === 'form') || (mode === 'passwordReset' && passwordResetStep === 'password') ? (
                <label className="account-page__field">
                  <span>{mode === 'passwordReset' ? 'تأكيد كلمة المرور الجديدة' : 'تأكيد كلمة المرور'}</span>
                  <div className="account-page__input-wrap">
                    <span className="account-page__input-icon" aria-hidden="true">
                      <LockKeyhole />
                    </span>
                    <input
                      autoComplete="new-password"
                      name="confirmPassword"
                      onChange={updateField}
                      placeholder="••••••••"
                      type={showPassword ? 'text' : 'password'}
                      value={values.confirmPassword}
                    />
                  </div>
                  {errors.confirmPassword ? <em>{errors.confirmPassword}</em> : null}
                </label>
              ) : null}

              {submitError ? (
                <div className="account-page__error" role="alert">
                  <AlertCircle aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              ) : null}

              <button className="account-page__submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="account-page__submit-spinner" aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                <span>{submitLabel}</span>
              </button>

              {mode === 'signIn' ? (
                <button className="account-page__forgot" type="button" onClick={startPasswordReset}>
                  نسيت كلمة المرور؟
                </button>
              ) : null}

              {mode === 'passwordReset' ? (
                <button className="account-page__forgot" type="button" onClick={() => switchMode('signIn')}>
                  العودة لتسجيل الدخول
                </button>
              ) : null}
            </form>
          </section>
        )}
      </div>

      <nav className="customer-bottom-nav account-page__bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link className={item.active ? 'is-active' : undefined} to={item.href} key={`${item.href}-${item.label}`} aria-current={item.active ? 'page' : undefined}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
