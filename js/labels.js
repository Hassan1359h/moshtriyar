export const LABELS = {
    shop: { customer: 'مشتری', customers: 'مشتریان', product: 'محصول', products: 'محصولات', sale: 'فروش', sales: 'فروش', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'خدمت', appointment: 'سفارش', appointments: 'سفارشات' },
    medical: { customer: 'مراجع', customers: 'مراجعان', product: 'خدمت', products: 'خدمات', sale: 'ویزیت', sales: 'ویزیت‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'مشاوره', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    dental: { customer: 'مراجع', customers: 'مراجعان', product: 'درمان', products: 'درمان‌ها', sale: 'ویزیت', sales: 'ویزیت‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'خدمت جانبی', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    lab: { customer: 'مراجعه‌کننده', customers: 'مراجعه‌کنندگان', product: 'آزمایش', products: 'آزمایش‌ها', sale: 'پذیرش', sales: 'پذیرش‌ها', invoice: 'صورتحساب', invoices: 'صورتحساب‌ها', service: 'نمونه‌گیری', appointment: 'نوبت', appointments: 'نوبت‌ها' },
    salon: { customer: 'مراجع', customers: 'مراجعان', product: 'خدمت', products: 'خدمات', sale: 'نوبت', sales: 'نوبت‌ها', invoice: 'فاکتور', invoices: 'فاکتورها', service: 'خدمت جانبی', appointment: 'نوبت', appointments: 'نوبت‌ها' },
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
