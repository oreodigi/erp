// Hinglish voice scripts for onboarding, tour, page tips, how-tos and the audio training course.
// Written in Devanagari with everyday English work words (LR, POD, Order Board) left in English,
// so a Hindi (hi-IN) phone voice reads them naturally. One array item = one spoken line + caption.
export type Clip = { id: string; title: string; lines: string[] };

const C = (id: string, title: string, ...lines: string[]): Clip => ({ id, title, lines });

// ---------- welcome, by role ----------
export const WELCOME: Record<string, Clip> = {
  SA: C('welcome:SA', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप पूरे business को एक जगह देख सकते हैं।', 'Home पर आज का काम, हर stage का हिसाब, और कौन सा माल कहाँ अटका है, सब दिखता है।', 'Order Board पर हर consignment एक card है। लाल card मतलब late।', 'चलिए, एक मिनट में पूरा system देखते हैं।'),
  AD: C('welcome:AD', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप system सँभालते हैं — users, roles और master lists, सब Settings में हैं।', 'Home पर दिखता है कि किस branch में काम अटका है।', 'पुरानी सारी screens, Show all screens में मिलेंगी।'),
  OP: C('welcome:OP', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आपका काम है माल को आगे बढ़ाना।', 'New booking से, सिर्फ़ तीन छोटे steps में LR बन जाता है।', 'My Work में दिखेगा — कौन से orders confirm करने हैं, किस LR को truck देना है, और कौन सी delivery late है।', 'Order Board पर हर load दिखता है, और यह भी कि वो कहाँ अटका है।'),
  BU: C('welcome:BU', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप अपनी branch की bookings सँभालते हैं।', 'New booking से तीन steps में LR बनाइए। Customer का नाम लिखते ही बाकी जानकारी पिछली booking से भर जाती है।', 'My Work बताता है कि अगला काम क्या है — सबसे पुराना पहले।', 'और signed POD वापस आते ही, उसे तुरंत record कीजिए।'),
  AC: C('welcome:AC', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप bills और payments सँभालते हैं।', 'My Work में दिखेगा — कौन से LR bill के लिए तैयार हैं, और किसका payment overdue है।', 'एक साथ कई LR का bill बना सकते हैं।', 'Cash plan में देखिए कि आने वाले हफ़्तों में पैसा कितना आएगा और कितना जाएगा।'),
  CC: C('welcome:CC', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप customers को सही जानकारी देते हैं।', 'ऊपर search box में LR number या customer का नाम लिखिए, तुरंत मिल जाएगा।', 'My Work में late deliveries और pending POD दिखते हैं।', 'Order Board पर साफ़ दिखता है कि हर load अभी कहाँ है।'),
  CO: C('welcome:CO', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप trucks सँभालते हैं।', 'Home पर खाली trucks, चल रही trips और due papers दिखते हैं।', 'Truck journeys में देखिए हर truck कहाँ गया, खाली कितना चला, और कितना कमाया।', 'Diesel की entry, Trucks में Diesel and expenses से कीजिए।'),
  SI: C('welcome:SI', 'स्वागत है', 'नमस्ते! SK Translines ERP में आपका स्वागत है।', 'आप workshop चलाते हैं।', 'Truck आते ही job card खोलिए।', 'Job cards और spare purchase की approval, My Work से दीजिए।', 'Spares का stock अपने आप update हो जाता है।'),
};

// ---------- tour steps (keyed by data-tour target) ----------
export const TOUR_AUDIO: Record<string, Clip> = {
  menu: C('tour:menu', 'आपका menu', 'यह आपका menu है।', 'इसमें सिर्फ़ वही screens हैं जो आपके काम की हैं।', 'बाकी सब screens नीचे, Show all screens में हैं।'),
  work: C('tour:work', 'My Work', 'यह है My Work।', 'जो भी काम आपका इंतज़ार कर रहा है, सब यहाँ है — सबसे पुराना सबसे ऊपर।', 'अपना दिन यहीं से शुरू कीजिए।'),
  board: C('tour:board', 'Order Board', 'यह है Order Board।', 'हर consignment अपने stage में एक card की तरह दिखता है।', 'लाल card late है, और card पर लिखा होता है कि क्यों अटका है।'),
  pipeline: C('tour:pipeline', 'माल कहाँ है', 'Home पर भी वही stages दिखते हैं।', 'किसी भी box पर click कीजिए, उस stage के सारे consignments खुल जाएँगे।'),
  create: C('tour:create', 'नया बनाइए', 'यह Create button है।', 'New booking, POD received, trip, job card या bill — सब यहीं से बनता है।'),
  search: C('tour:search', 'Search', 'यह search है।', 'LR number, truck number या customer का नाम लिखिए, सीधे वहीं पहुँच जाएँगे।'),
  lang: C('tour:lang', 'भाषा', 'यहाँ से screen की भाषा बदलिए।', 'English, हिन्दी या मराठी — जो आपको आसान लगे।'),
  guide: C('tour:guide', 'Guide button', 'यह Guide button है। इससे हर page के tips चालू या बंद होते हैं।', 'और question mark वाले button में Help and Training है — वहाँ audio lessons भी हैं।'),
};

// ---------- page tips (keyed by route) ----------
export const PAGE_AUDIO: Record<string, Clip> = {
  dashboard: C('page:dashboard', 'Home', 'यह Home है — आपके दिन का पूरा हाल एक नज़र में।', 'किसी भी number पर click कीजिए, उसके पीछे की list खुल जाएगी।', 'रंगीन boxes stages हैं। लाल का मतलब late।', 'Do these next में आपका सबसे ज़रूरी काम है — दाईं तरफ़ का button दबाइए।'),
  work: C('page:work', 'My Work', 'यह My Work है। जो भी काम आपका इंतज़ार कर रहा है, सब यहाँ है।', 'हर box एक तरह का काम है। पहले लाल वाले, यानी late rows, निपटाइए।', 'Row का button दबाइए, एक छोटा form खुलेगा।', 'POD या billing के लिए एक साथ कई rows tick कर सकते हैं।'),
  board: C('page:board', 'Order Board', 'यह Order Board है। हर order और LR, booking से payment तक, बाएँ से दाएँ।', 'लाल card late हैं, पीले card जल्दी due होने वाले हैं।', 'Card पर लिखा है कि क्यों अटका है, और किसके पास अटका है।', 'Card का button दबाइए, या उसे अगले column में खींचिए।'),
  book: C('page:book', 'New booking', 'यहाँ तीन छोटे steps में LR बनता है।', 'पहले customer का नाम लिखिए और list से चुनिए। बाकी जानकारी पिछली booking से भर जाएगी।', 'फिर goods, pieces और freight check कीजिए।', 'आख़िर में truck चुनिए, या Decide later दबाइए।'),
  'fleet/journeys': C('page:fleet/journeys', 'Truck journeys', 'यहाँ दिखता है कि हमारा हर truck कहाँ गया, भरा हुआ या खाली, और उसने पैसा कमाया या नहीं।', 'ऊपर period चुनिए।', 'Profit, empty km या idle days से sort करके, problem वाले trucks ढूँढिए।', 'किसी truck पर click कीजिए, उसकी हर trip timeline पर दिखेगी।'),
  'fin/cash-plan': C('page:fin/cash-plan', 'Cash plan', 'Cash plan बताता है कि हर हफ़्ते हमारे पास काफ़ी पैसा होगा या नहीं।', 'सबसे पहले Assumptions में आज का cash और bank balance डालिए।', 'Line देखिए। जहाँ लाल है, वहाँ पैसा कम पड़ेगा।', 'Table में किसी भी amount पर click कीजिए, उसके अंदर के bills या payments दिखेंगे।'),
  'admin/time-limits': C('page:admin/time-limits', 'Stage time limits', 'यहाँ तय कीजिए कि कोई consignment किसी stage में कितनी देर रुक सकता है।', 'उसके बाद वो late, यानी लाल दिखेगा।', 'Hours या days बदलिए, नीचे दिखेगा कि कितने late होंगे। फिर Save दबाइए।'),
  'ops/lr': C('page:ops/lr', 'All LRs', 'यहाँ हर LR और उसका अभी का stage है।', 'Search box में LR number, customer या truck लिखिए।', 'किसी LR पर click कीजिए, उसकी पूरी कहानी खुल जाएगी।'),
  'ops/lr-new': C('page:ops/lr-new', 'Full LR form', 'यह पूरा LR form है, पुराने system के सारे fields के साथ।', 'रोज़ की booking के लिए New booking ज़्यादा जल्दी है।'),
  'ops/orders': C('page:ops/orders', 'Customer orders', 'Customer का फ़ोन आए, तो यहाँ order लिखिए।', 'Branch manager उसे confirm करता है, फिर Make LR दबाइए।'),
  'ops/pod': C('page:ops/pod', 'POD received', 'यहाँ signed delivery copy, यानी POD, record होती है।', 'LR चुनिए, मिले हुए और damage pieces डालिए, और Save कीजिए।', 'POD के बिना bill नहीं बनता।'),
  'ops/dc': C('page:ops/dc', 'Delivery challans', 'Rail branch से customer तक आख़िरी delivery के trucks यहाँ हैं।', 'Rake और LRs चुनिए, transporter का truck और freight डालिए।'),
  'ops/grn': C('page:ops/grn', 'Goods in at rail head', 'Jalgaon rail head पर आया हुआ माल यहाँ GRN में चढ़ता है।', 'LR चुनिए, pieces गिनिए, damage हो तो लिखिए, और Save कीजिए।'),
  'rail/rakes': C('page:rail/rakes', 'Rakes', 'यहाँ हर rake है — planning से लेकर destination तक।', 'Rake खोलिए, wagons में loading और dispatch वहीं से होता है।'),
  'fleet/trucks': C('page:fleet/trucks', 'Our trucks', 'यहाँ अपने और market के सारे trucks हैं।', 'हर truck का status, location और papers की due date दिखती है।'),
  'fleet/trips': C('page:fleet/trips', 'Trips', 'हमारे truck की हर trip यहाँ है।', 'Trip ख़त्म हो, तो closing km डालकर उसे बंद कीजिए।'),
  'fleet/fuel': C('page:fleet/fuel', 'Diesel and expenses', 'Diesel, toll, bhatta जैसे trip के ख़र्चे यहाँ लिखे जाते हैं।', 'Truck और trip चुनिए, amount डालिए और Save कीजिए।'),
  'fin/billing': C('page:fin/billing', 'Make bills', 'Delivered LRs को यहाँ customer के bill में बदलिए।', 'Customer चुनिए, LRs tick कीजिए, GST check कीजिए और bill बनाइए।'),
  'fin/receivables': C('page:fin/receivables', 'Payments to collect', 'यहाँ दिखता है कि किस customer से कितना पैसा लेना है, और कितने दिन से बाकी है।', 'सबसे बड़े और सबसे पुराने बाकी पैसे पहले follow up कीजिए।'),
  'fin/client-payments': C('page:fin/client-payments', 'Payment received', 'Customer का payment आए, तो यहाँ record कीजिए।', 'Amount और TDS डालिए, bill अपने आप update हो जाएगा।'),
  'fin/tp-slips': C('page:fin/tp-slips', 'Pay transporters', 'Market truck वालों का payment यहाँ बनता है।', 'Slip approve होने के बाद payment कीजिए।'),
  'ws/jobcards': C('page:ws/jobcards', 'Job cards', 'Truck की repair और service का काम यहाँ job card में लिखा जाता है।', 'Stock से parts और बाहर की service जोड़िए। Approval के बाद finalise कीजिए।'),
  'cust/360': C('page:cust/360', 'Customers', 'यहाँ हर customer की पूरी जानकारी है — consignments, कमाई और बाकी पैसा।', 'Customer खोलिए, उसका पूरा हिसाब एक जगह दिखेगा।'),
  reports: C('page:reports', 'Reports', 'Operations, fleet और accounts की तैयार reports यहाँ हैं।', 'Report खोलिए, dates चुनिए, और ज़रूरत हो तो Excel में download कीजिए।'),
  masters: C('page:masters', 'Master lists', 'Customers, cities, goods जैसी lists यहाँ हैं, जो हर जगह काम आती हैं।', 'नई entry जोड़ने से पहले search करके देख लीजिए कि पहले से है या नहीं।'),
};

// ---------- how-tos (keyed by title) ----------
export const HOWTO_AUDIO: Record<string, Clip> = {
  'Book a truck (make an LR)': C('howto:book', 'Truck book कैसे करें', 'Create दबाइए, फिर New booking।', 'Customer का नाम लिखिए — बाकी जानकारी पिछली booking से भर जाएगी।', 'Goods, pieces और freight check कीजिए, फिर truck चुनिए।', 'Book and send truck दबाइए, और LR print कीजिए।'),
  'Record a POD': C('howto:pod', 'POD कैसे record करें', 'My Work खोलिए, फिर Collect POD copies।', 'LR पर POD received दबाइए। एक साथ कई LR भी tick कर सकते हैं।', 'Date और damage pieces, अगर हों, डालिए। Save कीजिए।'),
  'Make a bill': C('howto:bill', 'Bill कैसे बनाएँ', 'My Work में Make bills खोलिए, या Order Board पर Ready to bill देखिए।', 'एक customer के LRs tick कीजिए।', 'GST check कीजिए और Generate bill दबाइए।'),
  'Record a payment from a customer': C('howto:pay', 'Payment कैसे record करें', 'My Work में Follow up on overdue payments खोलिए।', 'Bill पर Payment received दबाइए।', 'Amount और TDS डालिए, और Save कीजिए।'),
  'Find what is stuck': C('howto:stuck', 'अटका हुआ माल कैसे ढूँढें', 'Order Board खोलिए।', 'Late only दबाइए, या लाल banner पर Show only these।', 'हर लाल card बताता है कि क्यों अटका है, और किसे काम करना है।'),
  'Send goods by rail': C('howto:rail', 'Rail से माल कैसे भेजें', 'New booking में Rail और destination branch चुनिए।', 'Jalgaon rail head पर माल आए, तो GRN कीजिए।', 'Rake में wagons load कीजिए, dispatch कीजिए, फिर destination पर delivery challan बनाइए।'),
  'Close a truck trip': C('howto:trip', 'Trip कैसे बंद करें', 'My Work में Close finished trips खोलिए।', 'Closing date और km डालिए।', 'उसके बाद log slip और diesel का हिसाब होता है।'),
  'Repair a truck (job card)': C('howto:jobcard', 'Truck repair — job card', 'Create दबाइए, फिर Job card।', 'Stock से parts और बाहर की service जोड़िए।', 'Approval के बाद, truck निकलते समय finalise कीजिए।'),
  'See where a truck went and if it made money': C('howto:journeys', 'Truck ने कितना कमाया', 'Trucks में Truck journeys खोलिए।', 'Profit या Empty km से sort कीजिए।', 'किसी truck पर click कीजिए — हर trip, diesel और freight timeline पर दिखेगा।'),
  'Check if we will have enough cash': C('howto:cash', 'पैसा काफ़ी होगा या नहीं', 'Money में Cash plan खोलिए।', 'आज का cash और bank balance डालिए।', 'लाल हफ़्तों में action चाहिए — सबसे बड़े overdue customers से पहले बात कीजिए।'),
  'Change when a consignment counts as late': C('howto:limits', 'Late की limit कैसे बदलें', 'Settings में Stage time limits खोलिए।', 'किसी stage के hours या days बदलिए।', 'नया late count देखिए, और Save दबाइए।'),
  'Find any LR, truck or customer': C('howto:search', 'कुछ भी कैसे ढूँढें', 'ऊपर search box दबाइए।', 'कुछ अक्षर या number लिखिए।', 'Result चुनिए, वो खुल जाएगा।'),
};

// ---------- audio training course (Help & Training) ----------
export type Lesson = Clip & { minutes: number; go?: string };
const L = (id: string, title: string, go: string | undefined, ...lines: string[]): Lesson => ({ id, title, lines, minutes: Math.max(1, Math.round(lines.join(' ').length / 260)), go });
export const LESSONS: Lesson[] = [
  L('lesson:1', 'ERP से पहली मुलाक़ात', 'dashboard',
    'नमस्ते! इस छोटे से course में हम SK Translines ERP चलाना सीखेंगे।', 'हर lesson एक-दो मिनट का है। आप कभी भी रोक सकते हैं, और बाद में वहीं से सुन सकते हैं।',
    'Screen पर बाईं तरफ़ menu है। Phone पर नीचे buttons हैं — Home, My Work, बीच में लाल plus वाला Create, Board और Menu।',
    'ऊपर search box है। उसमें LR number, truck number या customer का नाम लिखिए, सीधे वहीं पहुँच जाएँगे।',
    'Language button से screen को हिन्दी या मराठी में कर सकते हैं।', 'और Guide button से हर page पर छोटे tips दिखते हैं। शुरू के दिनों में इसे चालू रखिए।'),
  L('lesson:2', 'My Work — आज का काम', 'work',
    'हर दिन की शुरुआत My Work से कीजिए।', 'यहाँ वही काम दिखता है जो आपके role का है — जैसे orders confirm करना, POD लेना, bill बनाना।',
    'हर box एक तरह का काम है, और सबसे पुराना काम सबसे ऊपर है।', 'लाल rows late हैं। इन्हें सबसे पहले निपटाइए।',
    'Row के दाईं तरफ़ का button दबाइए। एक छोटा सा form खुलेगा, ज़्यादातर चीज़ें पहले से भरी होंगी। बस check कीजिए और Save।',
    'जैसे-जैसे काम होता जाएगा, list छोटी होती जाएगी। दिन के आख़िर में list जितनी छोटी, उतना अच्छा।'),
  L('lesson:3', 'Order Board — माल कहाँ है', 'board',
    'Order Board पर हर order और LR एक card है।', 'Cards बाएँ से दाएँ चलते हैं — Booked, Vehicle, Moving, POD, To bill, Billed, और आख़िर में Paid।',
    'लाल card late है। पीला card जल्दी late होने वाला है।', 'हर card पर लिखा है कि वो क्यों अटका है — जैसे POD नहीं आया, या truck नहीं लगा — और किसके पास अटका है।',
    'Card का button दबाकर अगला step वहीं कर सकते हैं।', 'ऊपर Late only दबाइए, सिर्फ़ अटके हुए cards दिखेंगे।'),
  L('lesson:4', 'New booking — तीन steps में LR', 'book',
    'अब LR बनाना सीखते हैं। Create दबाइए, फिर New booking।', 'पहला step: customer का नाम लिखना शुरू कीजिए और list से चुनिए। Destination और receiver, पिछली booking से अपने आप भर जाते हैं।',
    'दूसरा step: goods और pieces check कीजिए। Freight भी suggest होता है — पिछली बार इसी route पर जितना था। Rate अलग हो, तो बदल दीजिए।',
    'तीसरा step: truck चुनिए। अपना truck, market truck, या Decide later।', 'Book and send truck दबाइए। LR बन गया। वहीं से LR print भी कर सकते हैं।'),
  L('lesson:5', 'POD और bill', 'work',
    'माल पहुँचने के बाद signed copy, यानी POD, वापस आती है।', 'POD आते ही My Work में Collect POD copies खोलिए और POD received दबाइए। एक साथ कई LR tick कर सकते हैं।',
    'POD के बिना bill नहीं बनता। इसलिए POD जल्दी record करना बहुत ज़रूरी है।', 'Accounts वाले My Work में Make bills खोलते हैं, एक customer के LRs tick करते हैं, GST check करते हैं, और Generate bill दबाते हैं।'),
  L('lesson:6', 'Payment और cash plan', 'fin/cash-plan',
    'Customer का payment आए, तो My Work में bill पर Payment received दबाइए। Amount और TDS डालिए।',
    'Money में Cash plan है। यहाँ दिखता है कि आने वाले हफ़्तों में कितना पैसा आएगा, और कितना जाएगा।', 'जिस हफ़्ते पैसा कम पड़ने वाला है, वो लाल दिखता है। उस हफ़्ते से पहले बड़े customers से payment की बात कीजिए।'),
  L('lesson:7', 'Trucks और journeys', 'fleet/journeys',
    'Trucks menu में Truck journeys खोलिए।', 'हर truck के लिए दिखता है — कितनी trips, कितने km, कितना खाली चला, diesel कितना लगा, और profit कितना हुआ।',
    'Empty lanes वाली list बताती है कि कौन से route पर truck खाली लौटते हैं। वहाँ return load ढूँढिए, तो trip दोगुना कमाएगी।', 'Trip ख़त्म होते ही closing km डालकर trip बंद कीजिए, ताकि हिसाब सही रहे।'),
  L('lesson:8', 'मदद कहाँ मिलेगी', 'help',
    'कुछ समझ न आए, तो question mark वाला button दबाइए। वहाँ Help and Training है।', 'How do I में हर काम के steps लिखे हैं, और Do it now दबाकर सीधे उस screen पर जा सकते हैं।',
    'हर tip के पास सुनिए वाला button है — दबाइए, और हिन्दी में सुनिए।', 'Practice mode में sample data पर बेझिझक सीखिए, असली data पर कोई असर नहीं होगा।', 'बस! अब आप तैयार हैं। All the best!'),
];
