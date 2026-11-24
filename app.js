const header = document.querySelector('.site-header');
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
const narrow = matchMedia('(max-width: 760px)');

function menuIsOpen() {
  return menu.getAttribute('aria-expanded') === 'true';
}

function closeMenu(restoreFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  if (restoreFocus) menu.focus();
}

function syncMenu() {
  closeMenu();
  menu.hidden = !narrow.matches;
  header.classList.toggle('has-menu', narrow.matches);
}

menu.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', String(!menuIsOpen()));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuIsOpen()) {
    closeMenu(true);
  }
});

document.addEventListener('click', (event) => {
  if (menuIsOpen() && !header.contains(event.target)) closeMenu();
});

nav.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || !narrow.matches) return;
  closeMenu();
  const section = document.querySelector(link.hash);
  section.tabIndex = -1;
  section.focus({ preventScroll: true });
});

narrow.addEventListener('change', syncMenu);
syncMenu();

const backToTop = document.querySelector('#back-to-top');

function syncBackToTop() {
  backToTop.classList.toggle('is-floating', window.scrollY >= window.innerHeight);
}

window.addEventListener('scroll', syncBackToTop, { passive: true });
window.addEventListener('resize', syncBackToTop);
syncBackToTop();

const form = document.querySelector('#inquiry-form');
const submit = form.querySelector('button[type="submit"]');
const statusMessage = document.querySelector('#form-status');
const fields = Object.fromEntries(['service', 'task', 'contact'].map((name) => [name, form.elements.namedItem(name)]));
const isDemo = form.dataset.mode === 'demo';
let sending = false;

function showFieldError(name, message = '') {
  const error = document.querySelector(`#${name}-error`);
  error.textContent = message;
  error.hidden = !message;
  if (message) fields[name].setAttribute('aria-invalid', 'true');
  else fields[name].removeAttribute('aria-invalid');
}

function showErrors(errors) {
  let firstInvalid;
  for (const name of Object.keys(fields)) {
    const message = errors[name];
    showFieldError(name, message);
    if (message && !firstInvalid) firstInvalid = fields[name];
  }
  firstInvalid?.focus();
  return Boolean(firstInvalid);
}

function getErrors({ service, task, contact }) {
  const errors = {};
  if (!service) errors.service = 'Выберите услугу или вариант «Нужна помощь с выбором».';
  if (!task || [...task].length > 2000) errors.task = 'Опишите задачу. Максимум 2000 символов.';
  const email = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
  const telegram = /^@[A-Za-z][A-Za-z0-9_]{3,31}$/;
  if (contact.length > 254 || (!email.test(contact) && !telegram.test(contact))) {
    errors.contact = 'Укажите email или имя пользователя в Telegram, например @example.';
  }
  return errors;
}

function setStatus(message, state = '') {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}

for (const [name, field] of Object.entries(fields)) {
  field.addEventListener('input', () => {
    showFieldError(name);
    if (!sending) setStatus('');
  });
}

for (const link of document.querySelectorAll('[data-service]')) {
  link.addEventListener('click', () => {
    if (sending) return;
    fields.service.value = link.dataset.service;
    showFieldError('service');
    setStatus('');
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending) return;
  setStatus('');
  const inquiry = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value.trim()]));
  if (showErrors(getErrors(inquiry))) {
    setStatus('Исправьте отмеченные поля.', 'error');
    return;
  }

  if (isDemo) {
    setStatus('Демо: данные не отправлены', 'success');
    return;
  }

  sending = true;
  submit.disabled = true;
  const idleLabel = submit.textContent;
  submit.textContent = 'Отправляем…';
  setStatus('Отправляем заявку.');
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry),
    });
    const result = await response.json();
    if (response.status === 422 && result.errors) {
      showErrors(result.errors);
      setStatus('Исправьте отмеченные поля.', 'error');
    } else if (!response.ok || result.ok !== true) {
      throw new Error('Send failed');
    } else {
      form.reset();
      setStatus('Заявка отправлена. Свяжусь с вами по указанному контакту.', 'success');
    }
  } catch {
    setStatus('Не удалось отправить заявку. Попробуйте ещё раз.', 'error');
  } finally {
    sending = false;
    submit.disabled = false;
    submit.textContent = idleLabel;
  }
});

submit.disabled = false;
