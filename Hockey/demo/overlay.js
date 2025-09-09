document.addEventListener('DOMContentLoaded', () => {
  const interval = setInterval(() => {
    const fixtures = document.querySelectorAll('.gms-wrapper .fixture');

    if (fixtures.length > 0) {
      clearInterval(interval);

      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      overlay.style.background = 'white';
      overlay.style.border = '1px solid black';
      overlay.style.padding = '10px';
      overlay.style.maxHeight = '80vh';
      overlay.style.overflowY = 'auto';
      overlay.style.zIndex = 1000;
      overlay.style.width = '300px';
      overlay.style.fontFamily = 'Arial, sans-serif';
      overlay.style.fontSize = '14px';

      fixtures.forEach(fix => {
        const venue = fix.querySelector('.venue')?.innerText || '';
        if (venue === 'Pitch 1' || venue === 'Pitch 2') {
          const row = document.createElement('div');
          row.style.marginBottom = '5px';
          const time = fix.querySelector('.time')?.innerText || '';
          const home = fix.querySelector('.home-team')?.innerText || '';
          const away = fix.querySelector('.away-team')?.innerText || '';
          row.textContent = `${time} | ${home} vs ${away} | ${venue}`;
          overlay.appendChild(row);
        }
      });

      document.body.appendChild(overlay);
    }
  }, 500);
});
