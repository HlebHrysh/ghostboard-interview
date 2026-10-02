# ⚡ Ghostboard LeetCode Copilot Chrome Extension

**100% точне та миттєве розпізнавання завдань LeetCode без потреби в OCR.**

Розширення автоматично зчитує заголовок, опис завдання, приклади тестів, обмеження (Constraints) та мову з активної сторінки LeetCode при натисканні гарячої клавіші `Alt + G` і передає безпосередньо у ваш Ghostboard Copilot HUD (`/api/ai/interview-copilot` та `/api/ai/interview-sync`).

---

## 🚀 Як встановити в Chrome / Brave / Edge (30 секунд)

1. Відкрийте сторінку розширень у вашому браузері:
   * **Chrome**: `chrome://extensions`
   * **Brave**: `brave://extensions`
   * **Edge**: `edge://extensions`
2. Увімкніть **«Режим розробника»** (Developer mode) у правому верхньому кутку.
3. Натисніть **«Завантажити розпаковане розширення»** (Load unpacked).
4. Оберіть папку `extension` у проєкті Ghostboard:
   ```
   /mnt/storage_d/ghostboard-interview/extension
   ```
5. Розширення встановлено! Закріпіть іконку ⚡ Ghostboard на панелі браузера.

---

## 🎮 Як користуватися

1. Запустіть Ghostboard на `http://localhost:3001` (або відкрийте кабінет `/interview`).
2. Відкрийте будь-яку задачу на LeetCode, наприклад:
   `https://leetcode.com/problems/two-sum/`
3. Натисніть **`Alt + G`** (або **`Alt + Shift + G`**).
4. У кутку сторінки з'явиться сповіщення:
   > ⚡ **Ghostboard: Extracting "Two Sum" & sending to Ghostboard HUD...**  
   > ✓ **Solution synced to Ghostboard HUD!**
5. Ваша основна панель суфлера Ghostboard (на другому моніторі, телефоні або сусідній вкладці) **миттєво відобразить**:
   - Оптимальний Staff-Engineer код з коментарями
   - Пояснення алгоритму під 60 секунд
   - Time & Space Complexity ($O(N)$, $O(1)$ тощо)
   - Покрокові підказки (Hints)

---

## ⚙️ Налаштування

Клікніть по іконці розширення на панелі інструментів:
* **Ghostboard Studio URL**: за замовчуванням `http://localhost:3001` (можна змінити на вашу IP-адресу або продакшен домен).
* **Solution Language**: оберіть мову пояснення (Українська, English, Polski, Deutsch тощо).
* **Кнопка «⚡ Extract & Solve Problem»**: альтернативний запуск без клавіатури.

---

## 🛡️ Стелс та Безпека
* Жодних підозрілих ін'єкцій у код LeetCode.
* Запит виконується ізольованим Service Worker у фоні без навантаження на сторінку.
* 100% сумісність з Manifest V3.
