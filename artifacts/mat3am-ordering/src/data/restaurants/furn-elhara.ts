import type { Restaurant } from '../types';

const photo = '/hero-grill.jpg';
const item = (id: string, name: string, description: string, price: number, category: string, badge?: string, popular = false, spicy = false) => ({
  id, name, description, price, category,
  image: category === 'grills' ? '/menu-grills.jpg' : category === 'burgers' ? '/menu-burgers.jpg' : category === 'sandwiches' ? '/menu-sandwiches.jpg' : category === 'sides' ? '/menu-sides.jpg' : photo,
  badge, popular, spicy,
  ...(id === 'mix-grill' ? { sizes: [{ name: 'فردي', price: 0 }, { name: 'كبير يكفي اتنين', price: 130 }], extras: [{ name: 'طحينة زيادة', price: 12 }, { name: 'عيش بلدي', price: 8 }, { name: 'أرز بسمتي', price: 35 }] } : {}),
  ...(id === 'classic-burger' ? { sizes: [{ name: 'سنجل', price: 0 }, { name: 'دبل', price: 48 }], extras: [{ name: 'شريحة شيدر', price: 15 }, { name: 'هالبينو', price: 10 }, { name: 'بطاطس جوا البرجر', price: 18 }] } : {}),
  ...(id === 'chicken-grill' ? { extras: [{ name: 'طحينة زيادة', price: 12 }, { name: 'أرز بسمتي', price: 35 }, { name: 'سلطة بلدي', price: 30 }] } : {}),
});

const furnElhara: Restaurant = {
  slug: 'furn-elhara',
  name: 'فرن الحارة',
  logoText: 'فرن الحارة',
  tagline: 'ريحة الفحم بتسبقنا لبابك',
  description: 'مشويات على أصولها، عيش بيتحمّر وقت الطلب، وتتبيلة معمولة في مطبخنا كل يوم.',
  whatsappNumber: '201000000000',
  phone: '+201000000000',
  address: 'شارع التسعين، التجمع الخامس، القاهرة',
  mapsLink: 'https://maps.google.com/?q=New+Cairo+Egypt',
  workingHours: [
    { day: 'السبت', open: '12:00', close: '00:30' }, { day: 'الأحد', open: '12:00', close: '00:30' },
    { day: 'الإثنين', open: '12:00', close: '00:30' }, { day: 'الثلاثاء', open: '12:00', close: '00:30' },
    { day: 'الأربعاء', open: '12:00', close: '00:30' }, { day: 'الخميس', open: '12:00', close: '01:00' },
    { day: 'الجمعة', open: '13:00', close: '01:00' },
  ],
  deliveryZones: [
    { name: 'التجمع الخامس', fee: 20, minOrder: 150 }, { name: 'الرحاب', fee: 35, minOrder: 200 },
    { name: 'مدينتي', fee: 45, minOrder: 250 }, { name: 'الشروق', fee: 55, minOrder: 300 },
  ],
  estimatedDeliveryMinutes: 35,
  categories: [
    { id: 'grills', name: 'مشويات الفحم' }, { id: 'sandwiches', name: 'سندوتشات' },
    { id: 'burgers', name: 'برجر فرن الحارة' }, { id: 'combos', name: 'وجبات كومبو' },
    { id: 'sides', name: 'إضافات وسلطات' }, { id: 'drinks', name: 'مشروبات' },
  ],
  menu: [
    item('mix-grill', 'مشكل فرن الحارة', 'كفتة وكباب وفراخ مشوية، ومعاهم طحينة وعيش سخن.', 285, 'grills', 'الأكتر طلباً', true),
    item('kofta', 'كفتة على الفحم', 'كفتة بلدي متبّلة بخلطة البيت ومتحمّرة على الفحم.', 175, 'grills', 'الأكتر طلباً', true),
    item('kebab', 'كباب ضاني', 'قطع ضاني طرية بتتبيلة بسيطة وطعم الفحم واضح.', 265, 'grills', undefined, true),
    item('chicken-grill', 'نصف فرخة مشوية', 'فراخ متبّلة بخلطة البيت ومتحمّرة على نار هادية.', 185, 'grills', 'جديد'),
    item('shish', 'شيش طاووق', 'مكعبات فراخ طرية بزبادي وليمون وتتبيلة بيتية.', 165, 'grills'),
    item('grill-sausage', 'سجق شرقي', 'سجق إسكندراني مع فلفل وطماطم على الفحم.', 155, 'grills', undefined, false, true),
    item('kofta-sandwich', 'سندوتش كفتة بلدي', 'كفتة مشوية، طحينة، بقدونس ومخلل في عيش بلدي.', 92, 'sandwiches', 'الأكتر طلباً', true),
    item('liver-sandwich', 'سندوتش كبدة إسكندراني', 'كبدة متشوّحة بكمون وفلفل وليمون.', 78, 'sandwiches', undefined, true, true),
    item('hawawshi', 'حواوشي فرن الحارة', 'رغيف بلدي محشي لحمة متبّلة ومقرمش من برّه.', 95, 'sandwiches', 'جديد'),
    item('shish-sandwich', 'سندوتش شيش طاووق', 'شيش طاووق مع ثومية وخس في عيش محمّص.', 88, 'sandwiches'),
    item('classic-burger', 'برجر الحارة', 'قطعة لحم بقري، جبنة شيدر، صوص البيت وخس.', 155, 'burgers', 'الأكتر طلباً', true),
    item('smash-burger', 'دبل سماش', 'قطعتين سماش رفيعين، شيدر سايح وبصل مكرمل.', 195, 'burgers', 'جديد', true),
    item('chicken-burger', 'برجر فراخ مقرمش', 'فراخ كرسبي، كول سلو وصوص حار في عيش بريوش.', 145, 'burgers', undefined, false, true),
    item('mushroom-burger', 'برجر مشروم', 'لحم بقري، مشروم سوتيه، شيدر وصوص فلفل أسود.', 185, 'burgers'),
    item('kofta-meal', 'وجبة كفتة', 'كفتة الفحم مع أرز بسمتي وسلطة بلدي وطحينة.', 215, 'combos'),
    item('burger-meal', 'كومبو برجر الحارة', 'برجر الحارة وبطاطس محمرة ومشروب من اختيارك.', 205, 'combos', 'وفّر ٣٥ ج.م', true),
    item('family-combo', 'لمة العيلة', 'مشكل كبير، ٤ أرز، سلطة وطحينة وعيش بلدي.', 695, 'combos', 'وفّر ٨٠ ج.م'),
    item('fries', 'بطاطس فرن', 'بطاطس متبّلة ومقرمشة، بتطلع سخنة مع كل طلب.', 45, 'sides'),
    item('tahini', 'طحينة بيتي', 'طحينة ناعمة بليمون وكمون، معمولة عندنا.', 25, 'sides'),
    item('salad', 'سلطة بلدي', 'طماطم وخيار وبصل وبقدونس بليمون طازة.', 35, 'sides'),
    item('rice', 'أرز بسمتي', 'أرز مفلفل بخلطة بهارات خفيفة.', 40, 'sides'),
    item('cola', 'كولا', 'كانز ساقعة ٣٣٠ مل.', 25, 'drinks'),
    item('mango', 'عصير مانجا', 'مانجا صافي بطعم الصيف، ٣٠٠ مل.', 40, 'drinks'),
    item('water', 'مياه معدنية', 'زجاجة مياه ٦٠٠ مل.', 15, 'drinks'),
  ],
  combos: [
    { id: 'combo-duo', name: 'قعدة اتنين', description: '٢ برجر حارة + بطاطس كبيرة + ٢ مشروب', items: ['برجر الحارة × ٢', 'بطاطس كبيرة', 'مشروبين'], price: 365, saving: 40, image: photo },
    { id: 'combo-grill', name: 'سفرة المشويات', description: 'مشكل فرن الحارة + كفتة + ٢ أرز + طحينة', items: ['مشكل فرن الحارة', 'كفتة على الفحم', '٢ أرز بسمتي', 'طحينة بيتي'], price: 510, saving: 55, image: photo },
  ],
  reviews: [
    { name: 'مريم عادل', rating: 5, text: 'الكفتة طعمها فحم بجد والعيش وصل لسه سخن. هطلب تاني أكيد.' },
    { name: 'كريم السيد', rating: 5, text: 'البرجر متظبط والبطاطس مقرمشة، والتوصيل كان أسرع من المتوقع.' },
    { name: 'نورهان أحمد', rating: 5, text: 'طلبنا لمة العيلة وكل حاجة وصلت مظبوطة والتتبيلة حكاية.' },
  ],
  ordersDelivered: 1284,
  offerBanner: { text: 'عرض النهاردة: بطاطس ومشروب بـ ٣٠ ج.م مع طلبك', endsAt: '2026-10-22T23:59:00+02:00' },
  socialLinks: { instagram: 'https://www.instagram.com/furn.elhara/', facebook: 'https://www.facebook.com/furn.elhara/' },
  theme: { primary: '#d9aa53', accent: '#f0c56c' },
};

export default furnElhara;
