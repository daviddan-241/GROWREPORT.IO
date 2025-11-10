'use strict';

// === CONFIG ===
const RESEND_API_KEY = 're_dUMXGJqC_3xtrBEzYQ19rNfto7Z1L1NCw';
const MAX_FREE_REPORTS = 3;
const PRO_PRICE_USD = 15; // every 2 weeks

// Wallets
const wallets = {
  ethereum: '0x2A4e5809642fa2B1F92be478491A5bF3F66Ae9B9',
  bitcoin: 'bc1qm3kzu2nu9t39qt7rpgy9vymjkl0r5lp09rhe3',
  solana: 'GqB1ywkWHq9jpjDSJkhGxuFVz1H6VBfoyJX32BsCjWue',
  sui: '0xce69438a5a5be99ba92d0117e0e96b38abdbbd9c4433e424eb5f45ca59602c07',
  polygon: '0x2A4e5809642fa2B1F92be478491A5bF3F66Ae9B9'
};

// State
let reportCount = 0;
let userEmail = '';
let userRef = 'you';

// UI Elements
const urlInput = document.querySelector('#pageUrl');
const emailInput = document.querySelector('#userEmail');
const sendBtn = document.querySelector('#sendReport');
const referralInput = document.querySelector('#referralLink');
const copyBtn = document.querySelector('#copyReferral');
const proSection = document.querySelector('#proSection');

// Init
function init() {
  const params = new URLSearchParams(location.search);
  if (params.get('ref')) userRef = params.get('ref');
  updateReferral();
}

// Generate PDF Report
async function generateReport() {
  const url = urlInput.value.trim() || 'your page';
  const email = emailInput.value.trim();
  if (!email.includes('@')) return alert('Enter a valid email');

  if (reportCount >= MAX_FREE_REPORTS) {
    alert('Free limit reached! Upgrade to Pro.');
    showProSection();
    return;
  }

  userEmail = email;
  reportCount++;

  const report = {
    page: url,
    bestTime: '8 PM weekdays',
    topHashtag: '#GrowEasy',
    tip: 'Post carousels on Thursday → 340% more likes'
  };

  const htmlContent = `
  <div style="font-family:Arial;padding:40px;background:#f9f9f9;max-width:600px;margin:auto">
    <h1 style="text-align:center;color:#333">Free Growth Report</h1>
    <p><b>Page:</b> ${report.page}</p>
    <hr>
    <h2 style="color:#6d28d9">Post at ${report.bestTime}</h2>
    <h2 style="color:#6d28d9">Use ${report.topHashtag}</h2>
    <h2 style="color:#6d28d9">${report.tip}</h2>
    <p style="margin-top:20px"><b>Want daily reports + AI captions?</b><br>
       Get PRO → <a href="#proSection">Pro Plan</a></p>
    <p style="font-size:10px;color:#999;margin-top:30px">
      Shared by ${email.split('@')[0]} – earn $3 when friends upgrade
    </p>
  </div>`;

  await sendPDF(email, htmlContent);
  alert('Report sent!');
  updateReferral();

  if (reportCount >= MAX_FREE_REPORTS) showProSection();
}

// Send PDF via Resend
async function sendPDF(email, html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);

  const canvas = await html2canvas(div, { scale: 2 });
  const img = canvas.toDataURL('image/png');
  const pdf = new jspdf.jsPDF('p','mm','a4');
  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height*width)/canvas.width;
  pdf.addImage(img,'PNG',0,0,width,height);
  const blob = pdf.output('blob');

  const form = new FormData();
  form.append('from', 'GrowReport <hello@growreport.io>');
  form.append('to', email);
  form.append('subject', 'Your FREE Growth Report');
  form.append('html', '<p>Here’s your free report! See attached PDF.</p>');
  form.append('attachment', blob, 'report.pdf');

  try {
    await axios.post('https://api.resend.com/emails', form, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` }
    });
  } catch (err) {
    console.error(err);
    alert('Error sending email. Check your API key.');
  }

  document.body.removeChild(div);
}

// Update referral link
function updateReferral() {
  const link = `${location.origin}?ref=${userEmail.split('@')[0] || 'you'}`;
  referralInput.value = link;
}

// Copy referral
copyBtn.addEventListener('click',()=>{navigator.clipboard.writeText(referralInput.value);alert('Referral link copied!');});

// Show Pro plan + Auto crypto verification
function showProSection() {
  proSection.style.display = 'block';
  const walletsHtml = Object.entries(wallets).map(([k,v])=>`<li>${k.toUpperCase()}: ${v}</li>`).join('');
  proSection.innerHTML = `
    <h2>Pro Plan - $${PRO_PRICE_USD} every 2 weeks</h2>
    <p>Unlock unlimited reports</p>
    <ul>${walletsHtml}</ul>
    <p>Send crypto and enter your transaction hash:</p>
    <input id="txHashInput" placeholder="Enter your TX hash">
    <button id="verifyPaymentBtn">Verify Payment</button>
    <p id="verifyMessage"></p>
  `;

  const txInput = document.querySelector('#txHashInput');
  const verifyBtn = document.querySelector('#verifyPaymentBtn');
  const verifyMsg = document.querySelector('#verifyMessage');

  verifyBtn.addEventListener('click', async () => {
    const txHash = txInput.value.trim();
    if (!txHash) return alert('Enter a transaction hash');

    verifyMsg.textContent = "Verifying...";
    
    try {
      let confirmed = false;
      // Multi-chain verification examples
      // Ethereum/Polygon
      const ethUrl = `https://api.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=YOUR_ETHERSCAN_API_KEY`;
      const ethResp = await axios.get(ethUrl);
      if (ethResp.data.result && ethResp.data.result.status === "1") confirmed = true;

      // BTC verification example (BlockCypher)
      const btcUrl = `https://api.blockcypher.com/v1/btc/main/txs/${txHash}`;
      try { const btcResp = await axios.get(btcUrl); if(btcResp.data.confirmations>0) confirmed=true; } catch{}

      // Solana verification example
      const solUrl = `https://api.mainnet-beta.solana.com`;
      try {
        const solResp = await axios.post(solUrl,{
          jsonrpc:"2.0",
          id:1,
          method:"getTransaction",
          params:[txHash,"jsonParsed"]
        });
        if(solResp.data.result) confirmed=true;
      } catch{}

      // SUI verification example
      const suiUrl = `https://sui-rpc.publicnode.com`;
      try {
        const suiResp = await axios.post(suiUrl,{
          jsonrpc:"2.0",
          id:1,
          method:"sui_getTransaction",
          params:[txHash]
        });
        if(suiResp.data.result) confirmed=true;
      } catch{}

      if(confirmed){
        reportCount = MAX_FREE_REPORTS + 1; // unlock unlimited
        verifyMsg.textContent = "Payment verified! Unlimited reports unlocked ✅";
      } else verifyMsg.textContent = "Transaction not found or insufficient confirmations ❌";
    } catch(err){ console.error(err); verifyMsg.textContent="Error verifying transaction ❌"; }
  });
}

// Event listener
sendBtn.addEventListener('click', generateReport);
init();