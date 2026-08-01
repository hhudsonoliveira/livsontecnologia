/* =========================================================
   LIVSON TECNOLOGIA — Diagnóstico (formulário multi-etapas)
   Navegação por step, validação simples, envio via Formspree.
   ========================================================= */
(function () {
  'use strict';

  const FORM_ENDPOINT = 'https://formspree.io/f/xeeybpge';

  const form = document.getElementById('diagForm');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.diag__step'));
  const total = steps.length;
  const counter = document.getElementById('diagCounter');
  const progressBar = document.getElementById('diagProgressBar');
  const doneEl = document.getElementById('diagDone');
  let current = 0;

  function showStep(i) {
    steps.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
    counter.textContent = `Pergunta ${i + 1} de ${total}`;
    progressBar.style.width = `${((i + 1) / total) * 100}%`;

    const active = steps[i];
    const firstField = active.querySelector('input');
    if (firstField && (firstField.type === 'text' || firstField.type === 'email' || firstField.type === 'tel')) {
      firstField.focus({ preventScroll: true });
    }
  }

  function currentStepError(i) {
    const active = steps[i];
    const required = active.querySelector('[required]');
    if (!required) return '';

    if (required.type === 'radio') {
      const group = active.querySelectorAll(`input[name="${required.name}"]`);
      const checked = Array.from(group).some((r) => r.checked);
      return checked ? '' : 'Escolha uma opção pra continuar.';
    }
    if (!required.value || !required.value.trim()) {
      return 'Preencha esse campo pra continuar.';
    }
    if (required.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(required.value.trim())) {
      return 'Digite um e-mail válido.';
    }
    return '';
  }

  function goNext() {
    const error = currentStepError(current);
    const errorEl = steps[current].querySelector('.diag__error');
    if (error) {
      if (errorEl) errorEl.textContent = error;
      return;
    }
    if (errorEl) errorEl.textContent = '';
    if (current < total - 1) {
      current += 1;
      showStep(current);
    }
  }

  function goBack() {
    if (current > 0) {
      current -= 1;
      showStep(current);
    }
  }

  form.querySelectorAll('.diag__next').forEach((btn) => btn.addEventListener('click', goNext));
  form.querySelectorAll('.diag__back').forEach((btn) => btn.addEventListener('click', goBack));

  // Enter avança pro próximo step (exceto no último, onde envia)
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'TEXTAREA') return;
    if (current < total - 1) {
      e.preventDefault();
      goNext();
    }
  });

  // Auto-avança em perguntas de escolha única (radio) ao clicar numa opção
  steps.forEach((step, idx) => {
    const radios = step.querySelectorAll('input[type="radio"]');
    radios.forEach((radio) => {
      radio.addEventListener('change', () => {
        if (idx === total - 1) return; // último step: usuário confirma com o botão de enviar
        setTimeout(() => { if (current === idx) goNext(); }, 280);
      });
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const error = currentStepError(current);
    const errorEl = steps[current].querySelector('.diag__error');
    if (error) {
      if (errorEl) errorEl.textContent = error;
      return;
    }

    const submitBtn = form.querySelector('.diag__submit');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error('submit failed');
      form.hidden = true;
      counter.hidden = true;
      doneEl.hidden = false;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
      if (errorEl) {
        errorEl.textContent = 'Não deu pra enviar agora. Chama a gente direto no WhatsApp (botão no canto da tela) que resolvemos na hora.';
      }
    }
  });

  showStep(0);
})();
