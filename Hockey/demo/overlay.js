document.addEventListener('DOMContentLoaded', () => {
  // Poll every 500ms until the GMS fixtures are loaded
  const interval = setInterval(() => {
    // Select all fixture elements inside the GMS widget
    const fixtures = document.querySelectorAll('.gms-wrapper .fixture'); // Update selector if needed

    if (fixtures.length > 0) {
      clearInterval(interval);

      // Create the overlay container
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      overlay.style.background = 'white';
      overlay.style.border = '1px solid black';
      overlay.style.padding = '10px';
      overlay.style.maxHeight = '80vh';
      overlay.style.overflowY = 'auto';
      overlay.style.width = '300px';
      overlay.style.fontFamily = 'Arial, sans-serif';
      overlay.style.fontSize = '14px';
      overlay.style.zIndex = 1000;
      overlay.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      overlay.style.borderRadius = '8px';

      // Loop through fixtures and filter by Pitch 1 and Pitch 2
      fixtures.forEach(fix => {
        const venue = fix.querySelector('.venue')?.innerText.trim() || '';
        if (venue === 'Pitch 1' || venue === 'Pitch 2') {
          const row = document.createElement('div');
          row.style.marginBottom = '5px';

          const time = fix.querySelector('.time')?.innerText.trim() || '';
          const home = fix.querySelector('.home-team')?.innerText.trim() || '';
          const away = fix.querySelector('.away-team')?.innerText.trim() || '';

          row.textContent = `${time} | ${home} vs ${away} | ${venue}`;
          overlay.appendChild(row);
        }
      });

      // Add the overlay to the page
      document.body.appendChild(overlay);
    }
  }, 500);
});
