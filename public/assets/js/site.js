'use strict';

  // reveal-on-scroll
  const io = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries)=>{
        entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
      },{ threshold:0.12 })
    : { observe(el){ el.classList.add('in'); }, unobserve(){} };
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // count-up animation for numeric stats
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const countEls = document.querySelectorAll('.num[data-count]');
  if (countEls.length) {
    const animateCount = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const pad = parseInt(el.dataset.pad || '0', 10);
      const suffix = el.dataset.suffix || '';
      if (prefersReducedMotion || !target) { return; }
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        el.textContent = String(value).padStart(pad, '0') + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const countIo = ('IntersectionObserver' in window)
      ? new IntersectionObserver((entries) => {
          entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); countIo.unobserve(e.target); } });
        }, { threshold: 0.5 })
      : { observe(el){ animateCount(el); }, unobserve(){} };
    countEls.forEach(el => countIo.observe(el));
  }

  // nav background intensify on scroll
  const nav = document.querySelector('header.nav');
  window.addEventListener('scroll', ()=>{
    nav.style.background = window.scrollY > 40 ? 'rgba(6,15,36,0.92)' : 'rgba(6,15,36,0.72)';
  }, { passive:true });

  // mobile drawer
  const burger = document.getElementById('burgerBtn');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const drawerClose = document.getElementById('drawerClose');

  function openDrawer(){
    drawer.classList.add('open'); backdrop.classList.add('open');
    drawer.inert = false; burger.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
    drawerClose.focus();
  }
  function closeDrawer(){
    drawer.classList.remove('open'); backdrop.classList.remove('open');
    drawer.inert = true; burger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
    burger.focus();
  }
  function trapFocus(container, e){
    if(e.key !== 'Tab') return;
    const f = Array.from(container.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'))
      .filter(el=>el.getClientRects().length);
    if(!f.length) return;
    const first = f[0], last = f[f.length-1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
  drawer.addEventListener('keydown', (e)=>trapFocus(drawer, e));
  burger.addEventListener('click', openDrawer);
  drawerClose.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a').forEach(a=>a.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

  // contact form -> FormSubmit.co (AJAX submit; falls back to normal POST without JS)
  const contactFormEl = document.getElementById('contactForm');
  const formNoteEl = document.getElementById('formNote');
  if (contactFormEl) {
    const submitBtn = contactFormEl.querySelector('button[type="submit"]');
    contactFormEl.addEventListener('submit', async function (e) {
      e.preventDefault();
      submitBtn.disabled = true;
      formNoteEl.textContent = 'Sending…';
      try {
        const res = await fetch('https://formsubmit.co/ajax/info@libertyresearch.com.ng', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(contactFormEl))),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        formNoteEl.textContent = 'Thank you — your message has been sent. We usually reply within two working days.';
        contactFormEl.reset();
      } catch (err) {
        formNoteEl.textContent = 'Something went wrong sending this. Please reach us on WhatsApp or by email instead.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // timeline keyboard + button navigation
  const scroller = document.getElementById('phaseScroller');
  const cards = document.querySelectorAll('.phase-card');
  const prevBtn = document.getElementById('phasePrev');
  const nextBtn = document.getElementById('phaseNext');
  const progress = document.getElementById('phaseProgress');
  let phaseIndex = 0;
  const cardWidth = (cards.length > 1 ? (cards[1].offsetLeft - cards[0].offsetLeft) : 0) || 301; // width + gap

  function updatePhaseUI(){
    progress.textContent = `Phase ${String(phaseIndex+1).padStart(2,'0')} / ${cards.length}`;
    prevBtn.disabled = phaseIndex === 0;
    nextBtn.disabled = phaseIndex === cards.length - 1;
  }
  function goToPhase(i){
    phaseIndex = Math.max(0, Math.min(cards.length-1, i));
    scroller.scrollTo({ left: phaseIndex * cardWidth, behavior:'smooth' });
    updatePhaseUI();
  }
  prevBtn.addEventListener('click', ()=>goToPhase(phaseIndex-1));
  nextBtn.addEventListener('click', ()=>goToPhase(phaseIndex+1));
  scroller.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight'){ e.preventDefault(); goToPhase(phaseIndex+1); }
    if(e.key === 'ArrowLeft'){ e.preventDefault(); goToPhase(phaseIndex-1); }
  });
  let scrollTimeout;
  scroller.addEventListener('scroll', ()=>{
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(()=>{
      phaseIndex = Math.round(scroller.scrollLeft / cardWidth);
      updatePhaseUI();
    }, 100);
  });
  updatePhaseUI();

  // ---- LRI Quick Assistant (rule-based auto-responder) ----
  const chatPanel = document.getElementById('chatPanel');
  const assistantToggle = document.getElementById('assistantToggle');
  const chatClose = document.getElementById('chatClose');
  const chatLog = document.getElementById('chatLog');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatQuick = document.getElementById('chatQuick');

  const chatAnswers = {
    about: "LRI is an independent research and innovation organisation founded in 2026. Our mission is to close the gap between discovery and measurable impact — designing practical pathways that turn research into tangible outcomes.",
    research: "Our research is organised across five pillars: Technology, Science, Health, Social Sciences, and the Arts. In our founding years we're concentrating on Technology and Social Sciences, with AI governance at their intersection.",
    publications: "Our first working paper — on integrating AI into Nigeria's healthcare system, comparing lessons from seven countries — is up in the Publications section of this site.",
    partner: "We welcome researchers, graduates, and partner organisations. Use the 'Partner With Us' button, the contact form below, or WhatsApp us directly for a faster reply.",
    contact: "You can reach us by WhatsApp (tap the green button), the contact form at the bottom of this page, or email at info@libertyresearch.com.ng. We usually reply within two working days.",
    values: "Our nine core values are Excellence, Innovation, Integrity, Collaboration, Empowerment, Impact, Inclusivity, Sustainability, and Mentorship — you'll find them in the Values section of this site.",
    strategy: "We work to a 30-year Master Strategic Blueprint, from Foundation & Credibility (2026–2030) through to Global Leadership & Legacy (2051–2056). See the Strategy section for the full phase-by-phase breakdown.",
    leadership: "You can meet the LRI leadership team — including our Founder & Director General, and our Directors of Research & Policy, Technology & AI, and Innovation & Partnerships — in the Leadership section of this site.",
    default: "I don't have an automatic answer for that yet. For anything beyond common questions, please reach us on WhatsApp or the contact form below — a member of the team will respond directly."
  };

  function matchAnswer(text){
    const t = text.toLowerCase();
    if(/about|who are you|what is lri|mission/.test(t)) return chatAnswers.about;
    if(/research|pillar|technology|science|health|social|arts/.test(t)) return chatAnswers.research;
    if(/publication|paper|download|pdf/.test(t)) return chatAnswers.publications;
    if(/partner|collaborat|donor|fund/.test(t)) return chatAnswers.partner;
    if(/contact|email|phone|reach|whatsapp/.test(t)) return chatAnswers.contact;
    if(/value|excellence|integrity|mentorship/.test(t)) return chatAnswers.values;
    if(/strategy|blueprint|phase|2030|2056/.test(t)) return chatAnswers.strategy;
    if(/leader|founder|director|team|people/.test(t)) return chatAnswers.leadership;
    return chatAnswers.default;
  }

  function appendMsg(text, who){
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  }
  function appendTyping(){
    const div = document.createElement('div');
    div.className = 'chat-msg bot chat-typing';
    div.textContent = '···';
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  }

  let chatHistory = [];

  async function askAssistant(question){
    const typingEl = appendTyping();
    try{
      const ctrl = new AbortController();
      const timer = setTimeout(()=>ctrl.abort(), 20000);
      const res = await fetch('/.netlify/functions/chat', {
        method:'POST',
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ message: question, history: chatHistory }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if(!res.ok) throw new Error('bad response');
      const data = await res.json();
      if(!data || typeof data.reply !== 'string' || !data.reply) throw new Error('empty reply');
      typingEl.remove();
      appendMsg(data.reply, 'bot');
      chatHistory.push({ role:'user', content: question });
      chatHistory.push({ role:'assistant', content: data.reply });
      if(chatHistory.length > 12) chatHistory = chatHistory.slice(-12);
    }catch(err){
      // Backend unavailable (e.g. previewing this file locally, offline, or
      // the Netlify Function isn't deployed/configured yet) — fall back to
      // the built-in keyword answers so the widget still responds.
      typingEl.remove();
      appendMsg(matchAnswer(question), 'bot');
    }
  }

  function openChat(){
    chatPanel.classList.add('open');
    chatPanel.inert = false;
    assistantToggle.setAttribute('aria-expanded','true');
    chatInput.focus();
  }
  function closeChat(){
    chatPanel.classList.remove('open');
    chatPanel.inert = true;
    assistantToggle.setAttribute('aria-expanded','false');
    assistantToggle.focus();
  }
  assistantToggle.addEventListener('click', ()=>{
    chatPanel.classList.contains('open') ? closeChat() : openChat();
  });
  chatClose.addEventListener('click', closeChat);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && chatPanel.classList.contains('open')) closeChat(); });

  chatQuick.addEventListener('click', (e)=>{
    const btn = e.target.closest('.chat-chip');
    if(!btn) return;
    const key = btn.dataset.q;
    appendMsg(btn.textContent, 'user');
    // Quick-topic chips answer instantly from the built-in reference — no API call needed
    setTimeout(()=> appendMsg(chatAnswers[key] || chatAnswers.default, 'bot'), 300);
  });

  chatForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const val = chatInput.value.trim();
    if(!val) return;
    appendMsg(val, 'user');
    chatInput.value = '';
    askAssistant(val);
  });
