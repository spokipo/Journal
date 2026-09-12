# Design System

Это Source of Truth. Правило существует независимо от того, реализовано ли
оно уже где-то в коде — если код с ним расходится, чинится код, а не правило[cite: 7].
Формат везде один: **Rule → Parameters → Example**. Пример — минимальный
фрагмент, иллюстрирующий параметры, а не готовый компонент для копипаста[cite: 7].

Стек: React + Tailwind + framer-motion + lucide-react[cite: 7].

---

## Quick reference

| Строю... | Layout type | Surface | Раздел |
|---|---|---|---|
| Экран с виджетами | Type A (grid) | L2 карточка | §3 |
| Форма / детейл записи | Type B (list-form) | L2 карточка, L1 строка | §3 |
| Список данных (сделки, сетапы) | Type C (data-list) | L2 метрика, L1 строка | §3 |
| Страница с разделами (Settings и т.п.) | Type D (sectioned) | L1 nav, L2 контент | §3 |
| Модалка | — | L2 (desktop) / Full-screen Canvas (mobile) | §5 |
| Пустой список / ошибка загрузки / загрузка | — | L2 | §7 |
| Chart / sparkline | — | внутри L2 карточки | §8 |
| Доступность, touch targets, масштабирование текста | — | нормативные правила | §9 |

---

## 1. App Shell

Прежде чем говорить про страницы — фиксируется оболочка, в которой они живут[cite: 7].

**Rule:** Приложение состоит из трёх неизменных зон: Shell-навигация, Content area, Overlay layer[cite: 7]. Ни одна страница не переопределяет их — она только заполняет Content area[cite: 7].

**Parameters:**
| Зона | Роль | Реализация |
|---|---|---|
| Shell-навигация | Одновременно nav + структурная рамка приложения (не просто список ссылок)[cite: 7] | Desktop: `Sidebar` — floating card, `m-4`, `rounded-[26px]`, `bg-card`, collapsible (80px ⇄ 280px)[cite: 7]. Mobile: floating pill tab bar (не edge-to-edge), `bg-card/90 backdrop-blur-xl`, без `border-t`, + отдельная круглая primary-кнопка рядом с pill-баром[cite: 7]. Подробности — §6[cite: 7] |
| Content area | Скроллящаяся область конкретной страницы[cite: 7] | `flex-1 overflow-y-auto`, паддинг от Shell — `p-4 lg:p-6`, сама решает свой Layout Type (§3)[cite: 7] |
| Overlay layer | Всё что рисуется поверх Shell+Content: modal, toast, context menu, action sheet[cite: 7] | `fixed inset-0`, z-индекс по шкале §2[cite: 7] |

**Example:**
```jsx
<Shell>
  <SidebarNav/>           {/* desktop */}
  <ContentArea>{page}</ContentArea>
  <MobileTabBar/>         {/* mobile */}
  <OverlayLayer/>         {/* modals, toasts — рендерятся через portal поверх всего */}
</Shell>
```

Sidebar не "карточка среди других карточек" — это часть Shell, поэтому её `rounded-[26px]` не про "контейнер", а про то, что она визуально плавающий объект над `bg-canvas` всего окна[cite: 7]. Это единственное место, где radius обусловлен ролью Shell, а не Surface-уровнем (§2)[cite: 7].

---

## 2. Tokens

### Цвет
`bg-card` (поверхность) · `bg-canvas` (фон/hover) · `border-border-card` (единственный цвет границ) · `text-text-main` / `text-text-muted` · `blue-500` (единственный accent) · `emerald-500` / `rose-500` / `amber-500` / `yellow-500` (статусы)[cite: 7]

### Surface hierarchy (не путать с radius-шкалой — это про уровень вложенности, radius из неё следует)
| Уровень | Что это | Radius | Фон |
|---|---|---|---|
| **L2 — Container** | Самостоятельный блок на странице: карточка, виджет, модалка (desktop), group-секция[cite: 7] | `26px` | `bg-card` + border[cite: 7] |
| **L1 — Control** | Самостоятельная интерактивная кнопка/control на canvas или внутри L2: button, icon-button, toolbar-контейнер (search/segmented/view-toggle), select-trigger[cite: 7] | `full` | `bg-card` (если на canvas) или `bg-canvas` (если внутри L2/на подложке карточки) |
| **L1 — Data row** | Строка списка данных внутри L2 (Type C, group-секция Type B) — НЕ кнопка в смысле формы, а контейнер контента[cite: 7] | `18px` | прозрачный (если внутри L2)[cite: 7] |
| **L0 — Nested** | Мелкий элемент внутри L1: icon-badge, chip, menu item, thumbnail[cite: 7] | `14px` | зависит от контекста[cite: 7] |
| **Pill** | Круглые элементы независимо от уровня: аватар, toggle, badge-точка[cite: 7] | `full` | — |

**Rule:** Кнопка (в любой роли) и "строка данных" — разные вещи, даже если обе технически L1[cite: 7]. Кнопка/control получает `full` (см. §4 Button)[cite: 7]. Строка списка (сделка/сетап/настройка) остаётся прямоугольной `18px` — pill к спискам с данными не применяется, иначе теряется читаемость таблично выровненных значений (`tabular-nums`)[cite: 7].

**Rule:** Toolbar — это НЕ Container[cite: 7]. Это ряд самостоятельных L1-элементов на `bg-canvas`, без общей L2-обёртки[cite: 7]. См. §3 Toolbar[cite: 7].

**Radius note:** `26px / 18px / 14px` — brand/elevation aesthetic tokens этой системы: они выражают иерархию поверхностей и визуальный характер продукта[cite: 7]. Это не accessibility-стандарт и не минимальный размер интерактивной области[cite: 7].

**Media thumbnails** (превью изображения/вложения любого размера — иконка-миниатюра в строке, превью в карточке, аватар не-круглой формы) относятся к уровню **L0** и получают `rounded-[14px]`, независимо от физического размера самого превью[cite: 7]. Не создавать промежуточные значения (`10px`, `12px`, `16px`) под предлогом "маленький/большой thumbnail" — уровень surface, а не пиксельный размер, определяет radius[cite: 7].

### Control height
| Высота | Роль |
|---|---|
| `h-11` | Touch target на mobile — любой самостоятельный интерактивный элемент (кнопка, trigger, filter icon-button)[cite: 7] |
| `h-10` | Primary/secondary action на странице (desktop/tablet)[cite: 7] |
| `h-9` | Toolbar-контрол на `md:` и выше (см. §9 — на mobile запрещён)[cite: 7] |
| `h-7` | **Nested/inner control** — кнопка внутри уже отступленного (`p-1`/`p-0.5`) L1-контейнера: сегмент таба, элемент view-toggle[cite: 7]. Легитимен только как внутренний элемент составного L1-компонента, не как самостоятельная кнопка на canvas — общая hit area составного компонента (внешний контейнер + padding) всё равно обязана соответствовать §9 на mobile[cite: 7]. |

Правило: не вводить произвольную высоту (`h-8`, `h-6` для кнопок и т.п.) вне этой таблицы — если новый case не описывается ни одной строкой, это повод расширить таблицу, а не создать исключение на месте[cite: 7].

### Typography
**Rule:** Размер шрифта определяется ролью текста, не местом на странице "по ощущению"[cite: 7]. Все размеры текста задаются относительными единицами: стандартными Tailwind text-utility (они используют `rem`) или явно указанным значением в `rem`[cite: 7]. Не использовать `px` в font-size, включая `text-[10px]`; так текст сохраняет масштабирование при настройках браузера и системном увеличении[cite: 7].

| Роль | Класс / размер | Weight |
|---|---|---|
| Caption / compact metadata | `text-[0.6875rem]` (11px при базовом 16px)[cite: 7] | `font-medium`[cite: 7] |
| Body small (метаданные, toolbar, значения)[cite: 7] | `text-xs` (0.75rem)[cite: 7] | `font-medium`[cite: 7] |
| Body (лейблы полей, текст строки)[cite: 7] | `text-sm` (0.875rem)[cite: 7] | `font-normal`/`font-medium`[cite: 7] |
| Section title | `text-base` (1rem)[cite: 7] | `font-semibold`[cite: 7] |
| Page H1 | `text-2xl sm:text-3xl`[cite: 7] | `font-bold tracking-tight`[cite: 7] |

**Minimum readable text:** `0.6875rem` (11px при базовом 16px) — нижняя граница для вторичной подписи, timestamp или non-essential metadata[cite: 7]. Основной UI-текст, labels, действия, сообщения об ошибке и навигация используют не меньше `text-xs` (0.75rem)[cite: 7]. `text-[10px]` не использовать как основной UI text[cite: 7]. Line-height — Tailwind default для каждого класса, не переопределять вручную кроме заголовков (`leading-tight`)[cite: 7].

### Icon scale
`12px` — внутри pill/badge · `14px` — внутри кнопки/строки (default inline) · `16-18px` — заголовок секции, header action · `20-24px` — bottom-tab, empty-state, крупный акцент[cite: 7]

### Z-index
`z-10` контент внутри карточки (активная пилюля) · `z-20` sticky в рамках страницы · `z-30` popover/dropdown/context-menu · `z-40` bottom tab bar, mobile-шторка · `z-50` modal / action sheet / toast (Overlay layer, всегда верхний)[cite: 7]

### Spacing
Шкала: `4 · 8 · 12 · 14 · 16 · 20 · 24 · 32px`[cite: 7]. `gap-1.5/2.5/3.5` запрещены — округлять до ближайшего[cite: 7].
Padding по контексту (L2 container: `p-5` стандарт / `p-3-4` компакт; L1 строка: `px-4 py-3.5`; модалка: `px-6 py-5` mobile → `px-8 py-6` desktop)[cite: 7].

### Motion
Easing `[0.25,1,0.5,1]` или `[0.16,1,0.3,1]`, длительность `0.15–0.28s`[cite: 7]. Spring для переключателей: `stiffness 450-500, damping 30-35`[cite: 7]. `active:scale-[0.98]` (кнопки) / `active:scale-95` (icon-button)[cite: 7].

**Rule — layoutId namespacing (обязательно):** framer-motion `layoutId` глобален для всего дерева React, а не локален для компонента[cite: 7]. Одинаковый `layoutId` на двух разных страницах вызывает "перелёт" элемента между ними при анимированном переходе страниц[cite: 7].
**Parameters:** каждый `layoutId` префиксуется именем страницы/компонента-владельца: `` `${pageKey}-tab-pill` ``, не голое `"tab-pill"`[cite: 7].
**Example:** Journal-тулбар — `layoutId={\`journal-toolbar-pill-${activeTab}\`}`, Settings-nav — `layoutId="settings-nav-pill"`[cite: 7]. Один и тот же паттерн (segmented control) на двух страницах никогда не делит один `layoutId`[cite: 7].

---

## 3. Layout Types

Каждая страница начинается с page header (см. ниже), затем — ровно один из четырёх типов контентной области[cite: 7].

### Page header
**Rule:** Заголовок страницы — крупный, слева, по умолчанию на каждой странице верхнего уровня (Dashboard/Journal/Playbook/Settings/Stats)[cite: 7]. Это default, не жёсткое требование без исключений: страница внутри флоу (напр. шаг мастера, экран внутри модалки) header не обязан повторять — там своя навигация "назад"[cite: 7].
**Parameters:** `text-2xl sm:text-3xl font-bold tracking-tight`, подзаголовок `text-xs sm:text-sm text-text-muted`[cite: 7]. Sticky-compact версия (`text-[1.0625rem] font-semibold`, `backdrop-blur-xl`) — только там, где контент длиннее экрана и скроллится внутри своего контейнера[cite: 7].
**Example:** `<h1 className="text-2xl sm:text-3xl font-bold text-text-main">{title}</h1>`[cite: 7]

### A — Grid
**Rule:** Полная ширина, карточки-виджеты разных размеров[cite: 7].
**Parameters:** `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5`; размеры виджетов — Apple WidgetKit family (`systemSmall`/`systemMedium`/`systemLarge`), см. Widget anatomy ниже[cite: 7]. Surface L2 с исключением по border (см. Widget anatomy)[cite: 7].

**Widget anatomy — Apple WidgetKit standard (systemSmall / systemMedium / systemLarge):**

| Family | Grid span | Aspect |
|---|---|---|
| `systemSmall` (1×1) | `col-span-1 row-span-1`[cite: 7] | `aspect-square`[cite: 7] |
| `systemMedium` (2×1) | `col-span-2 row-span-1`[cite: 7] | `aspect-[2/1]`[cite: 7] |
| `systemLarge` (2×2) | `col-span-2 row-span-2`[cite: 7] | `aspect-square`[cite: 7] |

**Surface — ключевое отличие от обычных L2-карточек:** нативные iOS-виджеты не используют обводку — только фон и мягкую тень[cite: 7]. Widget-обёртка: `bg-card rounded-[26px] shadow-sm`, **без `border border-border-card`** (в отличие от всех остальных L2-контейнеров в системе — это единственное осознанное исключение из Surface hierarchy §2, обусловленное аутентичностью WidgetKit-стиля)[cite: 7].

**Padding — не масштабируется по размеру:** `p-4` (16px) у всех трёх размеров, без исключений[cite: 7].

**Content type — Metric (Label → Value → Supporting):**
- **Label** — `text-[0.6875rem] uppercase tracking-wide text-text-muted font-semibold` (Caption роль §2 Typography — не `text-[10px]`, он запрещён как основной UI-текст в §2/§9)[cite: 7], опционально с маленькой tinted-иконкой (`14-16px`, статусный/акцентный цвет, без фонового кружка-бейджа)[cite: 7]
- **Value** — крупное число, `tabular-nums font-bold`, размер растёт с family: `text-xl` (small) → `text-2xl` (medium) → `text-3xl` (large)[cite: 7]
- **Supporting** (опционально, только medium/large) — sparkline/progress-bar/второстепенное значение, палитра §8[cite: 7]

По family: **systemSmall** — только Label+Value, один glanceable-показатель[cite: 7]. **systemMedium** — Label+Value слева, Supporting справа[cite: 7]. **systemLarge** — та же структура сверху + расширенная Supporting-зона снизу[cite: 7].

**Content type — List (календарь/новости/уведомления — несколько однотипных строк, не единая метрика):**
- **systemSmall** — ровно одна запись, в том же Label→Value ритме[cite: 7]
- **systemMedium** — 2 строки списка, без внутреннего скролла[cite: 7]
- **systemLarge** — до 6-8 строк с внутренним `overflow-y-auto`[cite: 7]
- Строка списка внутри list-виджета — L0-уровень (`rounded-[14-16px]`, `bg-canvas`, без выхода за padding виджета), не L1/L2[cite: 7]
- Заголовок виджета (`title` в WidgetCard) обязателен для list-типа на medium/large — в отличие от metric-типа, где заголовок на small не нужен[cite: 7]

**Скролл внутри виджета — только `systemLarge`, без исключений[cite: 7].** `systemSmall` и `systemMedium` никогда не скроллятся внутри себя (`overflow-hidden` явно)[cite: 7].

**Настройка виджета (фильтры/параметры):** не card-flip/rotateY-переворот — используется Context menu (см. §5), открывается от триггера `MoreHorizontal`/`SlidersHorizontal` в правом верхнем углу виджета (icon-button `rounded-full`, `w-8 h-8`, `bg-canvas border border-border-card` — nested-размер по §4 Button, виджет сам по себе компактный контейнер). Внутри — та же панель, что и везде (`bg-card border border-border-card rounded-[18px]`), с нужными контролами (multi-select чипы, Select, Switch), без вложенных дропдаунов внутри дропдауна[cite: 7].

**Edit mode (виджеты):**
- Активный edit-mode переключается общей кнопкой в header страницы (icon-button `rounded-full bg-canvas border border-border-card`, toggled-состояние `bg-blue-500 text-white border-blue-500`, §4 Button).
- В edit-mode каждый виджет получает overlay: `ring-2 ring-blue-500/50` вокруг карточки (не меняет сам radius/border виджета), drag-handle сверху-слева (`GripHorizontal`, L0 `rounded-full`, `bg-card/90 backdrop-blur`), кнопка-удаление сверху-справа (`bg-rose-500 text-white rounded-full`, `w-6 h-6`)[cite: 7].
- Переключатель размера (systemSmall/Medium/Large) — компактный segmented control снизу карточки в edit-mode (`rounded-full`, те же принципы что и обычный Toolbar segmented control, но в миниатюре)[cite: 7].
- Drag-перетаскивание — `dnd-kit`, лёгкое увеличение (`scale: 1.04`) и повышенная тень (`shadow-2xl`) во время переноса, курсор `cursor-grabbing`[cite: 7].
- Пустой слот "Add widget" в конце сетки — dashed-контур (`border-2 border-dashed border-border-card rounded-[26px]`)[cite: 7].

### B — List / Form
**Rule:** Контент ограничен по ширине, сгруппирован в секции[cite: 7].
**Parameters:** `max-w-[560px]`, полная ширина на `< md`[cite: 7]. Секция = caption (`text-xs uppercase text-text-muted`) + L2-карточка, строки L1 разделены `border-b border-border-card`[cite: 7].

### C — Data list
**Rule:** Метрики сверху (L2, компакт), список строк снизу — одна геометрия независимо от list/grid viewMode[cite: 7].
**Parameters:** `max-w-[960px]`; метрики `grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3`; строка списка `h-16 rounded-[18px]` (L1); числа `font-mono tabular-nums`[cite: 7].

### D — Sectioned page
**Rule:** На `lg` и выше — двухколоночная nav (L1-строки) + контент (следует Типу B)[cite: 7]. На `< lg` каждый раздел открывается как отдельный экран внутри той же страницы: меняется состояние, а не route[cite: 7].
**Parameters:** desktop nav — `w-[220px]`, активный пункт `bg-blue-500/10 text-blue-500`, иконка `16-18px` + label; desktop-контент — `max-w-[640px]`[cite: 7].

**Mobile drill-down header:** верхняя панель открытого подраздела — заголовок **строго по центру**, **без иконки** (только текст названия раздела, `text-base font-semibold`), кнопка «Назад» слева (`ChevronLeft`, интерактивная область `44×44px`), действия справа (одно или два: напр. `Edit` + Context menu `...`)[cite: 7].
- **Правило строгого центрирования заголовка:** Если кнопок действия справа две (или ширина правого блока кнопок больше ширины левого), они **ни в коем случае не должны толкать или смещать заголовок** в сторону от центра экрана. Заголовок обязан оставаться строго по математическому центру экрана/контейнера (ось 50% ширины). Для этого заголовок центрируется абсолютно относительно всей ширины хедера (`absolute inset-0 flex items-center justify-center pointer-events-none`) с симметричными горизонтальными охранными отступами `px-24` (96px с обеих сторон) — это гарантирует, что длинный текст (`truncate`) никогда не наползёт на кнопки действий ни слева (44px), ни справа (94px), а интерактивные контролы внутри (напр. input в режиме редактирования) имеют `pointer-events-auto`. Асимметрия слотов не должна нарушать центральную ось заголовка.

**Mobile slide transition:** На `< lg` переход между списком разделов (Screen 1) и экраном выбранного подраздела (Screen 2) выполняется строго через horizontal slide (`AnimatePresence mode="wait"`):
- При переходе в подраздел: экран списка уходит влево (`exit={{ x: -32, opacity: 0 }}`), экран подраздела въезжает справа (`initial={{ x: '100%', opacity: 1 }}`, `animate={{ x: 0, opacity: 1 }}`).
- При возврате «Назад»: экран подраздела уезжает вправо (`exit={{ x: '100%', opacity: 1 }}`), экран списка возвращается слева (`initial={{ x: -32, opacity: 0 }}`, `animate={{ x: 0, opacity: 1 }}`).
- Длительность `duration: 0.2s`, ease `[0.16, 1, 0.3, 1]`. Внешний контейнер мобильного экрана обязан содержать `overflow-hidden`, чтобы анимация смещения не создавала горизонтального скроллбара.

**Mounting animation (контент разделов):** Карточки и элементы внутри каждого раздела анимируются при монтировании согласно §3.1:
- Структурные блоки/карточки формы — Band reveal (`initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `duration: 0.18s`).
- Повторяющиеся строки/метрики/карточки счетов — Item-stagger (`delay: index * 0.03s`, capped на `0.24s`, `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`).

### Toolbar
**Rule:** На desktop/tablet toolbar — плоский ряд L1-элементов на `bg-canvas`, без общей L2-обёртки[cite: 7]. `h-9` controls разрешены только начиная с `md`; на mobile они запрещены[cite: 7].
**Parameters:** desktop/tablet: каждый control — самостоятельный `h-9 rounded-full bg-card border border-border-card`[cite: 7].

**Mobile filters:** toolbar на mobile схлопывается в одну-две кнопки-триггера (`h-11`, напр. "Filters", "Sort")[cite: 7]. Тап открывает **anchored popover от самой кнопки** (L2, `rounded-[18px] p-1.5`, опции L0 `rounded-[14px]`)[cite: 7]. Bottom sheet для фильтров **не используется**[cite: 7].

**Example:** на mobile строка сжимается до `[Search input] [Filter icon-button] [Primary button]`[cite: 7]. Триггер — icon-button `w-11 h-11 rounded-full bg-canvas border border-border-card` (standalone-размер по §4 Button), иконка `SlidersHorizontal` 18px.

---

## 3.1 Page mount animation

1. **Item-stagger** — для набора равнозначных повторяющихся единиц (виджеты в гриде, строки данных, карточки сделок)[cite: 7]. Задержка `delay: index * 0.03s`, **capped на ~0.24s**[cite: 7]. Duration `0.15-0.18s`[cite: 7].
2. **Band reveal** — для структурных блоков (header, toolbar, nav-колонка, content-панель)[cite: 7]. Появление целиком: `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `duration: 0.18-0.2s`[cite: 7].

---

## 4. Component Anatomy

### Button
**Rule:** Официальный стандарт формы — `rounded-full` (pill), для ЛЮБОЙ самостоятельной кнопки: текстовой (Primary/Secondary/Destructive) и icon-only (add "+", context-menu "...", close "X", back)[cite: 7]. Все кнопки во всей системе без исключений имеют физическую контрастную подложку и границу (ghost-кнопки без фона и рамки строго запрещены)[cite: 4, 7]. `18px` для кнопок запрещён — он остаётся только у L1 Data row[cite: 7].
**Parameters:** desktop/tablet: высота `h-10`; mobile: область не меньше `44×44px` (`min-h-11 min-w-11`)[cite: 7]. radius `full` — без исключений[cite: 7].
- **Primary:** `bg-blue-500 border border-blue-500 text-white hover:bg-blue-600`[cite: 4, 7]
- **Secondary / Default:** `bg-card border border-border-card text-text-main hover:bg-canvas`[cite: 7]
- **Icon-button / L1 Control:** `bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs` (при нахождении внутри L2-контейнера/модалки) или `bg-card border border-border-card` (на canvas)[cite: 4, 7]
- **Destructive:** `bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20`

**Icon-only button — фиксированный квадратный размер:**
| Контекст | Размер |
|---|---|
| Самостоятельная icon-кнопка на canvas/в header/в toolbar (desktop) | `w-10 h-10`[cite: 7] |
| Та же кнопка на mobile | `w-11 h-11` (44px, обязательный touch target)[cite: 7] |
| Icon-кнопка внутри уже компактного вложенного контейнера (угол виджета) | `w-8 h-8`[cite: 7] |

**Text-label vs icon-only — дефолт всегда icon-only; текстовые кнопки на mobile запрещены:**
В мобильных модалках и экранах исключений больше нет: все header-действия — строго icon-only по стандарту монолитного хедера (§5). Никаких текстовых `Cancel`/`Save`, «голых» прозрачных иконок без подложки (ghost) или невидимых тач-зон:
- Каждое действие в mobile header — полноценная самостоятельная L1-кнопка: `rounded-full w-11 h-11`, физический контрастный фон `bg-canvas`, граница `border border-border-card` (либо `bg-blue-500 border-blue-500 text-white` для Primary действия), иконка `18px`, обязательный `aria-label` для доступности[cite: 4].
- Текстовые кнопки допустимы исключительно на десктопе в составе обычного header/footer формы или как единственная текстовая Primary-кнопка внизу экрана, если это предусмотрено layout-типом.
- Это правило едино для всех сценариев без исключений:
  - **Mobile sheet header (§5):** только `rounded-full` icon-buttons в слотах (`X`, `Check`, `Pencil`, `MoreHorizontal`) с явным фоном `bg-canvas` и рамкой `border border-border-card`[cite: 4].
  - **Desktop modal header (§5):** строго осязаемые icon-buttons `w-10 h-10 rounded-full bg-canvas border border-border-card`.
  - **Edit-mode оверлей виджетов (§3, Widget anatomy):** строго icon-only (`GripHorizontal`, `X`, переключатель размера буквами `S`/`M`/`L`) с подложкой[cite: 7].
  - **Inline-действия в строке списка/таблицы:** строго icon-only с подписью через `aria-label`[cite: 7].
  - **Любой edit mode в системе:** остаётся icon-only по умолчанию[cite: 7].

### Switch
**Rule:** Единственная реализация toggle во всём приложении[cite: 7].
**Parameters:** Визуальный track — `h-8 w-[3.25rem] rounded-full`; on = `bg-blue-500`, off = `bg-canvas border`; thumb `h-7 w-7 rounded-full bg-white`, spring `450/35`[cite: 7]. Интерактивен весь `min-h-11` wrapper[cite: 7].

### Select
**Rule:** Кастомный dropdown, не нативный `<select>`[cite: 7].
**Parameters:** desktop trigger — `h-9 rounded-full`[cite: 7]. На mobile: anchored-меню (в toolbar) или bottom sheet (в большой форме)[cite: 7]. Trigger и опции — минимум `44px` (`min-h-11`)[cite: 7]. Опция — **L0 (`rounded-[14px]`)**[cite: 7].

### Pill / Badge
**Rule:** Статус — цвет фона на 10% прозрачности + текст того же цвета[cite: 7].
**Parameters:** `px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase`[cite: 7]. Точка-индикатор — `w-1.5 h-1.5 rounded-full`[cite: 7]. Icon-badge — L0, `w-9 h-9 rounded-[14px]`[cite: 7].

### Card
**Rule:** L2 — базовый строительный блок для любого контентного блока[cite: 7].
**Parameters:** `bg-card border border-border-card rounded-[26px] p-5`; компакт-вариант `p-3 sm:p-4`[cite: 7].

---

## 5. Modal

**Rule:** Один компонент, поведение переключается по breakpoint; ширина зависит от объёма контента, не фиксирована[cite: 7].

**Parameters:**
- Короткая форма (2-4 поля) → `md:w-[480px]`, одна колонка[cite: 7]
- Насыщенная форма (6+ полей) → `md:w-[760px] lg:w-[860px]`, **две колонки** (`grid md:grid-cols-2 gap-x-6 gap-y-5`), поля на всю ширину — `md:col-span-2`[cite: 7]
- Mobile — всегда full-screen (`h-[100dvh] rounded-none`, одна колонка), safe-area padding[cite: 7]
- Desktop — центрированная карточка, `rounded-[26px]`, overlay `bg-black/60`[cite: 7]
- Padding: mobile header `px-4`, body `px-6 py-5`; desktop header/body `px-8 py-6`, footer чуть компактнее (`py-4`/`py-5`)[cite: 7]. На mobile footer не существует[cite: 7].
- Anim (desktop, center-card): overlay fade `0.15s`; panel `y: 8→0, opacity 0→1, duration 0.18s, ease [0.16,1,0.3,1]`, обязателен `layout` для плавного изменения размеров[cite: 7]
- Anim (mobile, full-screen): fade-in на месте (не slide) — overlay/panel `opacity 0→1`, лёгкий `y: 8→0`, `duration 0.2-0.24s`, ease `[0.16,1,0.3,1]`; закрытие — обратный fade-out[cite: 7]

**Action sheet:** L2-карточка `w-[220px] rounded-[26px] p-2`, всплывает от точки клика[cite: 7].
**Confirm dialog:** компакт-вариант модалки (`md:w-[380px]`, одна колонка), без form-полей[cite: 7].

### Mobile full-screen sheet — единый icon-first паттерн

На mobile используется один full-screen sheet-паттерн в духе iOS: закреплённая полупрозрачная область размытия с кнопками и единое скроллируемое body[cite: 7]. Варианты с текстовыми `Cancel`/`Save`, плавающими разрозненными pill-кнопками и нижней панелью действий запрещены[cite: 7]. Это сохраняет постоянную геометрию при переходе View ⇄ Edit и не превращает модалку в отдельное приложение внутри приложения[cite: 7].

**1. Геометрия.** Header — полупрозрачная область размытия без резких границ и линий: `h-16 sticky top-0 z-20 px-4 bg-card/60 backdrop-blur-xl shrink-0`, **без `border-b`**, с учётом safe-area сверху. Body — единственная скроллируемая область под header, `px-6 py-5`, с нижним safe-area padding[cite: 7]. Контент мягко уходит под размытый хедер, граница экрана не перерезается полосой.

**2. Анатомия header.** В шапке всегда три стабильных слота: icon-only button слева — центрированный `Title` — icon-only button справа[cite: 7]. Все кнопки хедера — полноценные осязаемые L1-контролы: форма строго `rounded-full`, размер `w-11 h-11`, иконка `18px`, обязательный `aria-label`[cite: 7]. Текстовые кнопки, прозрачные иконки без собственной подложки (ghost) и кнопки без иконки запрещены[cite: 4, 7].
- Базовые кнопки / Cancel / Close: `bg-canvas border border-border-card text-text-main hover:bg-card active:scale-95 shadow-xs`[cite: 4]
- Primary кнопка (Check / Save): `bg-blue-500 border border-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-xs`[cite: 4]

| Состояние | Левый слот | Центр | Правый слот |
|---|---|---|---|
| View | `X` — закрыть модалку[cite: 7] | Title[cite: 7] | `Pencil` — перейти в edit mode; `MoreHorizontal` — если главное действие отсутствует или вторичных действий больше одного[cite: 7] |
| Edit | `X` — Cancel, отменить несохранённые правки и вернуться в View[cite: 7] | Title[cite: 7] | `Check` (Primary) — Save, сохранить и вернуться в View[cite: 7] |
| Create | `X` — закрыть создание; при несохранённых данных — подтвердить потерю[cite: 7] | Title[cite: 7] | `Check` (Primary) — Create/Save[cite: 7] |

Иконки меняются внутри тех же слотов; header не перестраивается[cite: 7]. В edit mode отдельная иконка отмены не добавляется: левая кнопка — `X` с семантикой `Cancel editing`, она оставляет модалку открытой, сбрасывает несохранённые изменения и возвращает к View[cite: 7]. После возврата в View слева снова `X` с семантикой Close[cite: 7]. `Check` в edit mode сохраняет и также возвращает к View, не закрывая модалку[cite: 7].

**3. Body и действия.** Body переиспользует Тип B (§3): поля группируются в подписанные секции (`text-xs uppercase text-text-muted` + L2/L1-карточка)[cite: 7]. Нижнего action bar/footer в мобильной модалке не существует[cite: 7]. Primary-действие доступно только через `Check` в правом слоте header[cite: 7]. Secondary и destructive-действия не добавляются в header отдельными кнопками: одно или несколько таких действий живут в `MoreHorizontal` context menu; одиночное destructive действие допустимо внизу скроллируемого body отдельной L1-кнопкой `h-11 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500`[cite: 7]. Деструктивное действие всегда требует отдельного подтверждения[cite: 7].

**4. Переходы и защита данных.** View ⇄ Edit — смена состояния в одной модалке, не закрытие и не открытие новой[cite: 7]. Header и body переходят через `AnimatePresence mode="wait"`: `opacity 0→1`, `y: 4→0`, `duration: 0.15-0.2s`, без horizontal slide[cite: 7]. Попытка закрыть или смахнуть sheet при несохранённых данных запрашивает подтверждение потери; `Escape` повторяет семантику левой кнопки в текущем состоянии[cite: 7]. Focus остаётся внутри sheet и возвращается в trigger после фактического закрытия[cite: 7].

**5. Desktop.** Desktop не наследует mobile header: остаётся center-card с обычными header/footer и текстовыми действиями согласно общим правилам формы[cite: 7]. Хедер десктопной модалки оснащается закрывающей icon-button `w-10 h-10 rounded-full bg-canvas border border-border-card text-text-muted hover:text-text-main hover:bg-card shadow-xs` (никаких прозрачных кнопок). Обязателен `layout` для плавного изменения размеров при смене состояний[cite: 7].

**Context menu / Popover / Dropdown** ("..." у карточки/строки/виджета, попапы фильтров):
- **Rule — Условие открытия попап-меню:**
  - **Фон НЕ затемняется:** При открытии попап-меню, dropdown или context-menu категорически запрещено затемнять фон (`bg-black/...`, overlay) или накладывать `backdrop-blur` на остальную страницу. Фон за пределами попапа остаётся полностью неизменным и видимым (dismiss-слой строго `fixed inset-0 z-40 bg-transparent cursor-default` либо click-outside обработчик).
  - **Скролл НЕ блокируется:** Открытие попап-меню/dropdown/context-menu НЕ должно вызывать `lockBodyScroll` и блокировать скролл страницы или скролл-контейнера.
  - В отличие от модального окна (§5 Modal), которое является изолированным диалогом верхнего уровня (z-50) с оверлеем `bg-black/60` (desktop) и блокировкой скролла, попап-меню — это контекстный плавающий элемент (z-30..40), сохраняющий видимость и скролл контекста.
- Триггер — `MoreHorizontal`/`SlidersHorizontal` в icon-button `rounded-full` (`bg-canvas border border-border-card` по §4 Button, не ghost) — полноценная кнопка с подложкой и рамкой
- Панель — `bg-card border border-border-card rounded-[18px] p-1.5 shadow-2xl` — сплошной фон, без blur/прозрачности[cite: 7]
- Появление — стандартная анимация anchored-попапов: `initial={{ opacity: 0, y: 6, scale: 0.98 }}`, `duration: 0.15`[cite: 7]
- Позиционируется anchored от самого триггера (portal), не по центру экрана[cite: 7]
- Список опций — L0 (`rounded-[14px] px-3 py-2`), деструктивная опция — `text-rose-500`, отделена `border-t border-border-card/40`[cite: 7]

---

## 6. Мобильная навигация

**Rule:** Bottom tab bar — часть App Shell (§1), не переопределяется отдельными страницами[cite: 7]. Максимум **3-4 собственных раздела** видны напрямую; если разделов приложения больше — последний слот отдаётся не разделу, а пункту **"Menu"**[cite: 7].
**Parameters:** floating pill-контейнер — `h-14`, `rounded-full`, `bg-card/90 backdrop-blur-xl border border-border-card`, с отступом от края экрана (`px-3 pb-[safe-area]`), без `border-t`[cite: 7]. Иконки `20-24px`; активная вкладка — капсула-подсветка (`layoutId`) + `text-blue-500`[cite: 7].

Глобальное primary-действие ("New Entry") — **отдельная круглая кнопка рядом с pill-баром** (`w-14 h-14`, `bg-blue-500 border border-blue-500 text-white`)[cite: 7].

---

## 7. Empty / Loading / Error states

**Empty state:** L2-карточка (`rounded-[26px]`), центрированный контент, icon `24px` в круге `bg-canvas`, заголовок `text-sm font-semibold`, описание `text-xs text-text-muted`[cite: 7].
**Loading state:** Skeleton повторяет геометрию реального контента, `animate-pulse bg-canvas`[cite: 7].
**Error state:** L2-обёртка, icon-круг `bg-rose-500/10 text-rose-500`, кнопка "Retry" (secondary button: `bg-canvas border border-border-card`)[cite: 7].

---

## 8. Data Visualization

**Rule:** Графики используют только статусную палитру (§2)[cite: 7].
**Parameters:**
- Линия прибыли — `emerald-500`, убытка — `rose-500`, нейтральная линия — `blue-500`[cite: 7]
- Gridlines — `border-border-card` на 40% opacity, только горизонтальные[cite: 7]
- Tooltip — L2-карточка компакт (`rounded-[14px] p-2 shadow-lg`), значения `tabular-nums`[cite: 7]
- Никогда не использовать более 3 цветов на одном графике одновременно[cite: 7]

---

## 9. Accessibility & Touch Target Compliance

**Touch targets:** На mobile (`< md`) каждый элемент, который можно tapнуть, имеет минимум `44×44px` (`min-h-11 min-w-11`)[cite: 7].
**No horizontal scroll:** Горизонтальный скролл контента как escape-hatch запрещён (заменять на `flex-wrap`, вертикальные списки или popover)[cite: 7].
**Text scaling:** Font size задаётся только `rem`-based Tailwind utility. Минимальный размер `0.6875rem` (11px)[cite: 7]. Основной UI text не меньше `0.75rem` (`text-xs`)[cite: 7]. `text-[10px]` запрещён[cite: 7].

---

## 10. Правила для агента

1. Radius определяется Surface-уровнем (§2), не местом на странице "по ощущению"[cite: 7]
2. Каждый `layoutId` — namespaced именем страницы/компонента (§2 Motion) — не переиспользовать голые строки[cite: 7]
3. Каждая страница — оба состояния (desktop §3 + mobile §6) сразу, не отдельным этапом[cite: 7]
4. Каждый список/грид — Empty + Loading + Error, не только happy path (§7)[cite: 7]
5. Компонент не меняет анатомию между list/grid/mobile/desktop — меняется только layout-обёртка[cite: 7]
6. Modal/Select/Context-menu — единственные описанные реализации (§5, §4) — не создавать альтернативные[cite: 7]
7. Графики — только статусная палитра, максимум 3 цвета (§8)[cite: 7]
8. Тема — только семантические классы, никогда hex[cite: 7]
9. Числа — всегда `tabular-nums`[cite: 7]
10. Новый компонент вне этого файла — anatomy по аналогии с ближайшим разделом, не с нуля[cite: 7]
11. На mobile ни один touch target не меньше `44×44px`; `h-9` toolbar controls не использовать — применять паттерн §9[cite: 7]
12. Размеры текста — только `rem`-based utility/значения; основной UI text не меньше `text-xs`, `text-[10px]` запрещён (§2, §9)[cite: 7]
13. Кнопки без подложки и границы (ghost) запрещены во всей системе на всех breakpoints — только осязаемые L1-кнопки с фоном и рамкой (`bg-canvas border border-border-card` или акцентная заливка).