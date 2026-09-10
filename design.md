# Design System

Это Source of Truth. Правило существует независимо от того, реализовано ли
оно уже где-то в коде — если код с ним расходится, чинится код, а не правило.
Формат везде один: **Rule → Parameters → Example**. Пример — минимальный
фрагмент, иллюстрирующий параметры, а не готовый компонент для копипаста.

Стек: React + Tailwind + framer-motion + lucide-react.

---

## Quick reference

| Строю... | Layout type | Surface | Раздел |
|---|---|---|---|
| Экран с виджетами | Type A (grid) | L2 карточка | §3 |
| Форма / детейл записи | Type B (list-form) | L2 карточка, L1 строка | §3 |
| Список данных (сделки, сетапы) | Type C (data-list) | L2 метрика, L1 строка | §3 |
| Страница с разделами (Settings и т.п.) | Type D (sectioned) | L1 nav, L2 контент | §3 |
| Модалка | — | L2 (desktop) / L0 (mobile) | §7 |
| Пустой список / ошибка загрузки / загрузка | — | L2 | §8 |
| Chart / sparkline | — | внутри L2 карточки | §8 |
| Доступность, touch targets, масштабирование текста | — | нормативные правила | §9 |

---

## 1. App Shell

Прежде чем говорить про страницы — фиксируется оболочка, в которой они живут.

**Rule:** Приложение состоит из трёх неизменных зон: Shell-навигация, Content area, Overlay layer. Ни одна страница не переопределяет их — она только заполняет Content area.

**Parameters:**
| Зона | Роль | Реализация |
|---|---|---|
| Shell-навигация | Одновременно nav + структурная рамка приложения (не просто список ссылок) | Desktop: `Sidebar` — floating card, `m-4`, `rounded-[26px]`, `bg-card`, collapsible (80px ⇄ 280px). Mobile: bottom tab bar, `fixed`, `bg-card`, `border-t` |
| Content area | Скроллящаяся область конкретной страницы | `flex-1 overflow-y-auto`, паддинг от Shell — `p-4 lg:p-6`, сама решает свой Layout Type (§3) |
| Overlay layer | Всё что рисуется поверх Shell+Content: modal, toast, context menu, action sheet | `fixed inset-0`, z-индекс по шкале §2 |

**Example:**
```
<Shell>
  <SidebarNav />           {/* desktop */}
  <ContentArea>{page}</ContentArea>
  <MobileTabBar />         {/* mobile */}
  <OverlayLayer />         {/* modals, toasts — рендерятся через portal поверх всего */}
</Shell>
```

Sidebar не "карточка среди других карточек" — это часть Shell, поэтому её `rounded-[26px]` не про "контейнер", а про то, что она визуально плавающий объект над `bg-canvas` всего окна. Это единственное место, где radius обусловлен ролью Shell, а не Surface-уровнем (§2).

---

## 2. Tokens

### Цвет
`bg-card` (поверхность) · `bg-canvas` (фон/hover) · `border-border-card` (единственный цвет границ) · `text-text-main` / `text-text-muted` · `blue-500` (единственный accent) · `emerald-500` / `rose-500` / `amber-500` / `yellow-500` (статусы)

### Surface hierarchy (не путать с radius-шкалой — это про уровень вложенности, radius из неё следует)
| Уровень | Что это | Radius | Фон |
|---|---|---|---|
| **L2 — Container** | Самостоятельный блок на странице: карточка, виджет, модалка (desktop), group-секция | `26px` | `bg-card` + border |
| **L1 — Element** | Интерактивный элемент внутри L2 или самостоятельно на canvas: кнопка, инпут, toolbar-контрол, строка списка | `18px` | `bg-card` (если на canvas) или прозрачный (если внутри L2) |
| **L0 — Nested** | Мелкий элемент внутри L1: icon-badge, chip, menu item | `14px` | зависит от контекста |
| **Pill** | Круглые элементы независимо от уровня: аватар, toggle, badge-точка | `full` | — |

**Rule:** Toolbar — это НЕ Container. Это ряд самостоятельных L1-элементов на `bg-canvas`, без общей L2-обёртки. См. §3 Toolbar.

**Radius note:** `26px / 18px / 14px` — brand/elevation aesthetic tokens этой системы: они выражают иерархию поверхностей и визуальный характер продукта. Это не accessibility-стандарт и не минимальный размер интерактивной области.

**Media thumbnails** (превью изображения/вложения любого размера — иконка-миниатюра в строке, превью в карточке, аватар не-круглой формы) относятся к уровню **L0** и получают `rounded-[14px]`, независимо от физического размера самого превью. Не создавать промежуточные значения (`10px`, `12px`, `16px`) под предлогом "маленький/большой thumbnail" — уровень surface, а не пиксельный размер, определяет radius.

### Control height
| Высота | Роль |
|---|---|
| `h-11` | Touch target на mobile — любой самостоятельный интерактивный элемент (кнопка, trigger, filter icon-button) |
| `h-10` | Primary/secondary action на странице (desktop/tablet) |
| `h-9` | Toolbar-контрол на `md:` и выше (см. §9 — на mobile запрещён) |
| `h-7` | **Nested/inner control** — кнопка внутри уже отступленного (`p-1`/`p-0.5`) L1-контейнера: сегмент таба, элемент view-toggle. Легитимен только как внутренний элемент составного L1-компонента, не как самостоятельная кнопка на canvas — общая hit area составного компонента (внешний контейнер + padding) всё равно обязана соответствовать §9 на mobile. |

Правило: не вводить произвольную высоту (`h-8`, `h-6` для кнопок и т.п.) вне этой таблицы — если новый case не описывается ни одной строкой, это повод расширить таблицу, а не создать исключение на месте.

### Typography
**Rule:** Размер шрифта определяется ролью текста, не местом на странице "по ощущению". Все размеры текста задаются относительными единицами: стандартными Tailwind text-utility (они используют `rem`) или явно указанным значением в `rem`. Не использовать `px` в font-size, включая `text-[10px]`; так текст сохраняет масштабирование при настройках браузера и системном увеличении.

| Роль | Класс / размер | Weight |
|---|---|---|
| Caption / compact metadata | `text-[0.6875rem]` (11px при базовом 16px) | `font-medium` |
| Body small (метаданные, toolbar, значения) | `text-xs` (0.75rem) | `font-medium` |
| Body (лейблы полей, текст строки) | `text-sm` (0.875rem) | `font-normal`/`font-medium` |
| Section title | `text-base` (1rem) | `font-semibold` |
| Page H1 | `text-2xl sm:text-3xl` | `font-bold tracking-tight` |

**Minimum readable text:** `0.6875rem` (11px при базовом 16px) — нижняя граница для вторичной подписи, timestamp или non-essential metadata. Основной UI-текст, labels, действия, сообщения об ошибке и навигация используют не меньше `text-xs` (0.75rem). `text-[10px]` не использовать как основной UI text. Line-height — Tailwind default для каждого класса, не переопределять вручную кроме заголовков (`leading-tight`).

### Icon scale
`12px` — внутри pill/badge · `14px` — внутри кнопки/строки (default inline) · `16-18px` — заголовок секции, header action · `20-24px` — bottom-tab, empty-state, крупный акцент

### Z-index
`z-10` контент внутри карточки (активная пилюля) · `z-20` sticky в рамках страницы · `z-30` popover/dropdown/context-menu · `z-40` bottom tab bar, mobile-шторка · `z-50` modal / action sheet / toast (Overlay layer, всегда верхний)

### Spacing
Шкала: `4 · 8 · 12 · 14 · 16 · 20 · 24 · 32px`. `gap-1.5/2.5/3.5` запрещены — округлять до ближайшего.
Padding по контексту (L2 container: `p-5` стандарт / `p-3-4` компакт; L1 строка: `px-4 py-3.5`; модалка: `px-6 py-5` mobile → `px-8 py-6` desktop).

### Motion
Easing `[0.25,1,0.5,1]` или `[0.16,1,0.3,1]`, длительность `0.15–0.28s`. Spring для переключателей: `stiffness 450-500, damping 30-35`. `active:scale-[0.98]` (кнопки) / `active:scale-95` (icon-button).

**Rule — layoutId namespacing (обязательно):** framer-motion `layoutId` глобален для всего дерева React, а не локален для компонента. Одинаковый `layoutId` на двух разных страницах вызывает "перелёт" элемента между ними при анимированном переходе страниц.
**Parameters:** каждый `layoutId` префиксуется именем страницы/компонента-владельца: `` `${pageKey}-tab-pill` ``, не голое `"tab-pill"`.
**Example:** Journal-тулбар — `layoutId={\`journal-toolbar-pill-${activeTab}\`}`, Settings-nav — `layoutId="settings-nav-pill"`. Один и тот же паттерн (segmented control) на двух страницах никогда не делит один `layoutId`.

---

## 3. Layout Types

Каждая страница начинается с page header (см. ниже), затем — ровно один из четырёх типов контентной области.

### Page header
**Rule:** Заголовок страницы — крупный, слева, по умолчанию на каждой странице верхнего уровня (Dashboard/Journal/Playbook/Settings/Stats). Это default, не жёсткое требование без исключений: страница внутри флоу (напр. шаг мастера, экран внутри модалки) header не обязан повторять — там своя навигация "назад".
**Parameters:** `text-2xl sm:text-3xl font-bold tracking-tight`, подзаголовок `text-xs sm:text-sm text-text-muted`. Sticky-compact версия (`text-[1.0625rem] font-semibold`, `backdrop-blur-xl`) — только там, где контент длиннее экрана и скроллится внутри своего контейнера.
**Example:** `<h1 className="text-2xl sm:text-3xl font-bold text-text-main">{title}</h1>`

### A — Grid
**Rule:** Полная ширина, карточки-виджеты разных размеров.
**Parameters:** `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5`; small `aspect-square col-span-1`, medium `aspect-[2/1] col-span-2`, large `aspect-square col-span-2 row-span-2`. Surface L2.

**Widget anatomy (внутренняя структура карточки-виджета):**
- Обёртка — всегда L2 (`bg-card border border-border-card rounded-[26px]`), padding `p-4` (small) / `p-5` (medium/large) — компакт-паддинг из §2.
- **Small (1×1):** без заголовка секции. Вертикальная компоновка по центру: акцентная иконка (20-24px, статусный цвет) сверху, крупное значение (`text-2xl font-bold tabular-nums`) в центре, micro-caption (`text-[10px] uppercase text-text-muted`) снизу.
- **Medium (2×1) и Large (2×2):** заголовок виджета сверху (`text-sm text-text-muted font-medium`, Card title роль §3), дальше контент — крупное значение + вспомогательная визуализация (sparkline/progress-bar/mini-chart), см. §10 Data Viz для цвета и формата чисел.
- Единица виджета не переопределяет свою geometry между размерами по-разному — тот же токен radius/иконок при переходе small→medium→large, меняется только количество показанной информации, не стиль.
- Внутренний прогресс-бар/мини-график внутри виджета — L0-уровень (`rounded-full` для прогресс-полоски, без бордера), следует палитре §10.

**Edit mode (перестановка/изменение размера/удаление виджетов):**
- Активный edit-mode переключается общей кнопкой в header страницы (ghost icon-button, toggled-состояние `bg-blue-500 text-white`, §11 Button).
- В edit-mode каждый виджет получает overlay: `ring-2 ring-blue-500/50` вокруг карточки (не меняет сам radius/border виджета), drag-handle сверху-слева (`GripHorizontal`, L4 `rounded-full`, `bg-card/90 backdrop-blur`), кнопка-удаление сверху-справа (`bg-rose-500 text-white rounded-full`, `w-6 h-6`).
- Переключатель размера (small/medium/large) — компактный segmented control снизу карточки в edit-mode (L4, `rounded-full`, те же принципы что и обычный Toolbar segmented control, но в миниатюре).
- Drag-перетаскивание — `dnd-kit`, лёгкое увеличение (`scale: 1.04`) и повышенная тень (`shadow-2xl`) во время переноса, курсор `cursor-grabbing`.
- Пустой слот "Add widget" в конце сетки — не L2 сплошная карточка, а dashed-контур (`border-2 border-dashed border-border-card rounded-[26px]`), по клику открывает каталог доступных виджетов (grid карточек-превью в Modal §8, короткая форма 480px).
- Правило именования `layoutId` (§2 Motion) обязательно для drag-переупорядочивания: `` `dashboard-widget-${widgetInstanceId}` ``, не общая строка на все виджеты разом.

### B — List / Form
**Rule:** Контент ограничен по ширине, сгруппирован в секции.
**Parameters:** `max-w-[560px]`, полная ширина на `< md`. Секция = caption (`text-xs uppercase text-text-muted`) + L2-карточка, строки L1 разделены `border-b border-border-card`.

### C — Data list
**Rule:** Метрики сверху (L2, компакт), список строк снизу — одна геометрия независимо от list/grid viewMode.
**Parameters:** `max-w-[960px]`; метрики `grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3`; строка списка `h-16 rounded-[18px]` (L1); числа `font-mono tabular-nums`.

### D — Sectioned page
**Rule:** На `lg` и выше — двухколоночная nav (L1-строки) + контент (следует Типу B). На `< lg` каждый раздел открывается как отдельный экран внутри той же страницы: меняется состояние, а не route. Применимо к любой странице с разделами, не только Settings.
**Parameters:** desktop nav — `w-[220px]`, активный пункт `bg-blue-500/10 text-blue-500`, иконка `16-18px` + label; desktop-контент — `max-w-[640px]`. На `< lg` сначала показывается список разделов (L1-строки с иконкой + label + disclosure); по выбору раздела список заменяется его контентом на полный доступный экран.

**Mobile drill-down header (обязательно отличается от списка разделов):** верхняя панель открытого подраздела — заголовок **по центру**, **без иконки** (только текст названия раздела, `text-base font-semibold`), кнопка «Назад» слева (`ChevronLeft`, интерактивная область `44×44px`), опциональный action справа для симметрии. Иконка раздела используется только в списке-навигации (шаг 1), не переносится в header открытого экрана (шаг 2) — это визуально разводит "выбор раздела" и "содержимое раздела".

Выбор раздела синхронизируется с query-параметром или hash (например, `?section=notifications`), чтобы работали глубокая ссылка и системная навигация «Назад»; отдельный route не создаётся. Переход между списком и подразделом — `0.15–0.28s` по токенам §2 (slide-in справа налево, как push-навигация), не fade; учитывать `prefers-reduced-motion`.

### Toolbar
**Rule:** На desktop/tablet toolbar — плоский ряд L1-элементов на `bg-canvas`, без общей L2-обёртки. `h-9` controls разрешены только начиная с `md`; на mobile они запрещены.
**Parameters:** desktop/tablet: каждый control — самостоятельный `h-9 rounded-[18px] bg-card border border-border-card`; segmented control — активная пилюля через `layoutId` (namespaced, см. §2 Motion), не через смену фона напрямую.

**Mobile filters (iOS-style anchored menu, не bottom sheet):** toolbar на mobile схлопывается в одну-две кнопки-триггера (`h-11`, напр. "Filters", "Sort"). Тап открывает **anchored popover от самой кнопки** (тот же паттерн, что Context menu §5: L2, `rounded-[18px] p-1.5`, опции L0 `rounded-[14px]`, выезжает рядом с кнопкой с обрезкой по краю экрана, не из центра/снизу) — как меню «Sort By» в iOS Files/Photos. Bottom sheet для фильтров **не используется**: он оправдан только для действительно тяжёлых форм (создание/редактирование записи, §5 Modal), а не для набора из 1-3 select-полей. Опции внутри anchored-меню — не меньше `44px` по высоте каждая. Primary action (если есть, напр. "New Entry") остаётся отдельной `h-11` кнопкой, не прячется в это меню.

Если toolbar состоит из одного segmented control (не набора разных фильтров) и пунктов больше 3-4 — не нужен отдельный "Filters"-триггер: сам segmented control на mobile превращается в `Select` (§4, Grouped/accordion options при необходимости), это частный случай той же anchored-popover механики, просто без промежуточной кнопки-контейнера.

**Example (toolbar с несколькими фильтрами, напр. Journal: поиск + outcome + session + view-toggle):** на mobile строка сжимается до `[Search input] [Filter icon-button] [Primary button]` — поиск и primary-действие остаются на виду, всё остальное (Outcome, Session, View-toggle) уезжает в anchored-popover за кнопкой-триггером. Триггер — ghost icon-button `h-11 w-11 rounded-[18px]`, иконка `SlidersHorizontal` 18px, с badge-счётчиком активных фильтров (`w-4 h-4 rounded-full bg-blue-500`, см. Pill/Badge) поверх, если есть активные условия. Внутри popover — стопка тех же controls, что были в desktop-toolbar (Outcome/Session как `Select`, View-toggle как мини-segmented control), плюс опциональная строка "Reset filters" внизу, если что-то выбрано.

---

## 4. Component Anatomy

### Button
**Rule:** 4 роли, различаются заливкой, не формой.
**Parameters:** desktop/tablet: высота `h-10`; mobile: каждая интерактивная кнопка и icon-button имеет область не меньше `44×44px` (`min-h-11 min-w-11`). radius `18px` (L1). Primary — `bg-blue-500 text-white`. Secondary — `bg-card border border-border-card`. Ghost/icon — `rounded-full`, прозрачный фон, `hover:bg-canvas`. Destructive — `bg-rose-500/10 text-rose-500`.

### Switch
**Rule:** Единственная реализация toggle во всём приложении.
**Parameters:** Визуальный track — `h-8 w-[3.25rem] rounded-full` (32×52px при базовом масштабе); on = `bg-blue-500`, off = `bg-canvas border`; thumb `h-7 w-7 rounded-full bg-white`, spring `450/35`, смещение рассчитывается от фактической ширины track. Визуальный switch не равен touch target: весь label-row / button-wrapper является интерактивным и имеет минимум `44px` по высоте и ширине (`min-h-11 min-w-11`); не делать tappable только thumb или 32px track. Switch получает доступное имя через видимый label или `aria-label`.

### Select
**Rule:** Кастомный dropdown, не нативный `<select>`. Форма представления на mobile зависит от контекста использования, не единая для всех случаев.
**Parameters:** desktop/tablet trigger — L1-строка (`h-9 rounded-[14/18px]`). На mobile: если select — самостоятельный toolbar-фильтр (как в Stats/Journal), он открывается как anchored-меню (см. Toolbar → Mobile filters), не bottom sheet. Если select — одно из полей внутри большой формы (Тип B/Modal), он открывается как bottom sheet, потому что там уже full-screen контекст и bottom sheet не добавляет лишний слой поверх формы. В обоих случаях trigger и каждая опция — минимум `44px` по высоте (`min-h-11`), с уменьшением до `h-9`/`h-8` только на `md:` и выше. Panel — L2 (`rounded-18px`, `p-2`), опция — **L0 (`rounded-[14px]`), без исключений** — не создавать промежуточные `rounded-[10/12px]` для вложенных/групповых опций.

**Grouped / accordion options:** если опции сгруппированы по категориям (раскрывающиеся группы внутри одной панели), заголовок группы — тоже L0-строка (`rounded-[14px]`, `text-[0.6875rem] uppercase font-semibold text-text-muted`) с `ChevronDown`, вложенные опции — тот же `rounded-[14px]`, отступ вложенности показывается только через `padding-left`, **без вертикальной разделительной линии** (`border-l`) — единственная граница в системе (`border-border-card`) зарезервирована для контуров L1/L2-контейнеров и разделителей строк, не для декоративной индикации вложенности.

### Pill / Badge
**Rule:** Статус — цвет фона на 10% прозрачности + текст того же цвета того же оттенка.
**Parameters:** `px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase`; success `emerald-500`, danger `rose-500`, warning `amber-500`, info `blue-500`. Точка-индикатор — `w-1.5 h-1.5 rounded-full`. Icon-badge (направление сделки и т.п.) — L0, `w-9 h-9 rounded-[14px]`, одинаковый везде независимо от viewMode. Если badge интерактивный на mobile, его hit area оборачивается в минимум `44×44px`; визуальный badge не растягивается искусственно.

### Card
**Rule:** L2 — базовый строительный блок для любого контентного блока.
**Parameters:** `bg-card border border-border-card rounded-[26px] p-5`; компакт-вариант `p-3 sm:p-4`.

---

## 5. Modal

**Rule:** Один компонент, поведение переключается по breakpoint; ширина зависит от объёма контента, не фиксирована.
**Parameters:**
- Короткая форма (2-4 поля) → `md:w-[480px]`, одна колонка
- Насыщенная форма (6+ полей) → `md:w-[760px] lg:w-[860px]`, **две колонки** (`grid md:grid-cols-2 gap-x-6 gap-y-5`), поля на всю ширину — `md:col-span-2`
- Mobile — всегда full-screen (`h-[100dvh] rounded-none`, одна колонка), safe-area padding
- Desktop — центрированная карточка, `rounded-[26px]`, overlay `bg-black/60`
- Padding: header/body `px-6 py-5` mobile → `px-8 py-6` desktop; footer чуть компактнее (`py-4`/`py-5`)
- Anim: overlay fade `0.15s`; panel `y: 8→0, opacity 0→1, duration 0.18, ease [0.16,1,0.3,1]`

**Action sheet** (короткое меню действий у источника клика, не полноэкранный modal): L2-карточка `w-[220px] rounded-[26px] p-2`, всплывает от точки клика, свой overlay для закрытия по тапу вовне.

**Confirm dialog** (подтверждение опасного действия): компакт-вариант модалки (`md:w-[380px]`, одна колонка), без form-полей — заголовок + описание + два действия (Cancel secondary / Confirm destructive) в ряд.

**Context menu** ("..." у карточки/строки): popover L2 (`rounded-[18px] p-1.5`), список опций L0 (`rounded-[14px] px-3 py-2`), деструктивная опция — `text-rose-500`, разделена `border-t` от остальных.

---

## 6. Мобильная навигация

**Rule:** Bottom tab bar — часть App Shell (§1), не переопределяется отдельными страницами.
**Parameters:** `fixed bottom-0`, `h-16`, `bg-card border-t`, safe-area padding снизу; иконки `20-24px`; активный — `text-blue-500` + подпись `text-[0.6875rem]`. Каждый tab — самостоятельная интерактивная область не меньше `44×44px`. Пункты, не влезающие в tab bar — выносятся в полноэкранное меню (не bottom sheet): top bar с close-button, профиль-карточка (L2), разделы как Тип D.

**Breakpoints:** `< md` мобильный layout (одна колонка, tab bar) · `md` sidebar/max-width активны · `lg/xl` расширение grid-колонок. Полные нормативные правила touch targets — в §9.

---

## 7. Empty / Loading / Error states

**Rule:** Каждый список/грид, который может быть пустым, ещё не загружен, или не загрузился — обязан реализовать все три состояния, не только happy path.

**Empty state:**
**Parameters:** L2-карточка (`rounded-[26px]`), центрированный контент, icon `24px` в круге `bg-canvas`, заголовок `text-sm font-semibold`, описание `text-xs text-text-muted`, опциональная primary-кнопка действия ("Add first trade").

**Loading state:**
**Rule:** Skeleton повторяет геометрию реального контента (те же radius/размеры), не абстрактные серые полосы произвольной формы.
**Parameters:** `animate-pulse bg-canvas`, radius строго равен radius контента, который он замещает (L2 skeleton = `rounded-[26px]`, L1 = `rounded-[18px]`).

**Error state:**
**Parameters:** та же L2-обёртка что Empty, icon-круг `bg-rose-500/10 text-rose-500`, заголовок описывает проблему коротко ("Couldn't load trades"), кнопка "Retry" (secondary button).

---

## 8. Data Visualization

**Rule:** Графики используют только статусную палитру (§2), не произвольные цвета библиотек-по-умолчанию.
**Parameters:**
- Line/area chart: линия прибыли — `emerald-500`, убытка — `rose-500`, нейтральная линия (equity) — `blue-500`
- Gridlines — `border-border-card` на 40% opacity, только горизонтальные, без вертикальных линий
- Ось/подписи — `text-[0.6875rem] text-text-muted font-mono`
- Tooltip — L2-карточка компакт (`rounded-[14px] p-2 shadow-lg`), значения `tabular-nums`
- Sparkline (внутри small/medium виджета) — без осей и подписей вообще, только линия + опционально заливка градиентом того же цвета на 10% opacity
- Никогда не использовать более 3 цветов на одном графике одновременно (профит/убыток/акцент — максимум)

---

## 9. Accessibility & Touch Target Compliance

**Status:** Нормативный раздел. Его правила имеют приоритет над компактными desktop-параметрами в остальных разделах.

### Touch targets
**Rule:** Размер интерактивной области измеряется по hit area, а не по визуальному элементу. На mobile (`< md`) каждый элемент, который можно tapнуть (button, icon-button, tab, select trigger, option, checkbox/switch row, link-action), имеет минимум `44×44px` (`min-h-11 min-w-11`). Это нижняя граница; при возможности использовать `48×48px` для более комфортного touch target.

**Desktop/tablet:** Компактные controls `h-9` (36px) разрешены только на `md` и выше, где предусмотрено pointer-управление. Они всё равно должны иметь заметный focus state и не могут быть единственным способом выполнить критическое действие без клавиатурного доступа.

**Mobile toolbar:** `h-9` toolbar-controls, compact selects и compact segmented controls на mobile запрещены. Toolbar схлопывается в кнопки-триггеры (`h-11`), открывающие anchored-меню (см. §3 Toolbar → Mobile filters) — не bottom sheet для простых фильтров, не сжатие в узкую строку. Controls и варианты выбора внутри открытого меню — не менее `44px` высотой. Не уменьшать hit area ради сохранения одной строки toolbar.

**Visual size vs hit area:** Компактная визуальная геометрия допустима только внутри прозрачной или layout-обёртки с нормативной hit area. Switch использует visual track 32×52px, но интерактивен весь `min-h-11` row/wrapper. Аналогично icon, badge и маленький disclosure могут визуально оставаться компактными, если их доступная область отвечает минимуму.

### No horizontal scroll as a layout escape hatch
**Rule:** На mobile (`< md`) горизонтальный скролл контента (`overflow-x-auto`/`overflow-x-scroll`) не используется как способ "впихнуть" элементы, которые не помещаются по ширине — ни для списка разделов (Тип D), ни для segmented control с большим числом пунктов, ни для карточек/чипов в ряд. Не относится к сущностям, где скролл — это сам контент (галерея скриншотов, лента дат календаря) — там он осознан, а не следствие нехватки места.

**Почему:** горизонтальный скролл на мобильном экране плохо обнаруживаем (нет визуальной подсказки, что можно скроллить вбок), конфликтует с системным жестом "смахнуть назад", и обычно является следствием того, что desktop-layout скопирован на мобиль без переосмысления.

**Parameters — что использовать вместо:**
| Ситуация | Вместо horizontal scroll |
|---|---|
| Список разделов (Тип D) на `< lg` | Вертикальный список L1-строк на всю ширину |
| Segmented control с 4+ пунктами | Заменить на `Select` (§4) — тот же trigger+panel паттерн, что уже есть в системе, не изобретать отдельное anchored-меню для табов |
| Ряд чипов/тегов-фильтров | `flex-wrap` — перенос на новую строку |
| Ряд карточек (напр. "Best setups") | Вертикальный стек, либо переход в полноэкранный список |
| Toolbar с большим числом controls | Схлопывание в 1-2 кнопки-триггера, не растягивание в скроллящуюся полосу |

**Допустимые исключения:** галерея изображений, горизонтальная лента дат, явный carousel. В этих случаях — обязателен визуальный намёк на продолжение (обрезанный край следующего элемента).

### Text scaling and readable type
**Rule:** Font size задаётся только `rem`-based Tailwind utility или явным значением в `rem`; не фиксировать размер текста в `px`. Layout не должен обрезать текст и обязан выдерживать увеличение текста: разрешать перенос, гибкую высоту строк и не делать критические поля/кнопки фиксированной высоты меньше их содержимого.

**Minimum:** `0.6875rem` допустим только для secondary caption/non-essential metadata. Основной текст интерфейса, labels, navigation, input values, errors и action labels — минимум `0.75rem` (`text-xs`). Не применять `text-[10px]` как основной UI text.

### Keyboard, focus and semantics
**Rule:** Любое интерактивное действие доступно с клавиатуры и имеет видимый `:focus-visible` state с достаточным контрастом. Не заменять нативный `<button>`/`<input>` несемантическим `div`; если custom control необходим, реализовать корректную role, state и keyboard behavior.

**Parameters:** visible label — предпочтителен; для icon-only controls обязателен `aria-label`. Modal, bottom sheet, popover и context menu закрываются по `Escape`; modal/bottom sheet удерживают focus внутри при открытии и возвращают его в trigger после закрытия. Учитывать `prefers-reduced-motion`: отключать или существенно сокращать несущественные animation.

### Color and state
**Rule:** Цвет не является единственным носителем состояния: profit/loss, validation, selected и disabled состояния дублируются текстом, icon или label. Проверять контраст текста, focus indicator и границ в каждом состоянии; статусные цвета из §2 не заменяют эту проверку.

## 10. Правила для агента

1. Radius определяется Surface-уровнем (§2), не местом на странице "по ощущению"
2. Каждый `layoutId` — namespaced именем страницы/компонента (§2 Motion) — не переиспользовать голые строки
3. Каждая страница — оба состояния (desktop §3 + mobile §6) сразу, не отдельным этапом
4. Каждый список/грид — Empty + Loading + Error, не только happy path (§7)
5. Компонент не меняет анатомию между list/grid/mobile/desktop — меняется только layout-обёртка
6. Modal/Select/Context-menu — единственные описанные реализации (§5, §4) — не создавать альтернативные
7. Графики — только статусная палитра, максимум 3 цвета (§8)
8. Тема — только семантические классы, никогда hex
9. Числа — всегда `tabular-nums`
10. Новый компонент вне этого файла — anatomy по аналогии с ближайшим разделом, не с нуля
11. На mobile ни один touch target не меньше `44×44px`; `h-9` toolbar controls не использовать — применять паттерн §9
12. Размеры текста — только `rem`-based utility/значения; основной UI text не меньше `text-xs`, `text-[10px]` запрещён (§2, §9)
