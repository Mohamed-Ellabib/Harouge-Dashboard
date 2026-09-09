import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  ChevronLeft,
  CircleAlert,
  Clock,
  Eye,
  EyeOff,
  Glasses,
  Home,
  KeyRound,
  Loader2,
  MapPin,
  PenLine,
  Save,
  Trash2,
  User,
  UserRoundX,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext.jsx';
import {
  compressCustomerProfileImage,
  getCustomerProfileImage,
  removeCustomerProfileImage,
  saveCustomerProfileImage,
} from '@/lib/customerProfileImage.js';
import './AccountSettingsPage.css';

const settingsTabs = [
  { id: 'profile', label: 'البيانات', icon: User },
  { id: 'address', label: 'العنوان', icon: MapPin },
  { id: 'password', label: 'كلمة المرور', icon: KeyRound },
  { id: 'delete', label: 'حذف الحساب', icon: UserRoundX, danger: true },
];

const DELETE_CONFIRMATION_PHRASE = 'حذف حسابي';

const bottomNavItems = [
  { label: 'الرئيسية', href: '/store', icon: Home },
  { label: 'النظارات', href: '/sunglasses', icon: Glasses },
  { label: 'الساعات', href: '/watches', icon: Clock },
  { label: 'الأقلام', href: '/pens', icon: PenLine },
  { label: 'الحساب', href: '/account', icon: User, active: true },
];

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('') || 'ع';
}

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const {
    currentCustomer,
    deleteCustomerAccount,
    getCustomerSettings,
    isCustomerAuthenticated,
    isCustomerLoading,
    updateCustomerAddress,
    updateCustomerPassword,
    updateCustomerProfile,
  } = useCustomerAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [profileValues, setProfileValues] = useState({ fullName: '' });
  const [addressValues, setAddressValues] = useState({
    city: '',
    state: '',
    addressLine1: '',
    addressLine2: '',
  });
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteValues, setDeleteValues] = useState({
    currentPassword: '',
    confirmation: '',
  });

  useEffect(() => {
    if (!currentCustomer?.id) return;
    setProfileImage(getCustomerProfileImage(currentCustomer.id));
  }, [currentCustomer?.id]);

  useEffect(() => {
    if (isCustomerLoading || !isCustomerAuthenticated) return undefined;

    let isMounted = true;
    getCustomerSettings()
      .then((payload) => {
        if (!isMounted) return;
        setProfileValues({ fullName: payload.customer?.fullName || currentCustomer?.fullName || '' });
        setAddressValues({
          city: payload.address?.city || '',
          state: payload.address?.state || '',
          addressLine1: payload.address?.addressLine1 || '',
          addressLine2: payload.address?.addressLine2 || '',
        });
      })
      .catch((error) => {
        if (isMounted) toast.error(error.message || 'تعذر تحميل إعدادات الحساب.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentCustomer?.fullName, getCustomerSettings, isCustomerAuthenticated, isCustomerLoading]);

  if (!isCustomerLoading && !isCustomerAuthenticated) {
    return <Navigate to="/account" replace state={{ authMessage: 'سجل الدخول للوصول إلى إعدادات حسابك.' }} />;
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentCustomer?.id) return;

    try {
      setSavingSection('photo');
      const compressedImage = await compressCustomerProfileImage(file);
      saveCustomerProfileImage(currentCustomer.id, compressedImage);
      setProfileImage(compressedImage);
      toast.success('تم حفظ صورة الحساب على هذا الجهاز.');
    } catch (error) {
      toast.error(error.message || 'تعذر حفظ الصورة.');
    } finally {
      setSavingSection('');
    }
  }

  function handlePhotoRemove() {
    if (!currentCustomer?.id) return;
    removeCustomerProfileImage(currentCustomer.id);
    setProfileImage('');
    toast.success('تم حذف صورة الحساب من هذا الجهاز.');
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const fullName = profileValues.fullName.trim();
    if (!fullName) {
      toast.error('الاسم الكامل مطلوب.');
      return;
    }

    try {
      setSavingSection('profile');
      await updateCustomerProfile({ fullName });
      toast.success('تم تحديث الاسم بنجاح.');
    } catch (error) {
      toast.error(error.message || 'تعذر تحديث الاسم.');
    } finally {
      setSavingSection('');
    }
  }

  async function handleAddressSubmit(event) {
    event.preventDefault();
    if (!addressValues.city.trim() || !addressValues.addressLine1.trim()) {
      toast.error('المدينة والعنوان الأساسي مطلوبان.');
      return;
    }

    try {
      setSavingSection('address');
      const payload = await updateCustomerAddress({
        ...addressValues,
        recipientName: profileValues.fullName || currentCustomer?.fullName,
      });
      setAddressValues((current) => ({ ...current, ...payload.address }));
      toast.success('تم حفظ عنوان التوصيل.');
    } catch (error) {
      toast.error(error.message || 'تعذر حفظ العنوان.');
    } finally {
      setSavingSection('');
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (passwordValues.newPassword.length < 6) {
      toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (passwordValues.newPassword !== passwordValues.confirmPassword) {
      toast.error('تأكيد كلمة المرور غير مطابق.');
      return;
    }

    try {
      setSavingSection('password');
      await updateCustomerPassword(passwordValues);
      setPasswordValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('تم تغيير كلمة المرور بنجاح.');
    } catch (error) {
      toast.error(error.message || 'تعذر تغيير كلمة المرور.');
    } finally {
      setSavingSection('');
    }
  }

  function handleDeleteRequest(event) {
    event.preventDefault();

    if (deleteValues.currentPassword.length < 6) {
      toast.error('أدخل كلمة المرور الحالية للمتابعة.');
      return;
    }

    if (deleteValues.confirmation.trim() !== DELETE_CONFIRMATION_PHRASE) {
      toast.error(`اكتب العبارة «${DELETE_CONFIRMATION_PHRASE}» كما هي.`);
      return;
    }

    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm(event) {
    event.preventDefault();

    try {
      setSavingSection('delete');
      await deleteCustomerAccount({ currentPassword: deleteValues.currentPassword });
      setIsDeleteDialogOpen(false);
      toast.success('تم حذف حسابك وبياناته المرتبطة بنجاح.');
      navigate('/store', { replace: true });
    } catch (error) {
      toast.error(error.message || 'تعذر حذف الحساب الآن. حاول مرة أخرى.');
    } finally {
      setSavingSection('');
    }
  }

  const displayedName = profileValues.fullName || currentCustomer?.fullName || 'عميل السنوسي';

  return (
    <main className="account-settings-page" dir="rtl">
      <header className="account-settings-page__header">
        <button type="button" onClick={() => navigate('/account')} aria-label="العودة إلى الحساب">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div>
          <h1>إعدادات الحساب</h1>
          <span>بياناتك الشخصية وعنوان التوصيل</span>
        </div>
        <span aria-hidden="true" />
      </header>

      <div className="account-settings-page__shell">
        <section className="account-settings-page__identity" aria-label="صورة وبيانات الحساب">
          <div className="account-settings-page__avatar">
            {profileImage ? <img src={profileImage} alt="صورة الحساب" /> : <span>{getInitials(displayedName)}</span>}
            <button type="button" onClick={() => photoInputRef.current?.click()} aria-label="تغيير صورة الحساب" disabled={savingSection === 'photo'}>
              {savingSection === 'photo' ? <Loader2 className="is-spinning" aria-hidden="true" /> : <Camera aria-hidden="true" />}
            </button>
          </div>
          <div>
            <strong>{displayedName}</strong>
            <span dir="ltr">{currentCustomer?.phone}</span>
            <small>الصورة محفوظة على هذا الجهاز فقط</small>
          </div>
          {profileImage ? (
            <button className="account-settings-page__remove-photo" type="button" onClick={handlePhotoRemove} aria-label="حذف صورة الحساب">
              <Trash2 aria-hidden="true" />
            </button>
          ) : null}
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} hidden />
        </section>

        <nav className="account-settings-page__tabs" aria-label="أقسام إعدادات الحساب">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={`${activeTab === tab.id ? 'is-active' : ''}${tab.danger ? ' is-danger' : ''}`.trim() || undefined}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                key={tab.id}
              >
                <Icon aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {isLoading ? (
          <section className="account-settings-page__loading" aria-live="polite">
            <Loader2 className="is-spinning" aria-hidden="true" />
            <span>جاري تحميل الإعدادات</span>
          </section>
        ) : null}

        {!isLoading && activeTab === 'profile' ? (
          <form className="account-settings-page__panel" onSubmit={handleProfileSubmit}>
            <div className="account-settings-page__panel-heading">
              <User aria-hidden="true" />
              <div>
                <h2>البيانات الشخصية</h2>
                <p>الاسم الظاهر في حسابك وطلباتك.</p>
              </div>
            </div>
            <label className="account-settings-page__field">
              <span>الاسم الكامل</span>
              <input
                autoComplete="name"
                value={profileValues.fullName}
                onChange={(event) => setProfileValues({ fullName: event.target.value })}
                maxLength={120}
              />
            </label>
            <label className="account-settings-page__field">
              <span>رقم الهاتف</span>
              <input value={currentCustomer?.phone || ''} dir="ltr" disabled />
              <small>رقم الهاتف مرتبط بتسجيل الدخول ولا يمكن تغييره من هنا.</small>
            </label>
            <button className="account-settings-page__save" type="submit" disabled={savingSection === 'profile'}>
              {savingSection === 'profile' ? <Loader2 className="is-spinning" aria-hidden="true" /> : <Save aria-hidden="true" />}
              <span>حفظ البيانات</span>
            </button>
          </form>
        ) : null}

        {!isLoading && activeTab === 'address' ? (
          <form className="account-settings-page__panel" onSubmit={handleAddressSubmit}>
            <div className="account-settings-page__panel-heading">
              <MapPin aria-hidden="true" />
              <div>
                <h2>عنوان التوصيل</h2>
                <p>سيظهر هذا العنوان تلقائياً عند إتمام الطلب.</p>
              </div>
            </div>
            <div className="account-settings-page__field-grid">
              <label className="account-settings-page__field">
                <span>المدينة</span>
                <input
                  autoComplete="address-level2"
                  value={addressValues.city}
                  onChange={(event) => setAddressValues((current) => ({ ...current, city: event.target.value }))}
                  maxLength={100}
                  placeholder="مثال: طرابلس"
                />
              </label>
              <label className="account-settings-page__field">
                <span>المنطقة</span>
                <input
                  autoComplete="address-level1"
                  value={addressValues.state}
                  onChange={(event) => setAddressValues((current) => ({ ...current, state: event.target.value }))}
                  maxLength={100}
                  placeholder="اختياري"
                />
              </label>
            </div>
            <label className="account-settings-page__field">
              <span>العنوان الأساسي</span>
              <input
                autoComplete="street-address"
                value={addressValues.addressLine1}
                onChange={(event) => setAddressValues((current) => ({ ...current, addressLine1: event.target.value }))}
                maxLength={180}
                placeholder="الشارع، رقم المبنى، أقرب نقطة دالة"
              />
            </label>
            <label className="account-settings-page__field">
              <span>تفاصيل إضافية</span>
              <input
                value={addressValues.addressLine2}
                onChange={(event) => setAddressValues((current) => ({ ...current, addressLine2: event.target.value }))}
                maxLength={180}
                placeholder="الطابق أو رقم الشقة - اختياري"
              />
            </label>
            <button className="account-settings-page__save" type="submit" disabled={savingSection === 'address'}>
              {savingSection === 'address' ? <Loader2 className="is-spinning" aria-hidden="true" /> : <Check aria-hidden="true" />}
              <span>حفظ العنوان</span>
            </button>
          </form>
        ) : null}

        {!isLoading && activeTab === 'password' ? (
          <form className="account-settings-page__panel" onSubmit={handlePasswordSubmit}>
            <div className="account-settings-page__panel-heading">
              <KeyRound aria-hidden="true" />
              <div>
                <h2>تغيير كلمة المرور</h2>
                <p>استخدم كلمة مرور جديدة لا تقل عن 6 أحرف.</p>
              </div>
            </div>
            {[
              ['currentPassword', 'كلمة المرور الحالية', 'current-password'],
              ['newPassword', 'كلمة المرور الجديدة', 'new-password'],
              ['confirmPassword', 'تأكيد كلمة المرور الجديدة', 'new-password'],
            ].map(([name, label, autoComplete]) => (
              <label className="account-settings-page__field" key={name}>
                <span>{label}</span>
                <div className="account-settings-page__password-field">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    value={passwordValues[name]}
                    onChange={(event) => setPasswordValues((current) => ({ ...current, [name]: event.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPasswords((current) => !current)} aria-label={showPasswords ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                    {showPasswords ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </div>
              </label>
            ))}
            <button className="account-settings-page__save" type="submit" disabled={savingSection === 'password'}>
              {savingSection === 'password' ? <Loader2 className="is-spinning" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
              <span>تغيير كلمة المرور</span>
            </button>
          </form>
        ) : null}

        {!isLoading && activeTab === 'delete' ? (
          <form className="account-settings-page__panel account-settings-page__panel--danger" onSubmit={handleDeleteRequest}>
            <div className="account-settings-page__panel-heading">
              <UserRoundX aria-hidden="true" />
              <div>
                <h2>حذف الحساب نهائياً</h2>
                <p>سيُحذف حساب تسجيل الدخول وملفك وعنوانك وتقييماتك والبيانات المرتبطة بك.</p>
              </div>
            </div>

            <div className="account-settings-page__deletion-warning">
              <CircleAlert aria-hidden="true" />
              <div>
                <strong>لا يمكن التراجع عن هذه العملية</strong>
                <p>
                  ستُزال بياناتك الشخصية من الطلبات السابقة، وقد تبقى سجلات معاملات مجهولة الهوية عند
                  الحاجة للمحاسبة أو الالتزامات القانونية. إذا كان لديك طلب نشط، احتفظ برقمه قبل الحذف.
                </p>
                <Link to="/account-deletion">اقرأ سياسة حذف الحساب</Link>
              </div>
            </div>

            <label className="account-settings-page__field">
              <span>كلمة المرور الحالية</span>
              <div className="account-settings-page__password-field">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={deleteValues.currentPassword}
                  onChange={(event) => setDeleteValues((current) => ({ ...current, currentPassword: event.target.value }))}
                  minLength={6}
                  required
                />
                <button type="button" onClick={() => setShowPasswords((current) => !current)} aria-label={showPasswords ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                  {showPasswords ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </label>

            <label className="account-settings-page__field">
              <span>للتأكيد، اكتب: {DELETE_CONFIRMATION_PHRASE}</span>
              <input
                autoComplete="off"
                value={deleteValues.confirmation}
                onChange={(event) => setDeleteValues((current) => ({ ...current, confirmation: event.target.value }))}
                required
              />
            </label>

            <button className="account-settings-page__delete" type="submit" disabled={savingSection === 'delete'}>
              <Trash2 aria-hidden="true" />
              <span>متابعة حذف الحساب</span>
            </button>
          </form>
        ) : null}
      </div>

      <nav className="customer-bottom-nav account-settings-page__bottom-nav" aria-label="التنقل السفلي">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link className={item.active ? 'is-active' : undefined} to={item.href} key={item.href} aria-current={item.active ? 'page' : undefined}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => !savingSection && setIsDeleteDialogOpen(open)}>
        <AlertDialogContent className="account-settings-page__delete-dialog" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل تريد حذف الحساب نهائياً؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيُنهى تسجيل الدخول وتُحذف بيانات الحساب فور نجاح العملية. لا يمكن استعادة الحساب بعد ذلك.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingSection === 'delete'}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="account-settings-page__delete-confirm"
              disabled={savingSection === 'delete'}
              onClick={handleDeleteConfirm}
            >
              {savingSection === 'delete' ? <Loader2 className="is-spinning" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
              <span>حذف الحساب نهائياً</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
