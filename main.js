// Nav scroll effect
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.style.background = window.scrollY > 60
    ? 'rgba(10, 5, 2, 0.97)'
    : 'rgba(10, 5, 2, 0.85)';
}, { passive: true });

// Smooth entrance animations via IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.step, .plan, .review-card, .heroes-perks li').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

document.addEventListener('animationend', () => {}, { once: true });

// Add visible class style to document
const style = document.createElement('style');
style.textContent = `
  .step.visible, .plan.visible, .review-card.visible, .heroes-perks li.visible {
    opacity: 1 !important;
    transform: none !important;
  }
  .step:nth-child(1) { transition-delay: 0s !important; }
  .step:nth-child(3) { transition-delay: .12s !important; }
  .step:nth-child(5) { transition-delay: .24s !important; }
  .plans .plan:nth-child(1) { transition-delay: 0s !important; }
  .plans .plan:nth-child(2) { transition-delay: .1s !important; }
  .plans .plan:nth-child(3) { transition-delay: .2s !important; }
  .review-card:nth-child(1) { transition-delay: 0s !important; }
  .review-card:nth-child(2) { transition-delay: .1s !important; }
  .review-card:nth-child(3) { transition-delay: .2s !important; }
`;
document.head.appendChild(style);
