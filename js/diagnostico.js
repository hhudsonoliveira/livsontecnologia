/* =========================================================
   LIVSON TECNOLOGIA — Diagnóstico (formulário multi-etapas)
   Navegação por step, validação, cálculo de receita perdida
   estimada com base nas respostas, envio via Formspree.
   ========================================================= */
(function () {
  'use strict';

  const FORM_ENDPOINT = 'https://formspree.io/f/xeeybpge';
  const WHATSAPP = '5571996466575';

  const form = document.getElementById('diagForm');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.diag__step'));
  const total = steps.length;
  const counter = document.getElementById('diagCounter');
  const progressBar = document.getElementById('diagProgressBar');
  const doneEl = document.getElementById('diagDone');
  const formWrap = form;
  let current = 0;

  function showStep(i) {
    steps.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
    counter.textContent = `Pergunta ${i + 1} de ${total}`;
    progressBar.style.width = `${((i + 1) / total) * 100}%`;

    const active = steps[i];
    const firstField = active.querySelector('input[type="text"], input[type="email"], input[type="tel"]');
    if (firstField) firstField.focus({ preventScroll: true });
  }

  /* valida todos os campos obrigatórios do step (a primeira tela tem dois) */
  function currentStepError(i) {
    const active = steps[i];
    const required = Array.from(active.querySelectorAll('[required]'));
    if (!required.length) return '';

    for (const field of required) {
      if (field.type === 'radio') {
        const group = active.querySelectorAll(`input[name="${field.name}"]`);
        const checked = Array.from(group).some((r) => r.checked);
        if (!checked) return 'Escolha uma opção pra continuar.';
        continue;
      }
      if (!field.value || !field.value.trim()) {
        field.focus({ preventScroll: true });
        return 'Preencha os campos obrigatórios pra continuar.';
      }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
        field.focus({ preventScroll: true });
        return 'Digite um e-mail válido.';
      }
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

  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'TEXTAREA') return;
    if (current < total - 1) {
      e.preventDefault();
      goNext();
    }
  });

  /* auto-avanço em perguntas de escolha única — steps com campo de texto não avançam sozinhos */
  steps.forEach((step, idx) => {
    if (step.querySelector('input[type="text"], input[type="email"], input[type="tel"]')) return;
    step.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (idx === total - 1) return; // último step: confirma com o botão de enviar
        setTimeout(() => { if (current === idx) goNext(); }, 300);
      });
    });
  });

  /* ---------- Cálculo da estimativa de receita perdida ---------- */
  function pick(name) {
    return form.querySelector(`input[name="${name}"]:checked`);
  }

  function brl(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  function calcular() {
    const vol = pick('volume');
    const tk = pick('ticket');
    const tr = pick('tempo_resposta');
    const sm = pick('sumico');
    if (!vol || !tk || !tr || !sm) return null;

    const contatos = parseFloat(vol.dataset.n);
    const ticket = parseFloat(tk.dataset.n);
    const fatorPerda = Math.min(parseFloat(tr.dataset.n) + parseFloat(sm.dataset.n), 0.85);
    const perdidosMes = contatos * fatorPerda;
    const perdaAno = Math.round((perdidosMes * ticket * 12) / 100) * 100;

    return {
      perdaAno, perdidosMes,
      volume: vol.value, ticket: tk.value, tempo: tr.value, sumico: sm.value,
    };
  }

  function mostrarResultado() {
    const r = calcular();
    if (!r) return;

    document.getElementById('resValor').textContent = brl(r.perdaAno);
    document.getElementById('resUnit').textContent =
      `O equivalente a cerca de ${(r.perdidosMes * 12).toFixed(0)} vendas por ano que hoje não estão acontecendo.`;

    document.getElementById('brVolume').textContent = r.volume;
    document.getElementById('brTicket').textContent = r.ticket;
    document.getElementById('brTempo').textContent = r.tempo;
    document.getElementById('brSumico').textContent = r.sumico;

    const nome = (form.querySelector('input[name="nome"]').value || '').trim();
    const negocio = (form.querySelector('input[name="negocio"]').value || '').trim();
    document.getElementById('repWho').textContent = [nome, negocio].filter(Boolean).join(' · ') || '—';

    const primeiroNome = nome.split(' ')[0] || '';
    const msg = `Olá! Sou ${primeiroNome}${negocio ? ', da ' + negocio : ''}. Fiz o diagnóstico no site e deu ${brl(r.perdaAno)} por ano. Quero entender como resolver.`;
    document.getElementById('waLink').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

    formWrap.hidden = true;
    counter.hidden = true;
    doneEl.hidden = false;
    doneEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const error = currentStepError(current);
    const errorEl = steps[current].querySelector('.diag__error');
    if (error) {
      if (errorEl) errorEl.textContent = error;
      return;
    }

    const r = calcular();
    if (r) document.getElementById('fPerda').value = brl(r.perdaAno);

    const submitBtn = form.querySelector('.diag__submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Calculando...';

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    }).catch(() => {
      console.warn('[Livson] Envio do formulário falhou — o resultado ainda é mostrado, mas confira o Formspree.');
    });

    setTimeout(mostrarResultado, 500);
  });

  showStep(0);
})();
