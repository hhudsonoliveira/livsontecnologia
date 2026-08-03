/* =========================================================
   LIVSON TECNOLOGIA — Diagnóstico (formulário multi-etapas)
   Navegação por step, validação, diagnóstico qualitativo
   (nível + causas) com base nas respostas, envio via Formspree.
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

  /* ---------- Diagnóstico qualitativo (nível + causas identificadas) ---------- */
  function pick(name) {
    return form.querySelector(`input[name="${name}"]:checked`);
  }

  /* peso: quanto esse ponto pesa no nível final. ids sem entrada aqui (tr1, sm1) = sem problema */
  const CAUSAS = {
    tr2: { titulo: 'Tempo de resposta pode melhorar', texto: 'Responder em até 1 hora é bom, mas quem responde em minutos costuma sair na frente — vale apertar esse tempo.', peso: 1 },
    tr3: { titulo: 'Demora na primeira resposta', texto: 'Um contato que espera horas pela resposta, na maioria das vezes, já está falando com outro fornecedor. Costuma ser a maior causa de perda.', peso: 2 },
    tr4: { titulo: 'Resposta lenta demais', texto: 'Contato respondido só no dia seguinte praticamente já foi perdido — o cliente resolveu com outra empresa antes de você aparecer.', peso: 3 },
    sm2: { titulo: 'Follow-up não está acontecendo', texto: 'Metade de quem pergunta o preço some sem resposta. Normalmente falta alguém voltando a procurar essas pessoas depois.', peso: 2 },
    sm3: { titulo: 'Falta de acompanhamento após o orçamento', texto: 'A maioria dos interessados some depois do preço — é o sinal mais claro de que falta um follow-up estruturado nesse momento.', peso: 3 },
    sm4: { titulo: 'Sem visibilidade do que acontece depois do orçamento', texto: 'Sem acompanhar quem some, fica difícil saber onde a venda está escapando — e mais difícil ainda corrigir.', peso: 1.5 },
  };

  function diagnosticar() {
    const tr = pick('tempo_resposta');
    const sm = pick('sumico');
    const problema = pick('problema');
    if (!tr || !sm) return null;

    const causaTempo = CAUSAS[tr.id] || null;
    const causaSumico = CAUSAS[sm.id] || null;
    const causas = [causaTempo, causaSumico].filter(Boolean).sort((a, b) => b.peso - a.peso);
    const score = (causaTempo ? causaTempo.peso : 0) + (causaSumico ? causaSumico.peso : 0);

    let nivel;
    if (score === 0) nivel = { texto: 'Sob controle', classe: 'ok' };
    else if (score < 3) nivel = { texto: 'Ponto de atenção', classe: 'atencao' };
    else nivel = { texto: 'Crítico', classe: 'critico' };

    return { causas, nivel, problema: problema ? problema.value : '' };
  }

  function mostrarResultado() {
    const r = diagnosticar();
    if (!r) return;

    const levelEl = document.getElementById('resLevel');
    levelEl.textContent = r.nivel.texto;
    levelEl.className = `report__level report__level--${r.nivel.classe}`;

    const causasEl = document.getElementById('resCausas');
    causasEl.innerHTML = '';
    if (r.causas.length) {
      r.causas.forEach((c) => {
        const div = document.createElement('div');
        div.className = 'report__cause';
        div.innerHTML = `<h3></h3><p></p>`;
        div.querySelector('h3').textContent = c.titulo;
        div.querySelector('p').textContent = c.texto;
        causasEl.appendChild(div);
      });
    } else {
      const div = document.createElement('div');
      div.className = 'report__cause';
      div.innerHTML = `<h3></h3><p></p>`;
      div.querySelector('h3').textContent = 'Tempo de resposta e follow-up estão bem cuidados';
      div.querySelector('p').textContent = 'Esses dois pontos, que costumam ser os maiores vazamentos de venda, já estão sob controle no seu negócio.';
      causasEl.appendChild(div);
    }

    const problemaEl = document.getElementById('resProblema');
    problemaEl.textContent = r.problema
      ? `Você apontou "${r.problema}" como o maior problema hoje — é por aí que a conversa no WhatsApp vai começar.`
      : '';

    const nome = (form.querySelector('input[name="nome"]').value || '').trim();
    const negocio = (form.querySelector('input[name="negocio"]').value || '').trim();
    document.getElementById('repWho').textContent = [nome, negocio].filter(Boolean).join(' · ') || '—';

    const primeiroNome = nome.split(' ')[0] || '';
    const msg = `Olá! Sou ${primeiroNome}${negocio ? ', da ' + negocio : ''}. Fiz o diagnóstico no site e meu resultado foi "${r.nivel.texto}". Quero entender como resolver.`;
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

    const r = diagnosticar();
    if (r) document.getElementById('fNivel').value = r.nivel.texto;

    const submitBtn = form.querySelector('.diag__submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Gerando diagnóstico...';

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
