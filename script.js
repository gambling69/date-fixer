(() => {

  'use strict';

// Firebase Realtime Database endpoint.

// This writes only to /dateTime and updates the same record each time.

const FIREBASE_DATE_TIME_URL =

    'https://update-bb-default-rtdb.firebaseio.com/dateTime.json';

const screens = [...document.querySelectorAll('.screen')];

const progressBars = [...document.querySelectorAll('[data-progress]')];

const yesButton = document.getElementById('yesButton');

const noButton = document.getElementById('noButton');

const choiceWrap = document.getElementById('choiceWrap');

const microcopy = document.getElementById('microcopy');

const restartButton = document.getElementById('restartButton');

const copyButton = document.getElementById('copyButton');

const copyFeedback = document.getElementById('copyFeedback');

const toast = document.getElementById('toast');

const dateInput = document.getElementById('dateInput');

const timeInput = document.getElementById('timeInput');

const dateIconDay = document.getElementById('dateIconDay');

const datePreview = document.getElementById('datePreview');

const timePreview = document.getElementById('timePreview');

const finalDateTime = document.getElementById('finalDateTime');

const finalCopy = document.getElementById('finalCopy');

let dodgeCount = 0;

let lastDodgeAt = 0;

let toastTimer;

let saveTimer;

let saveSequence = 0;

let saveQueue = Promise.resolve();

function showToast(message) {

    if (!toast) return;

    toast.textContent = message;

    toast.classList.add('show');

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);

  }

function formatDate(value) {

    if (!value) return '';

const [year, month, day] = value.split('-').map(Number);

// Use local midday to avoid date shifts caused by timezone conversion.

const date = new Date(year, month - 1, day, 12, 0, 0);

    return new Intl.DateTimeFormat('en-GB', {

      weekday: 'long',

      day: 'numeric',

      month: 'long',

      year: 'numeric'

    }).format(date);

  }

function formatTime(value) {

    if (!value) return '';

const [hours, minutes] = value.split(':').map(Number);

const period = hours >= 12 ? 'PM' : 'AM';

const hour12 = hours % 12 || 12;

    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;

  }

function updateDateTimeDisplay() {

    if (!dateInput || !timeInput || !dateInput.value || !timeInput.value) {

      return false;

    }

const dateText = formatDate(dateInput.value);

const timeText = formatTime(timeInput.value);

const dayNumber = String(Number(dateInput.value.split('-')[2]));

    if (dateIconDay) dateIconDay.textContent = dayNumber;

    if (datePreview) datePreview.textContent = dateText;

    if (timePreview) timePreview.textContent = timeText;

    if (finalDateTime) finalDateTime.textContent = `${dateText} · ${timeText}`;

    if (finalCopy) finalCopy.textContent = `See you on ${dateText.split(',')[0]}!`;

    return true;

  }

// Automatically save the latest date and time to Firebase.

// A short debounce avoids duplicate writes when browsers fire both

// "input" and "change" for the same selection.

function scheduleFirebaseSave() {

    if (!dateInput?.value || !timeInput?.value) return;

    updateDateTimeDisplay();

    clearTimeout(saveTimer);

const thisSaveSequence = ++saveSequence;

    showToast('Saving date and time to Firebase…');

    saveTimer = setTimeout(() => {

const payload = {

        date: dateInput.value,

        time: timeInput.value,

        timezone: 'Asia/Dhaka',

        updatedAt: { '.sv': 'timestamp' }

      };

// Queue writes so a slower earlier request cannot overwrite a newer choice.

      saveQueue = saveQueue

        .catch(() => {

// Keep the queue usable after a previous failed request.

        })

        .then(async () => {

const response = await fetch(FIREBASE_DATE_TIME_URL, {

            method: 'PUT',

            headers: {

              'Content-Type': 'application/json'

            },

            body: JSON.stringify(payload)

          });

          if (!response.ok) {

let detail = '';

            try {

const errorBody = await response.json();

              detail = errorBody?.error ? `: ${errorBody.error}` : '';

            } catch (_) {

// The response may not contain JSON.

            }

            throw new Error(`Firebase HTTP ${response.status}${detail}`);

          }

        })

        .then(() => {

          if (thisSaveSequence === saveSequence) {

            showToast('Date and time saved to Firebase ✓');

          }

        })

        .catch((error) => {

          console.error('Firebase date/time save failed:', error);

          if (thisSaveSequence === saveSequence) {

            showToast('Save failed. Check Firebase Database Rules and connection.');

          }

        });

    }, 350);

  }

function showScreen(id) {

    if (id === 'screen3' || id === 'screen4') {

      if (!dateInput?.value || !timeInput?.value) {

        showToast('Please choose both a date and a time.');

        if (!dateInput?.value) dateInput?.focus();

        else timeInput?.focus();

        return;

      }

      updateDateTimeDisplay();

    }

    screens.forEach((screen) => {

const active = screen.id === id;

      screen.hidden = !active;

      screen.classList.toggle('active', active);

    });

const index = screens.findIndex((screen) => screen.id === id);

    progressBars.forEach((bar, i) => {

      bar.classList.toggle('active', i <= index);

    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (id === 'screen4') celebrate();

  }

  yesButton?.addEventListener('click', () => showScreen('screen2'));

  document.querySelectorAll('[data-next]').forEach((button) => {

    button.addEventListener('click', () => {

// Save the selected values when continuing from the date/time screen,

// even if the visitor keeps the prefilled defaults unchanged.

      if (button.closest('.screen')?.id === 'screen2') {

        scheduleFirebaseSave();

      }

      showScreen(button.dataset.next);

    });

  });

function handleDateTimeChange() {

    updateDateTimeDisplay();

    scheduleFirebaseSave();

  }

  dateInput?.addEventListener('input', handleDateTimeChange);

  dateInput?.addEventListener('change', handleDateTimeChange);

  timeInput?.addEventListener('input', handleDateTimeChange);

  timeInput?.addEventListener('change', handleDateTimeChange);

  updateDateTimeDisplay();

// NO-button movement adapted from the user's reference code.
// The button dodges before the cursor reaches it and also escapes touch/pen taps.
const dodgeLines = [
  'Haha, too slow 😄 Try your luck!',
  'This button is doing cardio now 🙃',
  'Okay, it really does not want to sit still.',
  'Just kidding — you can still say no. 🙂'
];

function dodgeNoButton(event, force = false) {
  if (!choiceWrap || !yesButton || !noButton) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  // Cool down mouse movement slightly to avoid excessive layout work.
  // Touch/pen taps bypass the cooldown so every tap makes the button escape.
  const now = performance.now();
  if (!force && now - lastDodgeAt < 48) return false;
  lastDodgeAt = now;

  const yesRect = yesButton.getBoundingClientRect();
  const noRect = noButton.getBoundingClientRect();

  // The current bounding rectangle includes the last transform. Remove the
  // tracked offset so each new target is calculated from the original position.
  const currentX = Number.parseFloat(noButton.dataset.dodgeX || '0');
  const currentY = Number.parseFloat(noButton.dataset.dodgeY || '0');
  const baseLeft = noRect.left - currentX;
  const baseTop = noRect.top - currentY;
  const margin = 12;

  const minX = Math.max(-260, margin - baseLeft);
  const maxX = Math.min(260, window.innerWidth - margin - (baseLeft + noRect.width));
  const minY = Math.max(-110, margin - baseTop);
  const maxY = Math.min(110, window.innerHeight - margin - (baseTop + noRect.height));

  const lowX = Math.min(minX, maxX);
  const highX = Math.max(minX, maxX);
  const lowY = Math.min(minY, maxY);
  const highY = Math.max(minY, maxY);

  const pointerX = Number.isFinite(event?.clientX) ? event.clientX : null;
  const pointerY = Number.isFinite(event?.clientY) ? event.clientY : null;

  let best = null;
  let bestDistance = -1;

  // Choose a position that avoids the YES button and gets away from the pointer.
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const x = lowX + Math.random() * (highX - lowX);
    const y = lowY + Math.random() * (highY - lowY);
    const candidate = {
      left: baseLeft + x,
      right: baseLeft + x + noRect.width,
      top: baseTop + y,
      bottom: baseTop + y + noRect.height
    };

    const overlapsYes =
      candidate.left < yesRect.right + 14 &&
      candidate.right > yesRect.left - 14 &&
      candidate.top < yesRect.bottom + 12 &&
      candidate.bottom > yesRect.top - 12;

    if (overlapsYes) continue;

    const pointerNear = pointerX !== null && pointerY !== null &&
      pointerX >= candidate.left - 95 && pointerX <= candidate.right + 95 &&
      pointerY >= candidate.top - 70 && pointerY <= candidate.bottom + 70;

    const distance = pointerX !== null && pointerY !== null
      ? Math.hypot(
          candidate.left + noRect.width / 2 - pointerX,
          candidate.top + noRect.height / 2 - pointerY
        )
      : Math.random();

    if (!pointerNear) {
      best = { x, y };
      break;
    }

    if (distance > bestDistance) {
      bestDistance = distance;
      best = { x, y };
    }
  }

  if (!best) {
    best = {
      x: lowX + Math.random() * (highX - lowX),
      y: lowY + Math.random() * (highY - lowY)
    };
  }

  // Fast movement, even if style.css has a slower default transform transition.
  noButton.style.transition =
    'transform 45ms cubic-bezier(.2,.8,.2,1), background .2s ease, box-shadow .2s ease';
  noButton.style.transform = `translate3d(${best.x}px, ${best.y}px, 0)`;
  noButton.dataset.dodgeX = String(best.x);
  noButton.dataset.dodgeY = String(best.y);

  dodgeCount += 1;
  if (microcopy) {
    microcopy.textContent = dodgeLines[Math.min(dodgeCount - 1, dodgeLines.length - 1)];
  }

  return true;
}

// Mouse: begin dodging before the cursor reaches the button.
document.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse' || !noButton) return;
  if (noButton.closest('.screen')?.hidden) return;

  const rect = noButton.getBoundingClientRect();
  const nearButton =
    event.clientX >= rect.left - 62 &&
    event.clientX <= rect.right + 62 &&
    event.clientY >= rect.top - 48 &&
    event.clientY <= rect.bottom + 48;

  if (nearButton) dodgeNoButton(event);
}, { passive: true });

// Also dodge if the mouse enters the button between pointermove events.
noButton?.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') dodgeNoButton(event);
});

// Touchscreen/stylus: move on contact and cancel the tap that would click NO.
// Keyboard activation remains available for people who intentionally choose NO.
let suppressTouchClick = false;
let suppressTouchClickTimer;

noButton?.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

  const moved = dodgeNoButton(event, true);
  if (!moved) return;

  event.preventDefault();
  suppressTouchClick = true;
  clearTimeout(suppressTouchClickTimer);
  suppressTouchClickTimer = setTimeout(() => {
    suppressTouchClick = false;
  }, 600);
}, { passive: false });

noButton?.addEventListener('focus', () => {
  if (microcopy) {
    microcopy.textContent = 'You can choose either answer — this is just a silly effect.';
  }
});

noButton?.addEventListener('click', event => {
  // Ignore a synthetic click caused by the touchscreen tap that made NO dodge.
  // Keyboard-generated clicks have detail === 0 and remain usable.
  if (suppressTouchClick && event.detail !== 0) {
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressTouchClick = false;
    clearTimeout(suppressTouchClickTimer);
    return;
  }

  suppressTouchClick = false;
  clearTimeout(suppressTouchClickTimer);
  if (microcopy) microcopy.textContent = 'No worries — thanks for being honest. 🙂';
  noButton.style.transform = 'none';
  noButton.dataset.dodgeX = '0';
  noButton.dataset.dodgeY = '0';
  dodgeCount = 0;
  showToast('No worries 🙂');
});


function celebrate() {

const symbols = ['✦', '✧', '✳', '✦', '·'];

    for (let i = 0; i < 24; i += 1) {

const bit = document.createElement('span');

      bit.className = 'confetti';

      bit.textContent = symbols[Math.floor(Math.random() * symbols.length)];

      bit.style.left = `${Math.random() * 100}vw`;

      bit.style.setProperty('--drift', `${Math.random() * 150 - 75}px`);

      bit.style.animationDelay = `${Math.random() * 0.6}s`;

      bit.style.fontSize = `${10 + Math.random() * 12}px`;

      bit.style.color = ['#e4d5f4', '#c8b0e5', '#dca9c6', '#f5eafb'][Math.floor(Math.random() * 4)];

      document.body.appendChild(bit);

      setTimeout(() => bit.remove(), 3800);

    }

  }

async function copyTextFallback(text) {

const textArea = document.createElement('textarea');

    textArea.value = text;

    textArea.setAttribute('readonly', '');

    textArea.style.position = 'fixed';

    textArea.style.opacity = '0';

    textArea.style.pointerEvents = 'none';

    document.body.appendChild(textArea);

    textArea.select();

    textArea.setSelectionRange(0, textArea.value.length);

let copied = false;

    try {

      copied = document.execCommand('copy');

    } finally {

      textArea.remove();

    }

    if (!copied) {

      throw new Error('Clipboard copy is not available in this browser.');

    }

  }

  copyButton?.addEventListener('click', async () => {

    updateDateTimeDisplay();

const plan = `plan\n${formatDate(dateInput.value)}\n${formatTime(timeInput.value)} Bangladesh time (UTC+6)\nPlace: up to Niha!`;

    try {

      if (navigator.clipboard?.writeText) {

        await navigator.clipboard.writeText(plan);

      } else {

        await copyTextFallback(plan);

      }

      if (copyFeedback) {

        copyFeedback.textContent = 'Copied! Your custom date and time are included.';

      }

    } catch (error) {

      if (copyFeedback) {

        copyFeedback.textContent =

          `Copy is blocked by this browser. Your plan: ${formatDate(dateInput.value)} · ${formatTime(timeInput.value)}.`;

      }

    }

  });

  restartButton?.addEventListener('click', () => {

    if (noButton) noButton.style.transform = 'none';

    dodgeCount = 0;

    if (microcopy) {

      microcopy.textContent = 'Pick your answer. No pressure, just asking. 🙂';

    }

    if (copyFeedback) copyFeedback.textContent = '';

    showScreen('screen1');

  });

})();