# DESIGN_SYSTEM.md — Trading Journal Design System Guide

> Строгий справочник и визуальный стандарт для разработки интерфейсов в проекте.
> Все новые компоненты, рефакторинг и верстка страниц обязаны соблюдать этот гайдлайн.

---

## 1. CORE PRINCIPLES (Ключевые принципы)

1. **Modern FinTech / Linear & Raycast Aesthetic**:
   - Строгий, чистый и собранный интерфейс с акцентом на типографику и работу с отступами.
2. **Solid Surfaces & No Blur (Абсолютное отсутствие размытия)**:
   - В проекте действует жесткое глобальное правило: `* { backdrop-filter: none !important; }`.
   - **Никакого глассморфизма (`backdrop-blur`)**. Все слои и поверхности имеют непрозрачный, чистый фоновый цвет (`bg-card`, `bg-canvas`).
3. **Объем через уровни высоты и мягкие тени**:
   - Фон (`bg-canvas`) $\rightarrow$ Карточки первого уровня (`bg-card` + `border border-border-card` + `shadow-sm`) $\rightarrow$ Плавающие меню/модалки (`shadow-xl` / `shadow-2xl`).
4. **Фирменная система скруглений**:
   - Крупные, выверенные радиусы: `rounded-[26px]` для карточек и модалок, `rounded-[18px]` для интерактивных элементов и полей ввода.

---

## 2. TOKEN USAGE & PALETTE (Токены и палитра)

Проект работает на **Tailwind CSS v4** с динамическими семантическими токенами в `@theme` (файл `src/styles/global.css`), реагирующими на класс `.dark`.

### Семантические токены поверхностей и текста

| Роль | Tailwind класс | Light Theme (HEX) | Dark Theme (HEX) |
| :--- | :--- | :--- | :--- |
| **Page Canvas** (Фон страницы) | `bg-canvas` / `bg-background` | `#f4f5f8` | `#0c0e14` |
| **Card Surface** (Карточки / Сайдбар) | `bg-card` | `#ffffff` | `#161922` |
| **Card Border** (Границы контейнеров) | `border-border-card` / `border-border` | `#e2e5eb` | `#262b38` |
| **Main Text** (Заголовки, ключевые цифры) | `text-text-main` / `text-foreground` | `#111827` | `#f9fafb` |
| **Muted Text** (Описания, лейблы, подписи) | `text-text-muted` / `text-muted-foreground` | `#6b7280` | `#9ca3af` |
| **Muted Surface** (Внутренние слоты, инпуты) | `bg-canvas` / `bg-muted` | `#f4f5f8` / `#f1f3f6` | `#0c0e14` / `#1e2230` |

### Акцентные и семантические цвета

* **Primary (Синий)**:
  - Основной: `bg-blue-500` (`hover:bg-blue-600`), `text-blue-500`
  - Мягкая подложка (10% alpha): `bg-blue-500/10`
  - Тень / Glow: `shadow-blue-500/20`
* **Success (Зеленый / Профит)**:
  - Основной: `text-green-500`
  - Мягкая подложка: `bg-green-500/10`, бейджи: `text-green-600 dark:text-green-400`
* **Danger (Красный / Риск / Logout)**:
  - Основной: `text-red-500`, `bg-red-500` (`hover:bg-red-600`)
  - Мягкая подложка: `bg-red-500/10 hover:bg-red-500/15`
* **Warning (Желтый / Идеи сделок)**:
  - Основной: `text-yellow-500`
  - Мягкая подложка: `bg-yellow-500/10`

### Спецификация теней (Elevation)

* `shadow-sm` — плоские карточки дашборда и сайдбар (`shadow-black/[0.03]`).
* `shadow-md` — интерактивные переключатели, кнопки с акцентом, дропдауны.
* `shadow-xl` / `shadow-2xl` — активные перетаскиваемые карточки (dnd), модальные окна.

---

## 3. COMPONENT BLUEPRINTS (Готовые шаблоны компонентов)

### 1. Card / Widget Panel (Базовая карточка)
```tsx
<div className="bg-card border border-border-card rounded-[26px] p-5 flex flex-col shadow-sm h-full w-full overflow-hidden transition-all">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-text-muted font-medium text-sm">Card Title</h3>
  </div>
  <div className="flex-1 flex flex-col">
    {/* Content */}
  </div>
</div>
```

### 2. Primary Action Button
```tsx
<button 
  type="button"
  className="w-full h-11 px-4 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-[18px] font-semibold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Plus size={18} />
  <span>Action Label</span>
</button>
```

### 3. Secondary / Ghost Button
```tsx
<button 
  type="button"
  className="h-11 px-4 flex items-center justify-center gap-2 bg-card border border-border-card text-text-muted hover:text-text-main hover:bg-canvas rounded-[18px] font-medium text-sm active:scale-[0.98] transition-colors cursor-pointer"
>
  <span>Cancel</span>
</button>
```

### 4. Input / Form Field
```tsx
<div className="space-y-1.5 w-full">
  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
    Field Label
  </label>
  <div className="relative">
    <input 
      type="text"
      placeholder="Placeholder text..."
      className="w-full h-11 bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main placeholder:text-text-muted/60 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
    />
  </div>
</div>
```

### 5. Pill / Badge
```tsx
{/* Положительный бейдж */}
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500">
  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
  +4.2% Today
</span>

{/* Микро-лейбл метрики */}
<div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
  DAILY RISK
</div>
```

### 6. Modal Overlay & Dialog
> **Правило для мобильных устройств**: на мобильных экранах (`< md`) все модальные окна открываются **полноэкранно (Full Screen)** с фиксированной высотой **`100dvh`** (`h-[100dvh] w-full rounded-none`), без эффекта «полушторок» или плавающих островков. На десктопе (`md:`) центрируются со скруглением `rounded-[26px]`.

```tsx
<AnimatePresence>
  {isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4">
      {/* Backdrop (строго без блюра) */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 hidden md:block"
      />
      
      {/* Dialog Window: Full-Screen 100dvh on mobile, Centered Card on desktop */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-lg bg-card md:border md:border-border-card rounded-none md:rounded-[26px] shadow-2xl overflow-hidden flex flex-col z-10"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-border-card shrink-0">
          <h2 className="font-semibold text-lg text-text-main">Modal Header</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body with custom scrollbar */}
        <div className="p-5 md:p-6 flex-1 overflow-y-auto custom-scrollbar">
          {/* Modal body */}
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

---

## 4. ICONS & ASSETS (Иконки и графика)

1. **Библиотека**: исключительно `lucide-react`.
2. **Размеры по умолчанию**:
   - `size={16}` — микро-кнопки, индикаторы, бейджи, стрелки пагинации.
   - `size={20}` / `size={21}` — основная навигация сайдбара, кнопки действий, тулбары.
   - `size={24}` — ключевые карточки, заголовки виджетов.
   - `size={28}` / `size={32}` — пустые состояния («Empty States»), крупные превью.
3. **Stroke width**: дефолтный `2px` (не увеличивать без необходимости).
4. **Контейнер иконки**: для идеальной центровки иконки заворачиваются в фиксированный квадрат `w-10 h-10 flex items-center justify-center shrink-0 rounded-xl`.

---

## 5. MOTION & INTERACTION (Анимации и отклики)

1. **Пружинные анимации Framer Motion**:
   - Модальные окна, поп-оверы, всплывающие плашки:
     ```ts
     transition={{ type: 'spring', damping: 25, stiffness: 300 }}
     ```
   - Плавное сворачивание/разворачивание (Сайдбар):
     ```ts
     transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
     ```
2. **CSS Transitions**:
   - Для смены цветов фона и текста: `transition-colors duration-150`.
   - Для трансформаций и размеров: `transition-all duration-200 ease-out`.
3. **Тактильный отклик (Active States)**:
   - Все кликабельные кнопки и карточки обязаны иметь эффект нажатия:
     `active:scale-[0.98]` (для крупных элементов) или `active:scale-95` (для малых кнопок и иконок).
4. **Hover Micro-effects**:
   - Иконки внутри кнопок: `group-hover:scale-105` или `group-hover:scale-110`.
   - Кнопка New Entry / Add: `group-hover:rotate-90 duration-200`.

---

## 6. STRICT "NEVER DO" (Категорические запреты)

* ❌ **ЗАПРЕЩЕНО использовать `backdrop-blur-*`**: в проекте действует strict-правило против размытий. Никаких стеклянных фонов.
* ❌ **ЗАПРЕЩЕН хардкод произвольных HEX-цветов в классах** (например, `bg-[#1a1a1a]`, `text-[#333]`). Использовать исключительно семантические токены: `bg-card`, `bg-canvas`, `text-text-main`, `text-text-muted`, `border-border-card`.
* ❌ **ЗАПРЕЩЕНЫ стандартные плоские серые рамки без тени** (вроде `border border-gray-300` без `shadow-sm` и скруглений).
* ❌ **ЗАПРЕЩЕНО ломать радиусы**: нельзя использовать случайные значения вроде `rounded-md` для основных контейнеров. Строго `rounded-[26px]` для карточек и `rounded-[18px]` для кнопок и инпутов.
* ❌ **ЗАПРЕЩЕН мгновенный сброс layout при анимациях**: не монтировать/размонтировать текст внутри анимированных контейнеров без `overflow-hidden` и плавного изменения `width` / `opacity`.
* ❌ **ЗАПРЕЩЕН неконтролируемый скролл**: для элементов навигации фиксированной высоты использовать `overflow-hidden`, избегая паразитных скроллбаров.
* ❌ **ЗАПРЕЩЕНО делать мобильные модалки «шторками» или окнами с частичной высотой (vh/px)**: все мобильные модальные окна обязаны быть строго полноэкранными (Full Screen) с фиксированной высотой 100dvh (`h-[100dvh]`) и корректным учетом Safe Area (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), исключая скачки интерфейса из-за мобильных браузерных панелей.

---

## 7. MOBILE ADAPTATION & BOTTOM NAVIGATION (Мобильный дизайн)

Мобильный интерфейс полностью наследует колористику, радиусы и физику десктопного приложения, адаптируя компоновку под управление одной рукой.

### 1. Bottom Tab Bar Architecture
* **Фиксированное позиционирование**:
  `fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border-card`
* **Учет жестовой полосы (Safe Area)**:
  `style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}`
* **Высота панели**: фиксированные `h-16` (64px) с распределением иконок `justify-around`.
* **Автоскрытие при скролле**:
  Скрытие вниз `animate={{ y: isVisible ? 0 : '100%' }}` через пружину `type: 'spring', damping: 25, stiffness: 300` при скролле вниз (> 60px) и моментальное появление при скролле вверх.
* **Центральная кнопка Add Entry**:
  Выделенный интерактивный слот `h-11 w-11 rounded-[18px] bg-blue-500 text-white shadow-blue-500/20` с поворотом иконки `rotate-45` при открытии контекстного меню.

### 2. Mobile Full-Screen Menu Pattern (Единый полноэкранный интерфейс)
Кнопка «Menu» в мобильном таб-баре плавно переключает интерфейс в полноэкранный режим без эффекта «шторки», одновременно скрывая нижний таб-бар:
* **Контейнер меню (Full Screen Canvas)**:
  ```tsx
  <motion.div 
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    className="md:hidden fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
    style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
  >
  ```
* **Верхняя строка управления**:
  Заголовок `Menu` (`text-xl font-bold tracking-tight`) и круглая плавающая кнопка закрытия `w-10 h-10 rounded-full bg-card border border-border-card` с иконкой `X`.
* **Цельный скролл-контейнер (Single Seamless Canvas)**:
  Все элементы находятся в едином вертикальном потоке `space-y-5`, без отдельных прибитых снизу плашек и рамок.
* **Группированные карточки (Grouped Cards)**:
  - **Профиль пользователя**: `p-4 bg-card border border-border-card rounded-[24px]` с аватаром, статусом сессии и шевроном перехода в профиль.
  - **Секция навигации**: единый блок `bg-card border border-border-card rounded-[24px] p-2 space-y-1` с пунктами `rounded-[18px] h-13` и активной подсветкой.
  - **Секция настроек и выхода (Settings & Preferences)**: единый блок `rounded-[24px]` со встроенным переключателем темы (Light/Dark) и кнопкой Log Out/Sign In без искусственных разделительных панелей.

### 3. Client-Side Page Transitions (Astro Transitions)
Все ссылки в приложении используют бесшовный клиентский роутинг:
- Корневой `<ClientRouter />` в `<head>` лейаута.
- Ссылки навигации с атрибутом `data-astro-prefetch="load"`.
- Сохранение тем и состояния сайдбара без перезагрузки страницы через обработчик `astro:after-swap`.

### 4. Mobile Full-Screen Modals (Полноэкранные модалки — 100dvh)
**Жесткий стандарт**: Все модальные окна на мобильных устройствах (`< md`) открываются строго **на весь экран** с фиксированной динамической высотой **`100dvh`**:

1. **Никаких шторок и плавающих островков**:
   - На экранах смартфонов модалка занимает **100% ширины и ровно `100dvh` высоты** (`fixed inset-0 w-full h-[100dvh]`).
   - Исключены любые частичные высоты (`h-[92vh]`, `h-[80vh]`, `max-h-[85vh]` и т.д.), которые вызывают скачки и разрывы интерфейса при скрытии/появлении системных адресных строк браузеров (iOS Safari, Android Chrome).
2. **Геометрия и границы**:
   - **Mobile (`< md`)**: `rounded-none`, границы отсутствуют (`border-0`), заполнение всего экрана.
   - **Desktop (`md:`)**: центрированное модальное окно `md:rounded-[26px]`, `md:max-h-[90vh]`, `md:border md:border-border-card`.
3. **Безопасные зоны (Safe Areas)**:
   - Верхний отступ шапки: `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}`.
   - Нижний отступ подвала с кнопками: `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}`.
4. **Структура контейнера модалки (Единый визуальный стиль с мобильным меню)**:
   - **Фон и Блокировка**: Фон строго `bg-card` на всех устройствах. Для фиксации страницы под модалкой обязателен вызов `document.body.style.overflow = 'hidden'` через `useEffect` (строго только для мобильных экранов `window.innerWidth < 768`, чтобы не прятать системный скроллбар на десктопе).
   - **Шапка (Header)**: На мобильных у шапки убирается нижняя линия (`border-b-0 md:border-b`), отступы равны `px-6 pt-5 pb-3 md:py-4`, заголовок крупный (`text-xl font-bold tracking-tight`), а кнопка закрытия оформляется как отдельная круглая карточка (`w-10 h-10 bg-card border border-border-card shadow-sm`). Иконка заголовка остается видимой на всех устройствах.
   - **Тело (Body)**: Отступы на мобильном `px-6 pt-2 pb-6 md:p-6` для безопасного зазора снизу.
   - **Подвал (Footer)**: Нижние кнопки расширяются на всю ширину `flex-1` для удобного тапа.

   **Эталонный код (Blueprint)**:
   ```tsx
   <motion.div
     initial={{ opacity: 0, scale: 0.98, y: 12 }}
     animate={{ opacity: 1, scale: 1, y: 0 }}
     exit={{ opacity: 0, scale: 0.98, y: 12 }}
     transition={{ type: 'spring', damping: 26, stiffness: 320 }}
     className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-xl bg-card rounded-none md:rounded-[26px] md:border md:border-border-card shadow-2xl overflow-hidden flex flex-col z-10"
     style={{
       paddingTop: 'env(safe-area-inset-top, 0px)',
       paddingBottom: 'env(safe-area-inset-bottom, 0px)',
     }}
   >
     {/* Фиксированная шапка в стиле Mobile Menu */}
     <div className="flex items-center justify-between px-6 pt-5 pb-3 md:py-4 border-b-0 md:border-b border-border-card shrink-0">
       <div className="flex items-center gap-2.5">
         <div className="flex w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 items-center justify-center font-bold text-sm">
           <Zap size={18} />
         </div>
         <h2 className="text-xl md:text-base font-bold md:font-semibold text-text-main tracking-tight md:tracking-normal">
           Modal Title
         </h2>
       </div>
       <button 
         onClick={onClose} 
         className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-card md:bg-transparent border border-border-card md:border-transparent flex items-center justify-center text-text-muted hover:text-text-main hover:bg-canvas active:scale-90 md:active:scale-100 transition-all shadow-sm md:shadow-none cursor-pointer"
       >
         <X size={20} className="md:w-[18px] md:h-[18px]" />
       </button>
     </div>

     {/* Скроллируемое тело формы */}
     <form className="px-6 pt-2 pb-6 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
       {/* Modal body */}
       
       {/* Нижние кнопки действий: flex-1 на мобильных */}
       <div className="pt-4 border-t border-border-card flex items-center justify-end gap-2.5 shrink-0">
         <button className="flex-1 sm:flex-initial h-11 ...">Cancel</button>
         <button className="flex-1 sm:flex-initial h-11 ...">Submit</button>
       </div>
     </form>
   </motion.div>
   ```



