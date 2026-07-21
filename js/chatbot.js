/* ============================================================
   Payne Detailing Group — chatbot.js
   Lightweight front-end FAQ assistant for after-hours questions.

   NOTE FOR JAYDEN: this runs entirely in the browser with a
   keyword-matched FAQ script below — no real AI or server behind
   it yet. It's meant to catch the common after-hours questions
   (hours, pricing, booking, location, products) so visitors get
   an instant answer instead of nothing. When you're ready, this
   can be upgraded to a real AI-backed assistant without changing
   how it looks on the page.
   ============================================================ */

(function () {
  const FAQ = [
    { keys: ['hour', 'open', 'time', 'available'], a: "We're by-appointment, mobile service — most appointments run daytime/early evening. Use the Book Now button to see live availability on the calendar." },
    { keys: ['price', 'cost', 'how much', 'rate'], a: "Essential Detail starts at $199, Premium (our most popular) at $349, and Signature at $599 — plus standalone Interior ($249) and Exterior ($179) details. Check the Services page for the full menu and add-on pricing." },
    { keys: ['book', 'appointment', 'schedule', 'reserve'], a: "You can book directly through the calendar on this page (or the Contact page) — pick a time that works and you'll get a confirmation automatically." },
    { keys: ['location', 'where', 'address', 'area', 'rochester'], a: "We're a mobile detailing service based in Rochester, NY — we come to you anywhere in the surrounding area. Just share your address when booking." },
    { keys: ['product', 'chemical', 'koch', 'p&s', 'ceramic', 'wax'], a: "We use professional-grade products exclusively — Koch Chemie, P&S, and other industry-standard lines, matched to your vehicle's paint, leather, and trim. See the Products page for details." },
    { keys: ['emergency', 'urgent', 'last minute', 'rush'], a: "Our Emergency Detailing concept — white-glove, on-demand service for high-value vehicles — is launching soon. Reach out via the contact form to be notified first." },
    { keys: ['payment', 'pay', 'deposit', 'invoice'], a: "Payment is handled securely after your consultation/quote — you'll receive an invoice with an online payment link." },
    { keys: ['contact', 'phone', 'email', 'call', 'reach'], a: "Head to the Contact page for phone, email, and the booking calendar — or leave your info here and we'll get back to you." },
    { keys: ['exotic', 'luxury', 'car type', 'vehicle type', 'specialize'], a: "We specialize in exotic and luxury vehicles, but we detail cars, SUVs, trucks, vans, and motorcycles of all kinds." },
  ];

  const FALLBACK = "Great question — I don't have that answered here yet, but if you leave your contact info on the Contact page (or come back during business hours), Jayden will get right back to you personally.";
  const GREETING = "Hi, I'm the Payne Detailing after-hours assistant. Ask me about pricing, booking, hours, or the products we use — or tap a quick question below.";

  function findAnswer(text) {
    const lower = text.toLowerCase();
    for (const item of FAQ) {
      if (item.keys.some(k => lower.includes(k))) return item.a;
    }
    return FALLBACK;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const launcher = document.getElementById('chatbot-launcher');
    const panel = document.getElementById('chatbot-panel');
    const body = document.getElementById('chat-body');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const quickRow = document.getElementById('chat-quick');
    if (!launcher || !panel) return;

    let opened = false;
    function addMsg(text, who) {
      const div = document.createElement('div');
      div.className = 'chat-msg ' + who;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
    }

    launcher.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (!opened) {
        addMsg(GREETING, 'bot');
        opened = true;
      }
    });

    function handleSend(text) {
      if (!text.trim()) return;
      addMsg(text, 'user');
      input.value = '';
      setTimeout(() => addMsg(findAnswer(text), 'bot'), 450);
    }

    sendBtn.addEventListener('click', () => handleSend(input.value));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSend(input.value); });

    quickRow.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => handleSend(btn.textContent));
    });
  });
})();
