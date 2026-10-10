export const LABELS = {
    shop: { customer: 'مشتری', customers: 'مشتریان', product: 'محصول', products: 'محصولات', sale: 'فروش', sales: 'فروش', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'خدمت', appointment: 'سفارش', appointments: 'سفارشات' },
    medical: { customer: 'مراجع', customers: 'مراجعان', product: 'خدمت', products: 'خدمات', sale: 'ویزیت', sales: 'ویزیت‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'مشاوره', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    dental: { customer: 'مراجع', customers: 'مراجعان', product: 'درمان', products: 'درمان‌ها', sale: 'ویزیت', sales: 'ویزیت‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'خدمت جانبی', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    lab: { customer: 'مراجعه‌کننده', customers: 'مراجعه‌کنندگان', product: 'آزمایش', products: 'آزمایش‌ها', sale: 'پذیرش', sales: 'پذیرش‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'نمونه‌گیری', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    salon: { customer: 'مراجع', customers: 'مراجعان', product: 'خدمت', products: 'خدمات', sale: 'نوبت', sales: 'نوبت‌ها', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'خدمت اضافه', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    gym: { customer: 'ورزشکار', customers: 'ورزشکاران', product: 'اشتراک', products: 'اشتراک‌ها', sale: 'ثبت‌نام', sales: 'ثبت‌نام‌ها', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'تمرین', appointment: 'جلسه', appointments: 'جلسات' },
    school: { customer: 'زبان‌آموز', customers: 'زبان‌آموزان', product: 'دوره', products: 'دوره‌ها', sale: 'ثبت‌نام', sales: 'ثبت‌نام‌ها', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'کلاس', appointment: 'جلسه', appointments: 'جلسات' },
    legal: { customer: 'موکل', customers: 'موکلان', product: 'خدمت حقوقی', products: 'خدمات حقوقی', sale: 'پرونده', sales: 'پرونده‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'مشاوره', appointment: 'جلسه', appointments: 'جلسات' },
    realestate: { customer: 'متقاضی', customers: 'متقاضیان', product: 'ملک', products: 'املاک', sale: 'معامله', sales: 'معاملات', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'بازدید', appointment: 'بازدید', appointments: 'بازدیدها' },
    technical: { customer: 'مشتری', customers: 'مشتریان', product: 'خدمت', products: 'خدمات', sale: 'سفارش', sales: 'سفارشات', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'تعمیر', appointment: 'سفارش', appointments: 'سفارشات' },
    general: { customer: 'مخاطب', customers: 'مخاطبین', product: 'آیتم', products: 'آیتم‌ها', sale: 'تعامل', sales: 'تعاملات', invoice: 'سند', invoices: 'اسناد', service: 'خدمت', appointment: 'قرار', appointments: 'قرارها' }
};

export function getLabels(businessType) {
    return LABELS[businessType] || LABELS.shop;
}

// 🎯 فیلدهای تخصصی هر کسب‌وکار
export const BUSINESS_FIELDS = {
    shop: [],
    medical: [
        { key: 'visit_type', label: 'نوع ویزیت', type: 'select', options: ['ویزیت اول', 'ویزیت مجدد', 'مشاوره'] },
        { key: 'sessions', label: 'تعداد جلسه', type: 'number' }
    ],
    dental: [
        { key: 'treatment_type', label: 'نوع درمان', type: 'text', placeholder: 'مثلاً: ترمیم، عصب‌کشی' },
        { key: 'sessions', label: 'تعداد جلسه', type: 'number' }
    ],
    lab: [
        { key: 'test_type', label: 'نوع آزمایش', type: 'text', placeholder: 'مثلاً: CBC، قند خون' },
        { key: 'ready_time', label: 'زمان آماده‌سازی', type: 'text', placeholder: 'مثلاً: ۲۴ ساعت' }
    ],
    salon: [
        { key: 'service_duration', label: 'مدت زمان', type: 'text', placeholder: 'مثلاً: ۱ ساعت' }
    ],
    gym: [
        { key: 'duration', label: 'مدت اشتراک', type: 'select', options: ['۱ ماهه', '۳ ماهه', '۶ ماهه', '۱۲ ماهه'] },
        { key: 'sessions', label: 'تعداد جلسه', type: 'number' }
    ],
    school: [
        { key: 'level', label: 'سطح', type: 'select', options: ['مقدماتی', 'متوسط', 'پیشرفته'] },
        { key: 'sessions', label: 'تعداد جلسه', type: 'number' },
        { key: 'term', label: 'ترم', type: 'text', placeholder: 'مثلاً: پاییز ۱۴۰۵' }
    ],
    legal: [
        { key: 'case_type', label: 'نوع پرونده', type: 'text', placeholder: 'مثلاً: حقوقی، کیفری' },
        { key: 'hours', label: 'تعداد ساعت', type: 'number' }
    ],
    realestate: [
        { key: 'property_type', label: 'نوع ملک', type: 'select', options: ['آپارتمان', 'ویلا', 'زمین', 'مغازه', 'دفتر'] },
        { key: 'area', label: 'متراژ', type: 'number' },
        { key: 'address', label: 'آدرس', type: 'text', placeholder: 'آدرس ملک' }
    ],
    technical: [
        { key: 'device_type', label: 'نوع دستگاه', type: 'text', placeholder: 'مثلاً: یخچال، ماشین لباسشویی' },
        { key: 'warranty', label: 'مدت گارانتی', type: 'text', placeholder: 'مثلاً: ۶ ماه' }
    ],
    general: []
};

export const BUSINESS_TYPES = [
    { value: 'shop', label: '🛍️ فروشگاه', desc: 'فروش محصولات' },
    { value: 'medical', label: '👨‍⚕️ پزشکی', desc: 'مطب و ویزیت' },
    { value: 'dental', label: '🦷 دندانپزشکی', desc: 'درمان دندان' },
    { value: 'lab', label: '🧪 آزمایشگاه', desc: 'خدمات آزمایشگاهی' },
    { value: 'salon', label: '💇 سالن زیبایی', desc: 'آرایشگاه و زیبایی' },
    { value: 'gym', label: '🏋️ باشگاه', desc: 'ورزش و تناسب اندام' },
    { value: 'school', label: '🏫 آموزشگاه', desc: 'آموزش و دوره' },
    { value: 'legal', label: '⚖️ خدمات حقوقی', desc: 'وکالت و مشاوره' },
    { value: 'realestate', label: '🏠 املاک', desc: 'مشاور املاک' },
    { value: 'technical', label: '🔧 خدمات فنی', desc: 'تعمیرات و نصب' },
    { value: 'general', label: '➕ عمومی', desc: 'سایر کسب‌وکارها' }
];
