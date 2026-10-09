// Training Academy content – Getting Started (everyone), Your Role (one lesson per role code) and
// Your Daily Work (one routine per role code).
// Facts are taken from nav.ts (NAV, ROLE_GROUPS, SIMPLE_NAV), components/AppShell.tsx, features/home.tsx,
// features/work.tsx, features/board.tsx, features/guide.tsx, store/store.ts and training/config.ts.
// Role menus below = the NAV groups listed for that code in ROLE_GROUPS. Daily-lesson screens use only routes
// inside those groups.
import type { Lesson } from '../types';

// ---------------------------------------------------------------------------------------------------------------
// A) Getting Started – for everyone
// ---------------------------------------------------------------------------------------------------------------
const start: Lesson[] = [
  {
    id: 'ls.start.welcome',
    title: 'Welcome to SK Translines ERP',
    module: 'home',
    kind: 'getting-started',
    screens: ['dashboard', 'access/password', 'help'],
    summary: 'What the ERP is, how to sign in, why you must change your temporary password, and who to ask for help.',
    sections: [
      {
        heading: 'What is SK Translines ERP?',
        body: 'It is the one system where SK Translines records all its work. Every booking, LR, rake, truck trip, repair, bill and payment is entered here. Everyone works on the same shared company data, so what you save is seen by your colleagues at once.',
        bullets: [
          'Operations: orders, LRs, dispatch, delivery and POD.',
          'Rail: GRN at the rail head, rakes, DGRN and delivery challans.',
          'Fleet and workshop: our trucks, trips, diesel, job cards and spares.',
          'Finance: bills, payments, transporter payments, ledger and Tally.',
        ],
      },
      {
        heading: 'Signing in',
        body: 'Your administrator creates your login and gives you a username and a temporary password. Type both on the sign-in page. To leave, click your name at the top right and press Sign out.',
        bullets: [
          'After 5 wrong passwords, sign-in is blocked for 15 minutes ("Try again later").',
          'Never share your login. Everything you save is recorded under your name.',
        ],
      },
      {
        heading: 'Change your temporary password',
        body: 'The temporary password is only for the first sign-in. Change it at once in Users & Access › Change Password. Type the old password, a new password and the new password again, then press Save.',
        bullets: [
          'New password: at least 12 characters, with letters and numbers, plus a capital letter or a symbol.',
          'If Users & Access is not in your menu, ask your administrator to help you change it.',
        ],
      },
      {
        heading: 'Who to ask for help',
        body: 'Start with this Training Academy (the ? button at the top). For a work question, ask your branch manager or senior. For a login, password or missing screen, ask your administrator (Admin or Super Admin).',
        bullets: [
          'You can also ask in Team Chat. Choose "Employee enquiry" when you start the conversation.',
          'Never send a password in chat.',
        ],
      },
    ],
    audio: [
      'नमस्ते! SK Translines ERP में आपका स्वागत है।',
      'यह एक ही system है जिसमें booking से लेकर bill और payment तक, सारा काम record होता है।',
      'Administrator आपको username और temporary password देंगे। उसी से पहली बार login कीजिए।',
      'Login के बाद तुरंत Change Password में जाकर अपना नया password बनाइए — कम से कम बारह characters का।',
      'अपना login किसी और को मत दीजिए, क्योंकि हर entry आपके नाम से save होती है।',
      'कुछ समझ न आए तो ऊपर का ? button दबाइए, या अपने manager या administrator से पूछिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.start.navigation',
    title: 'Finding your way: menu, search, Create and language',
    module: 'home',
    kind: 'getting-started',
    screens: ['dashboard', 'work', 'board', 'book'],
    prerequisites: ['ls.start.welcome'],
    summary: 'How the left menu works, the simple menu and "Show all screens", the top bar buttons, the phone bottom bar and how to change the language.',
    sections: [
      {
        heading: 'The left menu',
        body: 'On a computer the menu is on the left. It shows only the menu groups of your role, for example Operations, Rail & Rake or Finance. Click a group to open it, then click a screen.',
        bullets: [
          'Simple menu: plain names and everyday screens only – Home, My Work, Order Board, Bookings, Rail, Trucks, Money, Workshop, Customers, Reports, Settings.',
          'Press "Show all screens" at the bottom of the menu to see every screen of your role. Press "Back to simple menu" to return.',
          'Type in "Search menu..." at the top of the menu to find a screen by name. Press Enter to open the first result.',
          '"Collapse" at the bottom makes the menu narrow; click it again to expand.',
        ],
      },
      {
        heading: 'The top bar',
        body: 'At the top, the breadcrumb shows where you are, like "Operations / Orders". On the right are the buttons you use every day.',
        bullets: [
          'Search box (Ctrl K): find an LR, truck, customer or screen.',
          'Create: New booking, Customer order, POD received, Start a trip, Job card, Make bill.',
          'Guide on / off: shows or hides the yellow tips on screens.',
          'Language button: English, हिन्दी or मराठी.',
          '? button: opens Help & Training. The bell shows notifications. Your name opens Sign out.',
        ],
      },
      {
        heading: 'On a phone',
        body: 'On a phone there is a bar at the bottom: Home, My Work, Create (the big + button), Board and Menu. Menu opens the full menu. The language button and "Show all screens" are at the bottom of that menu.',
      },
      {
        heading: 'If a screen is missing',
        body: 'Your role decides your menu. If you open a screen outside your role, you see "You don\'t have access to this module". Ask your administrator if you really need it for your job.',
      },
    ],
    audio: [
      'बाईं तरफ़ menu है। इसमें सिर्फ़ वही groups दिखते हैं जो आपके role के लिए हैं।',
      'Simple menu में रोज़ के काम की screens हैं। बाकी सब देखने के लिए नीचे Show all screens दबाइए।',
      'Menu के ऊपर search box में screen का नाम लिखिए, वो सीधे मिल जाएगी।',
      'ऊपर Create button से नई booking, POD, trip, job card या bill जल्दी बनता है।',
      'Language button से screen को Hindi या Marathi में बदल सकते हैं।',
      'Phone पर नीचे की पट्टी में Home, My Work, Create, Board और Menu हैं।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.start.home',
    title: 'Your Home page',
    module: 'home',
    kind: 'getting-started',
    screens: ['dashboard', 'board', 'work'],
    prerequisites: ['ls.start.navigation'],
    summary: 'Home shows today in four numbers, where every consignment is right now, and the next jobs for your role.',
    sections: [
      {
        heading: 'Four numbers for today',
        body: 'The four tiles at the top change with your role. Operations sees Booked today, On the way, Delivered today and POD pending. Accounts sees Ready to bill, Billed this month, Collected this month and Overdue. Fleet and workshop see Free trucks, On trip, In workshop and Papers due.',
        bullets: ['Click any tile to open the list behind the number.'],
      },
      {
        heading: 'Where every consignment is right now',
        body: 'Seven boxes show the stages from Booked to Paid. A red number means some consignments in that stage are late against the stage time limit. Click a box to open the Order Board on that stage.',
        bullets: ['The "Biggest blockage" bar names the stage holding most late work. "Fix these" opens those cards.'],
      },
      {
        heading: 'Do these next',
        body: 'This list shows your most urgent types of work, oldest first. The button on the right does the job for the first item. "All my work" opens My Work.',
      },
      {
        heading: 'Change the layout',
        body: 'Press "Customize" to move panels up or down or make them wider. "Reset dashboard" brings back the normal layout. Admins can also switch the view between Owner, Operations, Accounts and Fleet.',
      },
    ],
    audio: [
      'Home आपके दिन का पूरा हाल एक नज़र में दिखाता है।',
      'ऊपर के चार numbers आपके role के हिसाब से होते हैं। किसी पर भी click कीजिए, पूरी list खुल जाएगी।',
      'बीच के सात boxes बताते हैं कि हर consignment किस stage में है। लाल number मतलब late।',
      'Do these next में आपका सबसे ज़रूरी काम है। दाईं तरफ़ का button दबाकर वहीं से काम कीजिए।',
      'Customize दबाकर panels आगे-पीछे कर सकते हैं, और Reset dashboard से पहले जैसा हो जाता है।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.start.my-work',
    title: 'My Work: your task list',
    module: 'home',
    kind: 'getting-started',
    screens: ['work', 'board'],
    prerequisites: ['ls.start.home'],
    summary: 'My Work collects everything waiting on you, grouped by type of job, oldest first, with an action button on every row.',
    sections: [
      {
        heading: 'What you see',
        body: 'Each box is one type of job, for example Confirm customer orders, Assign a truck, Collect POD copies, Make bills or Approve job cards. Inside a box, the oldest item is on top.',
        bullets: [
          'A red age means the item is already past its stage time limit. Clear red rows first.',
          '"My tasks" shows your role\'s jobs. "Everyone" shows all jobs. Admins always see everyone\'s work.',
        ],
      },
      {
        heading: 'Doing the job',
        body: 'Press the button on a row. A small form opens with sensible values filled in. Check it and save. Some buttons act at once.',
        bullets: [
          '"Approve" on a transporter payment slip, job card or purchase order approves immediately. There is no second question.',
        ],
      },
      {
        heading: 'Many at once',
        body: 'In Collect POD copies and Make bills you can tick several rows and press "POD for n" or "Bill n".',
        bullets: ['Bulk POD marks all goods as received in full. If a load has damage, record its POD alone on the POD screen.'],
      },
      {
        heading: 'Order Board',
        body: 'The Order Board shows the same work as cards in stage columns, from Booked to Paid. A red card is late and says why and who it is waiting on. Press the card button, or drag it one column to the right.',
      },
    ],
    audio: [
      'My Work आपकी task list है। जो भी काम आपका इंतज़ार कर रहा है, सब यहाँ है।',
      'हर box एक तरह का काम है, और सबसे पुराना काम सबसे ऊपर होता है।',
      'लाल rows late हैं, इसलिए दिन की शुरुआत उन्हीं से कीजिए।',
      'Row का button दबाइए, छोटा form खुलेगा। Approve वाला button तुरंत approve कर देता है, ध्यान से दबाइए।',
      'POD या bill के लिए कई rows एक साथ tick कर सकते हैं। पर damage वाला POD अलग से भरिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.start.search-notifications',
    title: 'Search, notifications and Team Chat',
    module: 'home',
    kind: 'getting-started',
    screens: ['dashboard', 'communication', 'communication/tasks'],
    prerequisites: ['ls.start.navigation'],
    summary: 'Find any LR, truck or customer in seconds, read your notifications, and talk to colleagues inside the ERP.',
    sections: [
      {
        heading: 'Search anything (Ctrl K)',
        body: 'Click the search box at the top ("Search LR, truck, customer…") or press Ctrl and K together. Type a few letters or digits. Use the arrow keys and Enter, or click a result. Esc closes it.',
        bullets: [
          'Records it finds: LRs, orders, customers, trucks, rakes, bills, delivery challans, job cards, trips and purchase orders.',
          'It also finds screens by name, and quick actions like New Order, Generate LR, Start Trip or Record client payment.',
          'On a phone, use the search icon at the top.',
        ],
      },
      {
        heading: 'Notifications',
        body: 'The bell at the top right shows a number when you have unread notifications. Click one to open the screen it is about; it is then marked read. "Mark all read" clears the number.',
      },
      {
        heading: 'Team Chat',
        body: 'Use Team Chat (Communication › Team Chat) for work talk instead of WhatsApp. Start a Team discussion, a Direct message or an Employee enquiry. Add the ERP reference, like the LR number, so the reader knows what you mean.',
        bullets: [
          'The "Chat" tab on the right edge of every screen opens a small chat window.',
          'If someone must do a job, assign a task. It appears in Assigned Tasks.',
          'Messages refresh every few seconds. Administrators can read every conversation.',
        ],
      },
    ],
    audio: [
      'कोई भी LR, truck या customer ढूँढना हो तो ऊपर search box में लिखिए, या Ctrl K दबाइए।',
      'LR number के कुछ अंक लिखते ही result आ जाता है। Enter दबाइए, record खुल जाएगा।',
      'घंटी पर number का मतलब है नए notifications। उस पर click कीजिए, सीधे सही screen खुलेगी।',
      'काम की बात Team Chat में कीजिए, और message के साथ LR number ज़रूर जोड़िए।',
      'किसी को काम देना है तो chat से task assign कीजिए, ताकि वो भूल न जाए।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.start.practice-mode',
    title: 'Practice mode: learn without touching real records',
    module: 'home',
    kind: 'getting-started',
    screens: ['help', 'board', 'book'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Practice mode loads sample data that lives only in your browser. Nothing you do there is saved to the company data.',
    sections: [
      {
        heading: 'What practice data is',
        body: 'Practice data is a set of sample customers, LRs, trucks, rakes and bills. It is kept only in this browser on this device. It is never saved to the shared company data, and real records are not changed.',
        bullets: [
          'Your colleagues do not see your practice work.',
          'Practice records never appear in real reports.',
        ],
      },
      {
        heading: 'Start, stop and reset',
        body: 'Open Help & Training (the ? button). In the Practice mode card press "Start practising". The whole ERP now shows practice data. When you finish, press "Back to real data" in the same card.',
        bullets: [
          'The card tells you which data you are on: "You are on practice data" or "You are on real SK data".',
          'If your practice data gets messy, reset it from the Training Academy to get fresh sample data.',
          'Practice exercises in the Academy use this practice data.',
        ],
      },
      {
        heading: 'What practice mode does not switch',
        body: 'Some parts do not use practice data. Be careful there.',
        bullets: [
          'Team Chat messages and tasks are always real.',
          'Marketing & CRM, HR and Payroll screens keep their own data in this browser. Practice mode does not change them.',
          'Your training progress is always saved on the server.',
        ],
      },
      {
        heading: 'Always check before real work',
        body: 'Before you book a real truck or make a real bill, check that you are back on real data. Work done in practice is not real and is lost for the company.',
      },
    ],
    audio: [
      'Practice mode में आप sample data पर काम सीखते हैं।',
      'यह data सिर्फ़ आपके browser में रहता है। Company के असली records पर कोई असर नहीं होता।',
      'Help और Training में Practice mode card पर Start practising दबाइए। काम पूरा हो तो Back to real data दबाइए।',
      'Team Chat के messages practice में भी असली होते हैं, इसलिए वहाँ ध्यान रखिए।',
      'असली booking या bill बनाने से पहले हमेशा check कीजिए कि आप real data पर हैं।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.start.training-academy',
    title: 'How the Training Academy works',
    module: 'home',
    kind: 'getting-started',
    screens: ['help'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Your training plan in sections, lessons with Hinglish audio, practice exercises, quizzes and your readiness status.',
    sections: [
      {
        heading: 'Your curriculum',
        body: 'Help & Training shows the training plan for your role, in order: Getting Started, Your Role, Your Daily Work, Module Training, End-to-End Workflows, Practice Exercises, Assessments and Glossary. Managers also get Manager Training.',
      },
      {
        heading: 'Lessons, audio and tips',
        body: 'Read each lesson, or press Listen to hear it in Hinglish. With the Guide on, many screens show a yellow tip box. Hide a tip with the X. "Show all page tips again" brings them all back.',
        bullets: ['The audio speed can be Slow, Normal or Fast.'],
      },
      {
        heading: 'Practice exercises',
        body: 'Each exercise gives you a Task and the Expected result. Do the work on practice data, then check. The result is Pass, or Needs correction with what the ERP found ("Your action"). Only work done after you started the exercise counts.',
      },
      {
        heading: 'Quizzes',
        body: 'A quiz asks about real system rules. After each answer the explanation teaches the rule. You pass when your score reaches the pass mark shown on the quiz (70% unless your administrator changed it). You can retake a quiz; your attempts and best score are saved.',
      },
      {
        heading: 'Readiness and progress',
        body: 'Your readiness status grows with your work: Not Started → Learning → Practising → Assessment Pending → Ready. Progress is saved on the server against your login, so it follows you to any computer or phone. Your manager sees it too.',
      },
    ],
    audio: [
      'Training Academy में आपके role का पूरा training plan है, step by step।',
      'हर lesson पढ़िए, या Listen दबाकर Hinglish में सुनिए।',
      'Practice exercise में task दिया होता है। काम कीजिए, फिर result आता है — Pass या Needs correction।',
      'Quiz में pass mark पाना ज़रूरी है। Pass न हो तो फिर से दे सकते हैं, best score save रहता है।',
      'आपका status Not Started से Learning, Practising, Assessment Pending होते हुए Ready तक जाता है।',
      'Progress server पर save होती है, इसलिए किसी भी computer या phone पर वहीं से शुरू कर सकते हैं।',
    ],
    minutes: 4,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// B) Your Role – one lesson per role code
// ---------------------------------------------------------------------------------------------------------------
const role: Lesson[] = [
  {
    id: 'ls.role.sa',
    title: 'Your role: Super Admin',
    module: 'home',
    kind: 'role',
    roles: ['SA'],
    screens: ['dashboard', 'board', 'access/users', 'access/credentials', 'communication/audit', 'admin/time-limits'],
    prerequisites: ['ls.start.welcome'],
    summary: 'The Super Admin sees the whole business and controls logins, roles and system settings.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You are the owner or top manager of the system. You watch the whole business – bookings, rail, fleet, workshop and money – and you decide who can use which part of the ERP.',
      },
      {
        heading: 'Your menus',
        body: 'You get every menu group.',
        bullets: [
          'Home, Communication, Operations, Road Fleet, Rail & Rake, Warehouse, Finance, Workshop & Inventory, Customers, Marketing & CRM, HR, Payroll, Reports & MIS, Masters.',
          'Users & Access, Super Admin (Credential Administration), Communication Admin (Communication Oversight) and Administration.',
          'On Home you can switch the view between Owner, Operations, Accounts and Fleet.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Your login can change everything, so use it carefully.',
        bullets: [
          'Never share the Super Admin login or use it for daily data entry by others.',
          'Never delete a record in Data Corrections without checking what is linked to it.',
          'Never send a temporary password in a group chat or e-mail.',
          'Do not change Stage Time Limits or System Settings without telling the teams – every late count changes.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'Admins and HR come to you for logins, roles and settings. Every team escalates late or blocked work to you. You give access to new staff through Users & Access and check their readiness before they work alone.',
      },
    ],
    audio: [
      'आप Super Admin हैं — पूरा business और पूरा system आपके हाथ में है।',
      'आपको हर menu दिखता है, और Home पर Owner, Operations, Accounts और Fleet view बदल सकते हैं।',
      'Users और roles आप तय करते हैं — किसे कौन सी screen दिखेगी।',
      'अपना login कभी किसी को मत दीजिए, और Data Corrections में delete से पहले linked records ज़रूर देखिए।',
      'Time limits या settings बदलें तो teams को बताइए, क्योंकि late की गिनती बदल जाती है।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.ad',
    title: 'Your role: Admin / Manager',
    module: 'home',
    kind: 'role',
    roles: ['AD'],
    screens: ['dashboard', 'board', 'work', 'access/users', 'access/roles', 'masters', 'admin/announcements', 'communication/audit'],
    prerequisites: ['ls.start.welcome'],
    summary: 'The Admin looks after users, master lists and settings, and watches where work is stuck across branches.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You manage the people and the system. You create logins, set roles, keep master lists clean and watch the Order Board and Home for work that is stuck in any branch.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Communication Admin, Operations, Road Fleet, Rail & Rake, Warehouse, Customers, Marketing & CRM, HR, Payroll, Reports & MIS, Masters, Users & Access and Administration.',
        bullets: [
          'Finance and Workshop & Inventory are not in the Admin role menus.',
          'My Work always shows everyone\'s work for you.',
          'On Home you can switch between Owner, Operations, Accounts and Fleet views.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Mistakes in setup affect every user.',
        bullets: [
          'Never give a role more menus than the job needs.',
          'Never close the temporary-password window before copying it – it is shown only once.',
          'Never change or remove a master entry (customer, city, goods) that is already used on LRs without checking with the team that uses it.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'HR tells you when someone joins or leaves; you create or deactivate the login. Teams ask you for missing screens and master entries. Data corrections and settings that need Super Admin go to the Super Admin.',
      },
    ],
    audio: [
      'आप Admin या Manager हैं — users, master lists और settings आपकी ज़िम्मेदारी हैं।',
      'नया employee आए तो login बनाइए, सही role दीजिए, और temporary password अकेले में दीजिए।',
      'Home और Order Board पर देखिए कि किस branch में काम अटका है।',
      'Finance और Workshop के menus Admin role में नहीं हैं।',
      'किसी role को ज़रूरत से ज़्यादा access मत दीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.op',
    title: 'Your role: Operations',
    module: 'home',
    kind: 'role',
    roles: ['OP'],
    screens: ['work', 'board', 'ops/order-confirmation', 'book', 'ops/lr', 'ops/pod', 'fleet/trucks'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Operations moves the goods: confirm orders, make LRs, arrange trucks and rakes, and follow every load to POD.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You turn customer orders into moving loads. You confirm orders, make LRs, plan the load, give a truck, dispatch, follow the load on the way, mark it delivered and get the POD back.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Operations, Road Fleet, Rail & Rake, Warehouse, Customers and Reports & MIS.',
        bullets: [
          'My Work shows: Confirm customer orders, Make LR, Finish draft LRs, Assign a truck, Confirm delivery of late trucks, Rail loads not moving, Collect POD copies.',
          'Home shows the Operations view: Booked today, On the way, Delivered today, POD pending.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'These mistakes cost money or block billing.',
        bullets: [
          'Never confirm an order of a credit-hold customer without approval from Accounts.',
          'Never choose To Pay or Paid for a customer who gets a monthly bill – use To Be Billed.',
          'Never leave an LR in draft – a draft cannot be dispatched or billed.',
          'Never record bulk POD for a load with damage.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'You receive orders from customers, Customer Care and won deals. You hand trucks to Fleet (own trucks) or transporters (market trucks), rail loads to the branch team, and POD-received LRs to Accounts for billing.',
      },
    ],
    audio: [
      'आप Operations में हैं — माल को सही समय पर सही जगह पहुँचाना आपका काम है।',
      'Order confirm कीजिए, LR बनाइए, truck दीजिए और dispatch कीजिए।',
      'रास्ते में late truck हो तो driver से बात कीजिए और delivery mark कीजिए।',
      'Signed POD आते ही record कीजिए, क्योंकि उसके बिना accounts bill नहीं बना सकते।',
      'Credit hold वाले customer का order accounts से पूछे बिना confirm मत कीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.bu',
    title: 'Your role: Branch User',
    module: 'home',
    kind: 'role',
    roles: ['BU'],
    screens: ['work', 'book', 'ops/grn', 'ops/dgrn', 'ops/dc', 'ops/ldc', 'ops/pod'],
    prerequisites: ['ls.start.welcome'],
    summary: 'The Branch User books loads at the branch and handles the rail chain: GRN, DGRN, delivery challans and POD.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You run your branch\'s bookings and goods. At the Jalgaon rail head you count goods in (GRN) and load wagons. At a destination branch you count goods in from the rake (DGRN), make delivery challans and record acknowledgments and POD.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Operations, Rail & Rake, Warehouse and Reports & MIS.',
        bullets: [
          'Road Fleet and Customers are not in the Branch User menus.',
          'My Work shows the same booking and delivery jobs as Operations, including Collect POD copies.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Counts you enter decide what is loaded, delivered and paid.',
        bullets: [
          'Never enter a GRN or DGRN count without counting the goods.',
          'Never make a second DGRN for the same VP – the ERP does not stop it.',
          'Never record a POD before the signed copy is in your hand.',
          'Never hide damage – record damaged pieces at GRN, DGRN or POD.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'You receive bookings from customers and Operations, and rakes from the rail head. You hand delivery challans to transporters, acknowledgments to Accounts for DC approval, and PODs to Accounts for billing. Send physical PODs to other branches through Courier.',
      },
    ],
    audio: [
      'आप Branch User हैं — आपकी branch की booking और माल की गिनती आपके हाथ में है।',
      'Rail head पर माल आए तो GRN बनाइए, और destination branch पर VP खाली होने पर DGRN।',
      'हर गिनती खुद करके डालिए, और damage हो तो उसी समय लिखिए।',
      'Delivery challan बनाइए, फिर supervisor acknowledgment और POD record कीजिए।',
      'Signed POD हाथ में आने से पहले POD record मत कीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.ac',
    title: 'Your role: Accounts',
    module: 'home',
    kind: 'role',
    roles: ['AC'],
    screens: ['work', 'fin/billing', 'fin/receivables', 'fin/client-payments', 'fin/tp-approval', 'fin/dc-approval', 'fin/tally'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Accounts makes the bills, collects the money, pays transporters and hamals, and sends vouchers to Tally.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You turn delivered loads into money. You bill To Be Billed LRs after POD, record customer payments with TDS, follow up overdue bills, approve and pay transporters, delivery challans and hamali, and export vouchers to Tally.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Finance, Customers, Payroll and Reports & MIS.',
        bullets: [
          'My Work shows: Make bills, Follow up on overdue payments, Approve delivery challans for payment, Approve transporter payment slips.',
          'Home shows the Accounts view: Ready to bill, Billed this month, Collected this month, Overdue.',
          'In Customers you keep rate contracts and credit hold up to date.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Money mistakes are hard to undo.',
        bullets: [
          'Never bill an LR without POD, unless the customer is allowed to bill without acknowledgment.',
          'Never approve a transporter slip or DC without checking it – Approve in My Work acts at once.',
          'Never delete a bill that has receipts; delete the receipts first, in the right order.',
          'Deleting a voucher in the ERP does not change Tally – correct Tally separately.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'You receive POD-received LRs from Operations, Branch and Customer Care, and LDC acknowledgments from branches. You tell Customer Care and Operations about overdue customers and credit hold, and you pass vouchers to Tally.',
      },
    ],
    audio: [
      'आप Accounts में हैं — bill बनाना, पैसा collect करना और payments करना आपका काम है।',
      'POD आने के बाद To Be Billed वाले LR का bill बनाइए।',
      'Payment आए तो amount और TDS डालिए। Pending बचा तो bill Partial रहता है।',
      'Transporter slip या DC approve करने से पहले ध्यान से check कीजिए — My Work का Approve तुरंत हो जाता है।',
      'ERP में voucher delete करने से Tally नहीं बदलता, उसे अलग से ठीक कीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.cc',
    title: 'Your role: Customer Care',
    module: 'home',
    kind: 'role',
    roles: ['CC'],
    screens: ['work', 'board', 'ops/lr', 'ops/pod', 'cust/support', 'marketing/leads', 'marketing/handoff'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Customer Care keeps customers informed, chases late deliveries and PODs, handles complaints and follows sales leads.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You are the voice of SK Translines to the customer. You answer "where is my load?", chase late deliveries and PODs, record complaints, and work leads, deals and quotations in Marketing & CRM.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Operations, Customers, Marketing & CRM and Reports & MIS.',
        bullets: [
          'My Work shows: Confirm delivery of late trucks and Collect POD copies.',
          'Search (Ctrl K) finds any LR, customer or truck when a customer calls.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Customers trust what you tell them.',
        bullets: [
          'Never promise a rate that is not in the rate contract or an approved quotation.',
          'Never tell a customer a load is delivered before it is marked delivered.',
          'Never record bulk POD for a load with damage.',
          'Remember: leads, deals and quotations are kept in this browser only. Colleagues do not see them.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'You receive calls and complaints from customers. You pass new orders to Operations, damage and late issues to the branch, payment questions to Accounts, and won deals to Operations through Won Deal Handoff.',
      },
    ],
    audio: [
      'आप Customer Care में हैं — customer को सही जानकारी देना आपका काम है।',
      'Customer का call आए तो ऊपर search में LR number डालिए, पूरी जानकारी मिल जाएगी।',
      'Late delivery और pending POD आपकी My Work में दिखते हैं।',
      'Complaint हो तो Complaints and Support में दर्ज कीजिए।',
      'जो rate contract में नहीं है, वो rate customer को promise मत कीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.co',
    title: 'Your role: Fleet',
    module: 'home',
    kind: 'role',
    roles: ['CO'],
    screens: ['work', 'fleet/trucks', 'fleet/trips', 'fleet/fuel', 'fleet/logslips', 'ws/jobcards'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Fleet looks after our own trucks and drivers: trips, diesel, papers, trip closing, log slips and repairs.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You keep our own trucks running and earning. You start trips with an advance, add diesel and expenses, close trips when trucks return, make log slips, renew truck papers and send trucks to the workshop.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Road Fleet, Workshop & Inventory and Reports & MIS.',
        bullets: [
          'My Work shows: Assign a truck, Approve job cards, Close finished trips (open over 5 days), Renew truck documents (due within 30 days).',
          'Home shows the Fleet view: Free trucks, On trip, In workshop, Papers due.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Truck costs and safety depend on you.',
        bullets: [
          'Never leave a finished trip open – it blocks the log slip and diesel settlement.',
          'Never send a truck out with expired insurance, fitness, permit or tax.',
          'Never enter diesel against the wrong trip.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'Operations asks you for trucks and drivers for LRs and delivery challans. You hand trucks to the workshop with a job card, and log slips and diesel to Accounts.',
      },
    ],
    audio: [
      'आप Fleet में हैं — हमारे अपने trucks और drivers की ज़िम्मेदारी आपकी है।',
      'Truck निकले तो trip शुरू कीजिए, advance दीजिए, और रास्ते का diesel उसी trip में डालिए।',
      'Truck लौटे तो trip close कीजिए, फिर log slip बनाइए।',
      'Insurance, fitness, permit या tax expire होने वाले हों तो My Work में दिखते हैं — समय पर renew कीजिए।',
      'Truck खराब हो तो job card बनाकर workshop भेजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.si',
    title: 'Your role: Workshop & Stores',
    module: 'home',
    kind: 'role',
    roles: ['SI'],
    screens: ['work', 'ws/checklist', 'ws/jobcards', 'ws/jobcard-approval', 'ws/stock', 'ws/po', 'ws/inward'],
    prerequisites: ['ls.start.welcome'],
    summary: 'Workshop & Stores repairs our trucks with job cards and keeps the spares stock, purchases and supplier bills in order.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You run the workshop and the spares store. You check trucks, open job cards, issue parts, buy spares with purchase orders, receive them with inward entries and handle replacements and service bills.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, Workshop & Inventory and Reports & MIS.',
        bullets: [
          'My Work shows: Approve job cards and Approve spare purchases.',
          'Home shows the Fleet view: Free trucks, On trip, In workshop, Papers due.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'Stock and cost must stay correct.',
        bullets: [
          'Never inward parts without an approved PO.',
          'Never approve a job card or PO without checking it – Approve in My Work acts at once.',
          'Never take parts out of the store without a job card.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'Fleet sends you trucks for repair. You send parts orders to suppliers, defective parts back for replacement, and supplier and service bills for payment.',
      },
    ],
    audio: [
      'आप Workshop और Stores में हैं — trucks की repair और spares का stock आपका काम है।',
      'Truck आए तो checklist और job card बनाइए, और parts job card से ही निकालिए।',
      'Spares खरीदने हों तो purchase order बनाइए। Approval के बाद ही inward होता है।',
      'Job card और PO के approvals आपकी My Work में दिखते हैं।',
      'Approve दबाने से पहले amount और parts ज़रूर check कीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.role.hr',
    title: 'Your role: HR',
    module: 'home',
    kind: 'role',
    roles: ['HR'],
    screens: ['hr/employees', 'hr/attendance', 'hr/leaves', 'payroll/run', 'masters', 'access/users'],
    prerequisites: ['ls.start.welcome'],
    summary: 'HR manages employees, attendance, leave, shifts and payroll, and tells the administrator who needs a login.',
    sections: [
      {
        heading: 'What you do at SK Translines',
        body: 'You look after the people. You keep employee records, attendance, leaves, shifts and holidays, run payroll with overtime and TDS, and make sure joiners and leavers get the right access.',
      },
      {
        heading: 'Your menus',
        body: 'Home, Communication, HR, Payroll, Masters and Users & Access.',
        bullets: [
          'HR and Payroll screens save in this browser only. Other users and devices do not see your entries.',
          'You can open Users & Access, but only Admin and Super Admin can create logins or reset passwords.',
          'My Work is usually empty for HR.',
        ],
      },
      {
        heading: 'Never do this',
        body: 'People data is private.',
        bullets: [
          'Never share salary, PAN or personal details in chat.',
          'Never ask for or keep someone else\'s password.',
          'Never leave a leaver\'s login active – tell the administrator the same day.',
        ],
      },
      {
        heading: 'Hand-offs',
        body: 'You tell the Admin when someone joins, changes job or leaves. You give payroll figures to Accounts. Employees bring leave and overtime requests to you.',
      },
    ],
    audio: [
      'आप HR में हैं — employees, attendance, leave और payroll आपकी ज़िम्मेदारी है।',
      'HR और Payroll का data अभी सिर्फ़ इसी browser में save होता है।',
      'नया employee आए या कोई छोड़े, तो उसी दिन administrator को बताइए ताकि login बने या बंद हो।',
      'Salary या personal details कभी chat में मत भेजिए।',
    ],
    minutes: 3,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// C) Your Daily Work – one routine per role code (screens only from that role's menu groups)
// ---------------------------------------------------------------------------------------------------------------
const daily: Lesson[] = [
  {
    id: 'ls.daily.sa',
    title: 'A day as Super Admin',
    module: 'home',
    kind: 'daily',
    roles: ['SA'],
    screens: ['dashboard', 'board', 'work', 'fin/cash-plan', 'fin/receivables', 'access/users', 'communication/audit', 'reports'],
    prerequisites: ['ls.role.sa'],
    summary: 'Check the business in the morning, clear blockages and approvals during the day, and review money and access in the evening.',
    sections: [
      {
        heading: 'Start of day',
        body: 'Open Home in the Owner view. Read Booked today, On the way, Revenue this month and To collect.',
        bullets: [
          'Look at the "Biggest blockage" bar and press "Fix these".',
          'On the Order Board, press "Late only" to see every red card.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Follow up the blocked stages with the team that owns them. Answer requests for logins and access.',
        bullets: [
          'Users & Access › Users: create logins for joiners and deactivate leavers.',
          'Use Team Chat with the LR number when you ask someone to act.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Check money and controls.',
        bullets: [
          'Cash Plan: red weeks show where cash runs short.',
          'Receivables: biggest overdue customers.',
          'Communication Oversight and Reports & MIS when you need a review.',
        ],
      },
    ],
    audio: [
      'सुबह Home खोलिए, Owner view में आज के चार numbers देखिए।',
      'Biggest blockage वाली पट्टी पर Fix these दबाइए, और Order Board पर Late only से लाल cards देखिए।',
      'दिन में अटका काम उसकी team के साथ follow up कीजिए, और नए logins या access की requests निपटाइए।',
      'शाम को Cash plan और Receivables देखिए — कहाँ पैसा कम पड़ रहा है और कौन customer overdue है।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.daily.ad',
    title: 'A day as Admin / Manager',
    module: 'home',
    kind: 'daily',
    roles: ['AD'],
    screens: ['dashboard', 'work', 'board', 'access/users', 'access/roles', 'masters', 'admin/announcements', 'communication/audit', 'reports'],
    prerequisites: ['ls.role.ad'],
    summary: 'Check branches in the morning, handle users and master lists during the day, and review exceptions in the evening.',
    sections: [
      {
        heading: 'Start of day',
        body: 'Open Home and My Work (you see everyone\'s work). Note which branch or stage has the most red items.',
        bullets: ['Switch the Home view to Operations or Fleet to see that team\'s numbers.'],
      },
      {
        heading: 'During the day',
        body: 'Keep the system ready for the teams.',
        bullets: [
          'Users & Access › Users: new logins, deactivations and password resets. Copy the temporary password before closing.',
          'Roles & Permissions: adjust menus only when the job needs it.',
          'Masters: add missing customers, cities or goods so bookings are not blocked.',
          'Announcements: tell staff about changes.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Look at the Order Board with "Late only" and follow up with branch managers. Use Communication Oversight and Reports & MIS for reviews.',
      },
    ],
    audio: [
      'सुबह Home और My Work देखिए — Admin को सबका काम दिखता है।',
      'दिन में नए logins, password reset और master lists का काम कीजिए।',
      'Temporary password सिर्फ़ एक बार दिखता है, window बंद करने से पहले copy कीजिए।',
      'शाम को Order Board पर Late only दबाकर branches से follow up कीजिए।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.daily.op',
    title: 'A day in Operations',
    module: 'home',
    kind: 'daily',
    roles: ['OP'],
    screens: ['dashboard', 'work', 'board', 'ops/order-confirmation', 'book', 'ops/smart-load', 'ops/lr', 'ops/delivery', 'ops/pod', 'fleet/trucks'],
    prerequisites: ['ls.role.op'],
    summary: 'Confirm orders and give trucks in the morning, follow loads during the day, and close deliveries and PODs in the evening.',
    sections: [
      {
        heading: 'Start of shift',
        body: 'Open Home, then My Work. Clear the red rows first.',
        bullets: [
          'Confirm customer orders (Order Confirmation or the row button).',
          'Make LR for confirmed orders with New booking.',
          'Check Fleet › Trucks for free own trucks, then Assign a truck.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Keep loads moving.',
        bullets: [
          'For planned loads, use Smart Load Planning and confirm physical loading before dispatch.',
          'Finish draft LRs – drafts cannot be dispatched.',
          'Watch "On the way" on the Order Board. Call drivers of red cards.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Close what is done.',
        bullets: [
          'Mark delivered loads on Delivery.',
          'Record POD for signed copies received – one by one if there is damage.',
          'Check LR & Consignments for any LR still in draft.',
        ],
      },
    ],
    audio: [
      'Shift की शुरुआत Home और My Work से कीजिए, पहले लाल rows।',
      'Orders confirm कीजिए, New booking से LR बनाइए, और free truck assign कीजिए।',
      'दिन में Order Board पर On the way देखिए। लाल card हो तो driver को call कीजिए।',
      'Smart Load Plan वाले load में physical loading confirm किए बिना dispatch नहीं होता।',
      'शाम को delivery mark कीजिए और जो POD आए हैं, record कीजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.daily.bu',
    title: 'A day as Branch User',
    module: 'home',
    kind: 'daily',
    roles: ['BU'],
    screens: ['dashboard', 'work', 'book', 'ops/grn', 'ops/vp-loading', 'rail/rakes', 'ops/dgrn', 'ops/dc', 'ops/ldc', 'ops/pod', 'ops/courier'],
    prerequisites: ['ls.role.bu'],
    summary: 'Book and count goods in the morning, load or unload rakes and send challans during the day, and record acknowledgments and PODs in the evening.',
    sections: [
      {
        heading: 'Start of shift',
        body: 'Open Home and My Work. Book the day\'s loads with New booking.',
        bullets: [
          'At the rail head: make GRN for goods that arrived.',
          'At a destination branch: check Rake Planning for rakes arriving today.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Move the goods.',
        bullets: [
          'Rail head: load GRN stock into VPs on VP Loading.',
          'Destination branch: make DGRN for each unloaded VP, then Delivery Challans for the consignees.',
          'Record damage at the moment you find it.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Close the paperwork.',
        bullets: [
          'LDC Acknowledgment: record supervisor, collection and client acknowledgments.',
          'POD / Acknowledgment: record signed copies received.',
          'Courier: send PODs and LDC copies to other branches and mark couriers received.',
        ],
      },
    ],
    audio: [
      'सुबह My Work देखिए और दिन की bookings बनाइए।',
      'Rail head पर माल आए तो GRN बनाइए, फिर VP Loading में wagons भरिए।',
      'Destination branch पर हर VP के लिए DGRN, फिर customer के लिए delivery challan बनाइए।',
      'शाम को LDC acknowledgment और POD record कीजिए, और POD की copy courier से भेजिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.daily.ac',
    title: 'A day in Accounts',
    module: 'home',
    kind: 'daily',
    roles: ['AC'],
    screens: ['dashboard', 'work', 'fin/billing', 'fin/client-payments', 'fin/receivables', 'fin/dc-approval', 'fin/tp-approval', 'fin/hamali', 'fin/ledger', 'fin/tally', 'fin/cash-plan'],
    prerequisites: ['ls.role.ac'],
    summary: 'Bill and record receipts in the morning, approve and pay during the day, and check ledger, Tally and cash in the evening.',
    sections: [
      {
        heading: 'Start of day',
        body: 'Open Home (Accounts view) and My Work.',
        bullets: [
          'Make bills for LRs with POD – bill today so payment starts sooner.',
          'Client Payments: record money received with TDS.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Handle what others are waiting for.',
        bullets: [
          'Receivables: call customers past their credit days; put a customer on credit hold if needed.',
          'DC Approval and Transporter Approval: check, approve and record payment.',
          'Hamali Payments for GRN, DGRN and VP loading gangs.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Check the books.',
        bullets: [
          'Ledger: check the day\'s vouchers.',
          'Tally Export: export vouchers for the period.',
          'Cash Plan: see if any coming week runs short of cash.',
        ],
      },
    ],
    audio: [
      'सुबह My Work में Make bills देखिए — POD आ गया है तो आज ही bill बनाइए।',
      'जो payments आए हैं, Client Payments में amount और TDS के साथ डालिए।',
      'दिन में overdue customers को call कीजिए, और DC और transporter slips check करके approve कीजिए।',
      'शाम को ledger देखिए, Tally export कीजिए, और Cash plan में आने वाले हफ़्ते देखिए।',
    ],
    minutes: 4,
  },
  {
    id: 'ls.daily.cc',
    title: 'A day in Customer Care',
    module: 'home',
    kind: 'daily',
    roles: ['CC'],
    screens: ['dashboard', 'work', 'board', 'ops/lr', 'ops/pod', 'cust/360', 'cust/support', 'marketing/followups', 'marketing/leads', 'communication'],
    prerequisites: ['ls.role.cc'],
    summary: 'Check late loads in the morning, answer customers and complaints during the day, and chase PODs and follow-ups in the evening.',
    sections: [
      {
        heading: 'Start of shift',
        body: 'Open Home and My Work.',
        bullets: [
          'Confirm delivery of late trucks: find out the status and tell the customer before they call.',
          'Order Board: filter by a big customer to see all their loads.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Be ready when a customer calls.',
        bullets: [
          'Search (Ctrl K) the LR number and open the LR to see its stage.',
          'Customer 360: see the customer\'s LRs, bills and complaints.',
          'Complaints & Support: record every complaint and close it when solved.',
          'Team Chat: ask the branch with the LR number attached.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Close the loop.',
        bullets: [
          'Collect POD copies: record signed copies received.',
          'Follow-ups & Activities: finish today\'s calls and plan the next ones for your leads.',
        ],
      },
    ],
    audio: [
      'सुबह My Work में late trucks देखिए, और customer के call करने से पहले उसे बता दीजिए।',
      'Call आए तो search में LR number डालिए और stage देखकर जवाब दीजिए।',
      'हर complaint Complaints and Support में दर्ज कीजिए।',
      'शाम को आए हुए POD record कीजिए, और leads के follow-ups पूरे कीजिए।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.daily.co',
    title: 'A day in Fleet',
    module: 'home',
    kind: 'daily',
    roles: ['CO'],
    screens: ['dashboard', 'work', 'fleet/trucks', 'fleet/trips', 'fleet/fuel', 'fleet/trip-completion', 'fleet/logslips', 'fleet/journeys', 'ws/jobcards'],
    prerequisites: ['ls.role.co'],
    summary: 'Send trucks out in the morning, record diesel and repairs during the day, and close trips and log slips in the evening.',
    sections: [
      {
        heading: 'Start of shift',
        body: 'Open Home (Fleet view) and My Work.',
        bullets: [
          'Check free trucks and papers due on Trucks.',
          'Assign trucks to LRs waiting for a vehicle.',
          'Start trips with the trip advance and print the trip advance slip.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Record costs against the right trip.',
        bullets: [
          'Fuel & Trip Expenses: diesel and expenses for each trip.',
          'Job Cards: open one when a truck needs repair; approve job cards in My Work.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Close what has returned.',
        bullets: [
          'Trip Completion: close trips with the closing km.',
          'Log Slips: settle completed trips of a truck.',
          'Truck Journeys: check empty km and profit once a week.',
        ],
      },
    ],
    audio: [
      'सुबह Fleet view में free trucks और due papers देखिए।',
      'Truck निकले तो trip शुरू कीजिए और advance slip print कीजिए।',
      'दिन में हर diesel और खर्च सही trip में डालिए। Truck खराब हो तो job card बनाइए।',
      'शाम को लौटे trucks की trip close कीजिए और log slip बनाइए।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.daily.si',
    title: 'A day in Workshop & Stores',
    module: 'home',
    kind: 'daily',
    roles: ['SI'],
    screens: ['dashboard', 'work', 'ws/checklist', 'ws/jobcards', 'ws/jobcard-approval', 'ws/stock', 'ws/po', 'ws/po-approval', 'ws/inward', 'ws/replacement', 'ws/service-bills'],
    prerequisites: ['ls.role.si'],
    summary: 'Check trucks and open job cards in the morning, issue parts and buy spares during the day, and inward and close in the evening.',
    sections: [
      {
        heading: 'Start of shift',
        body: 'Open My Work for job cards and POs waiting for approval.',
        bullets: [
          'Truck Checklist for trucks that came in.',
          'Job Cards: open one for each repair.',
        ],
      },
      {
        heading: 'During the day',
        body: 'Keep repairs and stock moving.',
        bullets: [
          'Spares Stock: check low stock.',
          'Purchase Orders for parts you need; PO Approval before inward.',
          'Spare Replacement: send defective parts back to the seller.',
        ],
      },
      {
        heading: 'End of day',
        body: 'Book what arrived and what was done.',
        bullets: [
          'Stock Inward: receive parts against approved POs with the supplier bill.',
          'Service Bills for outside work done on trucks.',
          'Finalise job cards of trucks that are leaving.',
        ],
      },
    ],
    audio: [
      'सुबह My Work में job card और PO approvals देखिए।',
      'Workshop में आए truck की checklist भरिए और job card खोलिए।',
      'दिन में spares stock देखिए, ज़रूरत हो तो PO बनाइए।',
      'शाम को आए हुए parts का inward कीजिए, और जो truck निकल रहा है उसका job card finalise कीजिए।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.daily.hr',
    title: 'A day in HR',
    module: 'home',
    kind: 'daily',
    roles: ['HR'],
    screens: ['dashboard', 'hr/attendance', 'hr/leaves', 'hr/shifts', 'hr/employees', 'payroll/overtime', 'payroll/run', 'access/users'],
    prerequisites: ['ls.role.hr'],
    summary: 'Mark attendance in the morning, handle leave and staff changes during the day, and prepare payroll inputs in the evening.',
    sections: [
      {
        heading: 'Start of day',
        body: 'Check Attendance and the Shift Roster for today.',
      },
      {
        heading: 'During the day',
        body: 'Handle people requests.',
        bullets: [
          'Leaves: record and approve leave requests.',
          'Employees: add joiners and update changes.',
          'Tell the administrator about joiners and leavers so logins are created or deactivated (you can check them in Users & Access › Users).',
        ],
      },
      {
        heading: 'End of day',
        body: 'Prepare for payroll.',
        bullets: [
          'Overtime Request: approve overtime so it is paid in the payroll run.',
          'At month end, run Payroll.',
          'Remember: HR and Payroll data stays in this browser.',
        ],
      },
    ],
    audio: [
      'सुबह attendance और shift roster देखिए।',
      'दिन में leave requests और नए employees का काम कीजिए।',
      'कोई join करे या छोड़े, तो administrator को बताइए ताकि login बने या बंद हो।',
      'शाम को overtime approve कीजिए, और महीने के आख़िर में payroll चलाइए।',
    ],
    minutes: 3,
  },
];

export const lessons: Lesson[] = [...start, ...role, ...daily];
