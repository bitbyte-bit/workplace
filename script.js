const form = document.getElementById('depositForm');
    const bankTotalsDiv = document.getElementById('bankTotals');
    const depositListDiv = document.getElementById('depositList');
    const totalAllDiv = document.getElementById('totalAll');
    const exportBtn = document.getElementById('exportBtn');
    const passwordPopup = document.getElementById('passwordPopup');
    const passwordInput = document.getElementById('passwordInput');
    const passwordBtn = document.getElementById('passwordBtn');
    const passwordTitle = document.getElementById('passwordTitle');
    const sideMenu = document.getElementById('sideMenu');

    let deposits = JSON.parse(localStorage.getItem('deposits')) || [];
    const bankColors = {};
    let totalsVisible = true;

    function getColor(bank) {
      if (!bankColors[bank]) {
        const hue = Object.keys(bankColors).length * 60 % 360;
        bankColors[bank] = `hsl(${hue}, 70%, 50%)`;
}
      return bankColors[bank];
}

    function updateDisplay() {
      const totals = {};
      let totalAll = 0 ;

      deposits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      bankTotalsDiv.innerHTML = '';
      depositListDiv.innerHTML = '';

      deposits.forEach((entry, index) => {
        if (!totals[entry.bank]) totals[entry.bank] = 0;
        totals[entry.bank] += entry.amount;
        totalAll += entry.amount;

        const div = document.createElement('div');
        div.className = 'deposit-entry';
        div.innerHTML = `
          <strong>${entry.bank}</strong>: UGX ${entry.amount.toLocaleString()}<br>
          <small>${new Date(entry.timestamp).toLocaleString()}</small><br>
          <button onclick="editDeposit(${index})">✏️ Edit</button>
          <button onclick="deleteDeposit(${index})">🗑️ Delete</button>
        `;
        depositListDiv.appendChild(div);
});

      for (const bank in totals) {
        const div = document.createElement('div');
        div.className = 'bank-total';
        div.style.backgroundColor = getColor(bank);
        div.textContent = `${bank}: UGX ${totals[bank].toLocaleString()}`;
        bankTotalsDiv.appendChild(div);
}

      totalAllDiv.textContent = totalsVisible? `💳 Total Across All Banks: UGX ${totalAll.toLocaleString()}`: '';
}

    form.addEventListener('submit', e => {
      e.preventDefault();
      const bank = document.getElementById('bankName').value.trim();
      const amount = parseFloat(document.getElementById('amount').value);
      if (!bank || isNaN(amount)) return;

      deposits.push({ bank, amount, timestamp: new Date().toISOString()});
      localStorage.setItem('deposits', JSON.stringify(deposits));
      form.reset();
      updateDisplay();
});

    function deleteDeposit(index) {
      if (confirm("Delete this deposit?")) {
        deposits.splice(index, 1);
        localStorage.setItem('deposits', JSON.stringify(deposits));
        updateDisplay();
}
}

    function editDeposit(index) {
      const entry = deposits[index];
      const newAmount = prompt("Enter new amount:", entry.amount);
      if (newAmount!== null &&!isNaN(parseFloat(newAmount))) {
        deposits[index].amount = parseFloat(newAmount);
        localStorage.setItem('deposits', JSON.stringify(deposits));
        updateDisplay();
}
}

    exportBtn.addEventListener('click', () => {
      const bank = prompt("Enter bank name to export:");
      if (!bank) return;

      const filtered = deposits.filter(d => d.bank.toLowerCase() === bank.toLowerCase());
      if (filtered.length === 0) {
        alert("No records found for that bank.");
        return;
}

      let content = `<p>Downloaded from;</p><h1 style='color:blue;'>ORION TOOLS</h1>\n\n\nYour deposits for ${bank} are:\n\n`;
      filtered.forEach(d => {
        content += `UGX ${d.amount.toLocaleString()} on ${new Date(d.timestamp).toLocaleString()}\n`;
});

      const blob = new Blob([content], { type: 'text/plain'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${bank}_deposits.txt`;
      link.click();
});

    const storedPassword = localStorage.getItem('depositPassword');

    passwordBtn.addEventListener('click', () => {
      const input = passwordInput.value;
      if (!input) return;

      if (!storedPassword) {
        localStorage.setItem('depositPassword', input);
        unlockApp();
} else if (input === storedPassword) {
        unlockApp();
} else {
        alert("Incorrect password.");
}
});

    function unlockApp() {
      passwordPopup.style.display = 'none';
      form.style.display = 'block';
      document.querySelector('.totals').style.display = 'block';
      document.querySelector('.deposits').style.display = 'block';
      exportBtn.style.display = 'inline-block';
      updateDisplay();
}

    window.onload = () => {
      if (!storedPassword) {
        passwordTitle.textContent = "Set a Pasword";
} else {
        passwordTitle.textContent = "Enter Password";
}
};

    function toggleMenu() {
      sideMenu.style.right = sideMenu.style.right === '0px'? '-250px': '0px';
}

    function toggleTheme() {
      const root = document.documentElement;
      const isDark = root.style.getPropertyValue('--bg-color') === '#222';
      root.style.setProperty('--bg-color', isDark? '#f4f4f4': '#222');
      root.style.setProperty('--text-color', isDark? '#000': '#fff');
}

    function editPassword() {
      const newPass = prompt("Enter new password:");
      if (newPass) {
        localStorage.setItem('depositPassword', newPass);
        alert('password updated successfully👍');
}
}

    function adjustTextSize() {
      const size = prompt("Enter text size in pixels (e.g., 16):");
      if (size &&!isNaN(parseInt(size))) {
        document.body.style.fontSize = `${parseInt(size)}px`;
}
}

    function toggleTotals() {
      totalsVisible =!totalsVisible;
      updateDisplay();
}

function generateID() {
      return 'REQ-' + Math.floor(1000 + Math.random() * 9000);
}

    document.getElementById('contactForm').addEventListener('submit', function(e) {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      const requestId = generateID();

      const fullMessage = `Hello Orion, new request received: ${requestId}%0AName: ${name}%0AEmail: ${email}%0AMessage: ${message}`;

      const whatsappURL = `https://wa.me/256744759181?text=${encodeURIComponent(fullMessage)}`;

      window.open(whatsappURL, '_blank');
      document.getElementById('status').innerText = `✅ Message sent with ID ${requestId}`;
});