import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Boxes,
  ChartNoAxesCombined,
  ShieldAlert,
  Database,
  Workflow,
  Layers,
  Warehouse,
  Route,
  TrendingUp,
  GitCompareArrows,
  Factory,
  Gauge,
  FileSearch,
  Network,
  Split,
  LineChart,
  Settings2,
  ListChecks,
  BookOpen,
  Sparkles,
  Bookmark,
  FileText,
  Siren,
  Settings,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'

/**
 * Single registry for navigation, headers, breadcrumbs and page status.
 * Structure follows docs/03 §9.1 (approved 1405/08/09).
 *
 * Application readiness is kept separate from data coverage and quality:
 * - available: built here with sourced data
 * - migrating: exists in the live build, not yet rebuilt here
 * - in-development: "coming soon" in the live build; no approved content
 * - planned: approved new capability (F01–F08), not built
 */
export type RouteStatus = 'available' | 'migrating' | 'in-development' | 'planned'

export const statusMeta: Record<RouteStatus, { label: string | null; description: string }> = {
  available: { label: null, description: '' },
  migrating: {
    label: 'در حال انتقال',
    description: 'این بخش در نسخه جاری سامانه وجود دارد و در حال بازسازی در این نسخه است.',
  },
  'in-development': {
    label: 'به‌زودی',
    description: 'این بخش در حال طراحی و توسعه است و هنوز محتوای تأییدشده‌ای ندارد.',
  },
  planned: {
    label: 'برنامه‌ریزی‌شده',
    description: 'این قابلیت تأیید شده و در مراحل بعدی توسعه ساخته می‌شود.',
  },
}

export type DomainId = 'overview' | 'supply-chain' | 'trade' | 'risk' | 'data' | 'planning'

export interface NavDomain {
  id: DomainId
  label: string
  icon: LucideIcon
  /** Collapsed by default in the sidebar */
  collapsed?: boolean
}

export const domains: NavDomain[] = [
  { id: 'overview', label: 'نمای کلی', icon: LayoutDashboard },
  { id: 'supply-chain', label: 'حوزه‌های زنجیره تأمین', icon: Boxes },
  { id: 'trade', label: 'تحلیل تجارت', icon: ChartNoAxesCombined },
  { id: 'risk', label: 'پایش ریسک', icon: ShieldAlert },
  { id: 'data', label: 'داده و منابع', icon: Database },
  { id: 'planning', label: 'برنامه‌ریزی و اقدام', icon: Workflow, collapsed: true },
]

/** A supply-chain domain section: one nav item, several pages with a local sub-navigation (PT-2). */
export interface DomainSection {
  id: string
  label: string
  description: string
  icon: LucideIcon
  basePath: string
  /** 'utility': app settings, reached from the user menu and search (not the sidebar) */
  domain: DomainId | 'utility'
  status: RouteStatus
}

export const sections: DomainSection[] = [
  {
    id: 'raw-materials',
    label: 'مواد اولیه و انبار',
    description: 'تجارت مواد اولیه و محصولات پایه، نیازمندی‌های داده، مجموعه‌داده‌ها و کیفیت آن‌ها. داده‌ای درباره ظرفیت و موجودی انبارها در دسترس نیست.',
    icon: Warehouse,
    basePath: '/supply-chain/raw-materials',
    domain: 'supply-chain',
    status: 'migrating',
  },
  {
    id: 'settings',
    label: 'تنظیمات',
    description: 'سناریوهای آماده، قواعد هشدار و دسترسی‌ها.',
    icon: Settings,
    basePath: '/settings',
    domain: 'utility',
    status: 'available',
  },
]

export interface AppRoute {
  id: string
  path: string
  label: string
  icon: LucideIcon
  domain: DomainId | 'utility'
  /** Set when the page belongs to a domain section */
  section?: string
  status: RouteStatus
  /** The question this page answers for the user */
  question: string
  description: string
  /** Content documented for this destination (shown while it is not yet built here) */
  scope?: string[]
  /** Approved feature id from IA v1.4 §15 */
  feature?: string
  /** Section in docs/03 that specifies the page */
  spec: string
  /** Where this content lives in the live build, so nothing is lost in migration */
  legacy?: { label: string; path: string | null }[]
  /** Hidden from navigation (placement undecided) */
  hidden?: boolean
  /** Pages users can use today for related evidence */
  related?: string[]
}

const planning = (
  [
    ['planning-scenarios', '/planning/scenarios', 'سناریوسازی', Split],
    ['planning-forecasting', '/planning/forecasting', 'مدلسازی و پیش‌بینی', LineChart],
    ['planning-optimization', '/planning/optimization', 'بهینه‌سازی', Settings2],
  ] as const
).map(([id, path, label, icon]): AppRoute => ({
  id,
  path,
  label,
  icon,
  domain: 'planning',
  // «سناریوسازی» is built (alerts × scenario flow); the rest are still in design
  status: id === 'planning-scenarios' ? 'available' : 'in-development',
  question: 'این بخش در حال طراحی است.',
  description: 'محتوای این بخش هنوز تعریف و تأیید نشده است.',
  spec: '§۹.۱',
  legacy: [{ label: `برنامه‌ریزی و اقدام › ${label}`, path: null }],
}))
// «پیشنهادها» became «اقدام‌ها» (actions-page-prompt §1): what units carry out from decisions on alerts
planning.push({
  id: 'planning-actions',
  path: '/planning/actions',
  label: 'اقدام‌ها',
  icon: ListChecks,
  domain: 'planning',
  status: 'available',
  question: 'کدام اقدام منتظر من است، کدام دیر شده و کدام گیر کرده؟',
  description: 'اقدام‌هایی که از تصمیم روی هشدارها ساخته شده‌اند · به ترتیب فوریت',
  spec: 'actions-page-prompt §5',
})

export const routes: AppRoute[] = [
  {
    id: 'overview',
    path: '/',
    label: 'نمای کلی زنجیره',
    icon: LayoutDashboard,
    domain: 'overview',
    status: 'available',
    question: 'چه چیزی تغییر کرده و چه چیزی نیاز به بررسی دارد؟',
    description: 'وضعیت تجارت، گلوگاه‌ها، روند ارزش کالاها و آمادگی داده در حوزه‌های زنجیره تأمین.',
    scope: [
      'هشدار تازگی داده و دوره گزارش هر منبع',
      'سه گلوگاه برتر بر اساس ارزش عبوری (پیوند به تحلیل گلوگاه‌های حوزه مواد اولیه)',
      'روند ارزش چهار کالای پرارزش با علامت دوره ناقص',
      'آمادگی داده: ۷ مرحله در ۶ حوزه؛ میانگین بدون احتساب حوزه گردآوری‌نشده',
      'پیش‌نمایش قابلیت‌های در حال توسعه (داده نمونه): هشدارها، موجودی، محموله‌ها، اقلام زیر سطح ایمن',
    ],
    spec: '§۹.۲ نمای کلی',
    legacy: [{ label: 'نمای کلی زنجیره', path: '/ui' }],
  },
  // ── Supply-chain domains
  {
    id: 'supply-coverage',
    path: '/supply-chain',
    // Renamed by the owner from «پوشش داده‌ها»
    label: 'پایش وضعیت داده‌ها',
    icon: Layers,
    domain: 'supply-chain',
    status: 'migrating',
    question: 'داده‌های کدام حلقه‌های زنجیره تأمین در دسترس است؟',
    description: 'هفت مرحله زنجیره تأمین، شش حوزه داده و درصد پوشش نیازمندی‌های داده در هر حوزه.',
    scope: ['نقشه ۷ مرحله ← ۶ حوزه (مواد اولیه و انبار در یک حوزه مشترک)', 'درصد پوشش و وضعیت هر حوزه، با پیوند به صفحه حوزه', 'تعریف پوشش؛ میانگین با مخرج صریح'],
    spec: '§۹.۲ پوشش داده‌های زنجیره',
    legacy: [{ label: 'پایش وضعیت داده‌ها', path: '/ui/data' }],
  },
  {
    id: 'rm-overview',
    path: '/supply-chain/raw-materials',
    label: 'نمای کلی حوزه',
    icon: Warehouse,
    domain: 'supply-chain',
    section: 'raw-materials',
    status: 'migrating',
    question: 'درباره مواد اولیه و انبار چه داده‌ای داریم و چه چیزی را می‌توان تحلیل کرد؟',
    description: 'خلاصه پوشش، آمادگی هر مرحله، مجموعه‌داده‌ها و فهرست تحلیل‌های این حوزه.',
    scope: ['پوشش نیازمندی‌ها ۴۰٪ با شمار وضعیت‌ها (۴ کامل، ۴ جزئی، ۶ موجود نیست)', 'آمادگی مرحله‌ها: مواد اولیه — داده تجاری موجود؛ انبار — داده‌ای موجود نیست (نیازمندی ۱۱)', 'مجموعه‌داده‌ها و موارد نیازمند توجه کیفیت', 'فهرست ۵ گروه تحلیلی و تحلیل‌های هر گروه، با پرسش هرکدام'],
    spec: '§۵.۲ و §۹.۲ نمای کلی حوزه',
    legacy: [{ label: 'پایش وضعیت داده‌ها › کارت مواد اولیه و انبار آنها', path: '/ui/data' }],
  },
  {
    id: 'rm-analysis',
    path: '/supply-chain/raw-materials/analysis',
    label: 'تحلیل‌های آماری',
    icon: ChartNoAxesCombined,
    domain: 'supply-chain',
    section: 'raw-materials',
    status: 'migrating',
    question: 'داده‌های تجارت و تولید مواد اولیه چه می‌گویند؟',
    description: 'تحلیل‌های اختصاصی این حوزه در پنج گروه موضوعی.',
    scope: [
      'تجارت مواد اولیه: فعالیت ماهانه تجارت (۲۰۲۵/۰۵–۲۰۲۶/۰۴) · روند سالانه تجارت جهانی (۲۰۱۹–۲۰۲۴)',
      'ترکیب کالاها: سهم ۱۴ کالای اساسی · سهم ۱۸ گروه کالا',
      'گلوگاه‌ها و مسیرها: تجارت‌های عبوری از ۱۱ گلوگاه حیاتی · سناریوهای مسیر جایگزین',
      'بنادر: انواع بنادر',
      'تولید جهانی: روند تاریخی تولید · مقایسه روند و رشد سالانه تولید محصولات',
    ],
    spec: '§۵.۳ و §۵.۴',
    legacy: [
      { label: 'مواد اولیه و انبار آنها › نمودارهای آماری', path: '/ui/data/trade-data' },
      { label: 'روندها و شاخص‌ها › مقایسه تولید محصولات', path: '/ui/analysis/trends/production' },
    ],
  },
  {
    id: 'rm-data',
    path: '/supply-chain/raw-materials/data',
    label: 'داده‌ها و کیفیت',
    icon: Database,
    domain: 'supply-chain',
    section: 'raw-materials',
    status: 'migrating',
    question: 'چه داده‌ای لازم داریم، چه داریم و چقدر قابل اعتماد است؟',
    description: 'نیازمندی‌های داده، مجموعه‌داده‌ها، قواعد کیفیت، فرهنگ فیلدها و روابط مجموعه‌داده‌ها.',
    scope: ['۱۴ نیازمندی با وضعیت پوشش، توضیح، مجموعه‌داده و قواعد مرتبط', 'نمایه ۵ مجموعه‌داده: بنادر، جریان تجارت یک‌ساله، سری زمانی جریان تجارت، تولید FAOSTAT، مسیرهای مشتق', 'کیفیت: کل رکوردها ۱٬۰۸۹٬۹۸۶ · ۲ مجموعه نیازمند توجه · ۱۳ قاعده مفقود/نامعتبر', 'فرهنگ فیلدها و روابط مجموعه‌داده‌ها'],
    spec: '§۵.۵',
    legacy: [
      { label: 'مواد اولیه و انبار آنها › نمای کلی داده', path: '/ui/data/trade-data' },
      { label: 'مواد اولیه و انبار آنها › کیفیت داده', path: '/ui/data/trade-data' },
    ],
  },
  // ── Trade Analytics
  {
    id: 'trade-routes',
    path: '/trade/routes',
    label: 'نقشه مسیرها',
    icon: Route,
    domain: 'trade',
    status: 'available',
    question: 'جریان‌های تجاری از کدام مسیرها و گلوگاه‌ها عبور می‌کنند؟',
    description: 'نمایش بنادر، گلوگاه‌های کاندید، مسیرهای اصلی و مسیرهای جایگزین تجارت.',
    scope: [
      'فیلترهای اصلی (کالا، مبدأ، مقصد، حالت حمل) و فیلترهای پیشرفته (بندر بارگیری و تخلیه، گلوگاه کاندید، چارک ارزش)',
      'نقشه با نمای جدولی معادل؛ لایه‌های مسیر اصلی، مسیر جایگزین، بنادر و محدوده گلوگاه',
      'خلاصه ارزش، رکوردها، مسیرها و وزن معتبر؛ سهم ارزش بر اساس گلوگاه کاندید؛ کشورهای اصلی',
      'هشدار پوشش مسیر و پیوند به تحلیل گلوگاه‌های حوزه مواد اولیه',
    ],
    spec: '§۹.۲ نقشه مسیرها',
    legacy: [{ label: 'تحلیل تجارت و ریسک › نقشه مسیرها', path: '/ui/analysis/routes' }],
  },
  {
    id: 'trade-trends',
    path: '/trade/trends',
    // Renamed by the owner from «روندها و شاخص‌ها» (overrides IA decision ت۳); legacy sources keep the old name
    label: 'تحلیل جریان تجارت',
    icon: TrendingUp,
    domain: 'trade',
    status: 'migrating',
    question: 'سهم کشورها از تجارت هر کالا و جریان تجارت هر کشور با شرکایش چگونه است؟',
    description: 'دو نمای جریان تجارت با فیلتر مشترک: نمای کلی تجارت کالاها و عملکرد تجارت.',
    scope: ['انتخابگر مجموعه‌داده: ۱۲ ماه اخیر · ۱۴ کالا (HS4) | ۶ سال · ۱۸ گروه (HS6)', 'نمای کلی تجارت کالاها: نقشه سهم کشورها، ده کشور اول، روند ماهانه، رشد ماهانه', 'عملکرد تجارت: نقشه جریان شرکا، سهم شرکا، روند ماهانه، سهم در برابر رشد بازار'],
    spec: '§۹.۲ روندها و شاخص‌ها',
    legacy: [
      { label: 'روندها و شاخص‌ها › نمای کلی تجارت کالاها', path: '/ui/analysis/trends/commodity' },
      { label: 'روندها و شاخص‌ها › عملکرد تجارت', path: '/ui/analysis/trends/performance' },
    ],
  },
  {
    id: 'trade-industry',
    path: '/trade/industry',
    label: 'داشبورد تحلیلی صنعت',
    icon: Factory,
    domain: 'trade',
    status: 'available',
    question: 'خرید مواد اولیه یک شرکت در ماه‌های اخیر چطور تغییر کرده و چرا؟',
    description: 'گزارش فعالیت ماهانه شرکت‌ها در کدال: خرید مواد اولیه، ترکیب، نرخ و تجزیه تغییر مبلغ.',
    spec: 'page-prompt · داشبورد تحلیلی صنعت',
    legacy: [{ label: 'تحلیل تجارت و ریسک › داشبورد تحلیلی صنعت › خرید مواد اولیه', path: '/ui/analysis/industry/purchases' }],
  },
  {
    id: 'trade-compare',
    path: '/trade/compare',
    // Renamed by the owner from «مقایسه کشورها و کالاها»
    label: 'مقایسه تولید محصولات',
    icon: GitCompareArrows,
    domain: 'trade',
    status: 'planned',
    feature: 'F02',
    question: 'کشورها یا کالاهای منتخب با تعریف تحلیلی یکسان چه تفاوتی دارند؟',
    description: 'مقایسه هم‌سنجِ کشورها یا کالاها با مبنای مشترک جریان، دوره، شاخص و طبقه‌بندی.',
    spec: 'IA-05',
    related: ['trade-trends'],
  },
  // ── Risk Monitoring
  {
    id: 'risk-assessment',
    path: '/risk/assessment',
    label: 'ارزیابی ریسک',
    icon: Gauge,
    domain: 'risk',
    status: 'in-development',
    question: 'این بخش چه ریسک‌هایی را ارزیابی خواهد کرد و امروز شواهد مرتبط کجاست؟',
    description: 'شناسایی، سنجش و اولویت‌بندی ریسک‌های زنجیره تأمین. روش ارزیابی ریسک هنوز تعریف نشده است.',
    spec: 'IA-06',
    legacy: [{ label: 'تحلیل تجارت و ریسک › ارزیابی ریسک', path: null }],
    related: ['trade-routes', 'trade-trends', 'rm-analysis'],
  },
  // ── Data & Sources
  {
    id: 'data-sources',
    path: '/data/sources',
    label: 'منابع داده',
    icon: FileSearch,
    domain: 'data',
    status: 'planned',
    feature: 'F05',
    question: 'این شاخص از کجا آمده و چه محدودیت‌هایی دارد؟',
    description: 'فهرست میان‌حوزه‌ای مجموعه‌داده‌ها با حوزه مالک، خلاصه کیفیت، روابط مجموعه‌داده‌ها و تعریف شاخص‌ها.',
    spec: '§۳.۳ و §۹.۲ منابع داده',
    related: ['rm-data'],
  },
  {
    id: 'data-graph',
    path: '/data/graph',
    label: 'گراف دانش',
    icon: Network,
    domain: 'data',
    status: 'migrating',
    question: 'موجودیت‌های زنجیره تأمین چگونه به هم مرتبط‌اند؟',
    description: 'ساختار تعریف‌شده ۱۲ نوع گره و روابط میان آن‌ها؛ نه رکوردهای زنده پایگاه داده.',
    scope: ['۱۲ نوع گره و ۲۵ نوع رابطه', 'جستجو و تمرکز روی یک گره', 'فهرست دسترس‌پذیر موجودیت‌ها و روابط'],
    spec: '§۹.۱',
    legacy: [{ label: 'پایش وضعیت داده‌ها › گراف دانش زنجیره تأمین', path: '/ui/data' }],
  },
  // ── Planning & Actions
  ...planning,
  // ── Shell utilities
  {
    id: 'knowledge-base',
    path: '/knowledge-base',
    label: 'پایگاه دانش',
    icon: BookOpen,
    domain: 'utility',
    status: 'in-development',
    question: 'راهنما و تعاریف سامانه کجاست؟',
    description: 'محتوای پایگاه دانش هنوز تعریف نشده است.',
    spec: '§۹.۱',
    legacy: [{ label: 'برنامه‌ریزی و اقدام › پایگاه دانش', path: null }],
  },
  {
    id: 'assistant',
    path: '/assistant',
    label: 'دستیار هوشمند',
    icon: Sparkles,
    domain: 'utility',
    status: 'planned',
    feature: 'F08',
    question: 'آیا می‌توانم درباره داده‌های این صفحه سؤال بپرسم و پاسخ را ردیابی کنم؟',
    description: 'دستیار تحلیلی مبتنی بر داده‌های در دسترس، با ذکر منبع و دامنه هر پاسخ.',
    spec: 'IA-13',
    legacy: [{ label: 'دستیار هوشمند (منو و دکمه شناور)', path: null }],
  },
  {
    id: 'saved-analyses',
    path: '/workspace/saved',
    label: 'تحلیل‌های ذخیره‌شده',
    icon: Bookmark,
    domain: 'utility',
    status: 'planned',
    feature: 'F01',
    question: 'چگونه یک تحلیل را بدون ساخت دوباره فیلترها ادامه دهم؟',
    description: 'ذخیره و بازگشایی پیکربندی تحلیل‌ها. محل قرارگیری در ناوبری هنوز تصمیم‌گیری نشده است.',
    spec: 'IA-11',
    hidden: true,
  },
  {
    id: 'reports',
    path: '/workspace/reports',
    label: 'گزارش‌ها',
    icon: FileText,
    domain: 'utility',
    status: 'planned',
    feature: 'F03',
    question: 'چگونه یک تحلیل قابل‌ردیابی را گزارش کنم؟',
    description: 'ساخت گزارش با دوره، واحد، منبع و محدودیت‌های هر بخش. محل قرارگیری هنوز تصمیم‌گیری نشده است.',
    spec: 'IA-12',
    hidden: true,
  },
  {
    // In the sidebar under «مرکز کنترل», right after the overview; also opened from the dashboard and the bell
    id: 'alerts',
    path: '/alerts',
    label: 'هشدارها',
    icon: Siren,
    domain: 'overview',
    status: 'available',
    question: 'چه چیزی همین حالا رسیدگی می‌خواهد و وضعیت هر هشدار چیست؟',
    description: 'همه هشدارهای حوزه شما · به ترتیب شدت و زمان',
    spec: 'alerts-spec §3.1',
  },
  // Settings (/settings): reached from the user menu and search, not the sidebar
  {
    id: 'settings-templates',
    path: '/settings/scenario-templates',
    label: 'سناریوهای آماده',
    icon: Split,
    domain: 'utility',
    section: 'settings',
    status: 'available',
    question: '«افزودن سناریو» برای هر نوع هشدار کدام سناریوها را پیشنهاد می‌دهد؟',
    description: 'سناریوهایی که «افزودن سناریو» برای هر نوع هشدار پیشنهاد می‌دهد',
    spec: 'prompt §8.4',
  },
  {
    id: 'settings-alert-rules',
    path: '/settings/alert-rules',
    label: 'قواعد و آستانه‌های هشدار',
    icon: SlidersHorizontal,
    domain: 'utility',
    section: 'settings',
    status: 'planned',
    question: 'هر هشدار با چه قاعده و آستانه‌ای فعال می‌شود و چه کسی می‌تواند آن را تغییر دهد؟',
    description: 'ویرایش آستانه‌ها برای هر نوع هشدار، با سابقه‌ی تغییر.',
    spec: 'fix-login-alerts-settings §د',
  },
  {
    id: 'settings-roles',
    path: '/settings/roles',
    label: 'نقش‌ها و دسترسی',
    icon: UsersRound,
    domain: 'utility',
    section: 'settings',
    status: 'planned',
    question: 'چه کسی می‌تواند هشدار را ببیند، تصمیم ثبت کند یا سناریوی آماده بسازد؟',
    description: 'نقش هر کاربر و کارهایی که در هشدارها و سناریوها مجاز است.',
    spec: 'fix-login-alerts-settings §د',
  },
]

export const routeById = (id: string) => {
  const r = routes.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown route id: ${id}`)
  return r
}

export const domainById = (id: DomainId) => domains.find((d) => d.id === id)!
export const sectionById = (id: string) => sections.find((s) => s.id === id)!
export const routesOfSection = (id: string) => routes.filter((r) => r.section === id)

/** One sidebar entry: either a page or a whole domain section. */
export interface NavItem {
  key: string
  label: string
  to: string
  icon: LucideIcon
  status: RouteStatus
  /** Section items stay active for every page inside the section */
  matchPrefix?: boolean
}

export function navItemsOf(domain: DomainId): NavItem[] {
  const items: NavItem[] = []
  const seen = new Set<string>()
  for (const r of routes) {
    if (r.domain !== domain || r.hidden) continue
    if (r.section) {
      if (seen.has(r.section)) continue
      seen.add(r.section)
      const s = sectionById(r.section)
      items.push({ key: s.id, label: s.label, to: s.basePath, icon: s.icon, status: s.status, matchPrefix: true })
    } else {
      items.push({ key: r.id, label: r.label, to: r.path, icon: r.icon, status: r.status })
    }
  }
  return items
}

/**
 * Sidebar tree (docs/04 §5.1, decision T11): one "data coverage" entry instead of a
 * supply-chain group; domain pages open from it and keep it active.
 */
export type NavNode = { kind: 'route'; route: string; matchPrefix?: string } | { kind: 'group'; key: string; label: string; icon: LucideIcon; children: string[] }

export interface NavSectionDef {
  label: string
  items: NavNode[]
}

export const navTree: NavSectionDef[] = [
  {
    label: 'مرکز کنترل',
    items: [
      { kind: 'route', route: 'overview' },
      // /alerts/CODE keeps «هشدارها» active
      { kind: 'route', route: 'alerts', matchPrefix: '/alerts' },
      { kind: 'route', route: 'supply-coverage', matchPrefix: '/supply-chain' },
      { kind: 'group', key: 'trade', label: 'تحلیل تجارت', icon: ChartNoAxesCombined, children: ['trade-industry', 'trade-routes', 'trade-trends', 'trade-compare'] },
      { kind: 'route', route: 'risk-assessment' },
      // «داده و منابع» and «گراف دانش» removed from the menu by the owner; both stay reachable through search
    ],
  },
  {
    label: 'برنامه‌ریزی و اقدام',
    items: [
      { kind: 'route', route: 'planning-scenarios' },
      { kind: 'route', route: 'planning-forecasting' },
      // «بهینه‌سازی» is off the menu for now (owner); the page stays reachable through search
      // /planning/actions/ACT-… keeps «اقدام‌ها» active
      { kind: 'route', route: 'planning-actions', matchPrefix: '/planning/actions' },
      { kind: 'route', route: 'knowledge-base' },
    ],
  },
]

/** Section and group a route sits under in the sidebar (for breadcrumbs). */
export function navPathOf(routeId: string): { section: string; group?: string } | null {
  for (const s of navTree) {
    for (const n of s.items) {
      if (n.kind === 'route' && n.route === routeId) return { section: s.label }
      if (n.kind === 'group' && n.children.includes(routeId)) return { section: s.label, group: n.label }
    }
  }
  return null
}

/** Route whose path matches the location (section pages included). */
export const routeByPath = (pathname: string) => routes.find((r) => r.path === pathname) ?? null
