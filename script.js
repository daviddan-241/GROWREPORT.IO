// ---------------- CONFIG ----------------
const WALLETS=[
  {id:'eth', label:'ETH', network:'ETH', address:'0x2A4e5809642fa2B1F92be478491A5bF3F66Ae9B9'},
  {id:'btc', label:'BTC', network:'BTC', address:'bc1qm3kzu2nu9t39qt7rpgy9vymjkl0r5lp09rhe3'},
  {id:'sol', label:'SOL', network:'SOL', address:'GqB1ywkWHq9jpjDSJkhGxuFVz1H6VBfoyJX32BsCjWue'},
  {id:'sui', label:'SUI', network:'SUI', address:'0xce69438a5a5be99ba92d0117e0e96b38abdbbd9c4433e424eb5f45ca59602c07'},
  {id:'polygon', label:'MATIC', network:'POLYGON', address:'0x2A4e5809642fa2B1F92be478491A5bF3F66Ae9B9'}
];
const PRO_AMOUNT_USD=15;
const FREE_LIMIT=3;
const RESEND_KEY='re_XUnEZUPS_89sWDcB2p1bmv7imexQdGxmt';
const PRO_DURATION_MS=14*24*60*60*1000; // 2 weeks

// ---------------- ACCOUNTS ----------------
let currentUser=null;
let users=JSON.parse(localStorage.getItem('users')||'{}');
function saveUsers(){localStorage.setItem('users',JSON.stringify(users));}

// Auth
document.getElementById('authBtn').addEventListener('click',()=>{
  const email=document.getElementById('authEmail').value.trim().toLowerCase();
  const pass=document.getElementById('authPass').value.trim();
  if(!email||!pass)return alert('Enter email & password');
  if(!users[email])users[email]={pass:pass,freeUses:0,reportsGenerated:0,pro:false,proExpiry:0,refBonus:0,ref:location.search.split('ref=')[1]||'you'};
  else if(users[email].pass!==pass)return alert('Wrong password');
  currentUser=email;
  localStorage.setItem('currentUser',currentUser);
  document.getElementById('authSection').style.display='none';
  document.getElementById('reportsSection').style.display='block';
  checkProExpiry();
  loadUserData();
});

// ---------------- USER DATA ----------------
function loadUserData(){
  const user=users[currentUser];
  updateUsageInfo();
  document.getElementById('refLink').value=`${location.origin}?ref=${currentUser}`;
  if(user.pro)showDashboard();
}

// ---------------- FREE REPORTS ----------------
document.getElementById('getReportBtn').addEventListener('click',async()=>{
  const user=users[currentUser];
  if(user.pro){showDashboard(); return alert('Pro access unlocked!');}
  if(user.freeUses<FREE_LIMIT){
    user.freeUses++;
    user.reportsGenerated++;
    saveUsers(); updateUsageInfo();
    await generatePDFReport();
    alert(`Free report generated! (${user.freeUses}/${FREE_LIMIT})`);
  }
  if(user.freeUses>=FREE_LIMIT && !user.pro){
    document.getElementById('proSection').style.display='block';
    alert('Free limit reached. Pay Pro to continue.');
  }
});

function updateUsageInfo(){
  const user=users[currentUser];
  document.getElementById('usageInfo').textContent=`Free reports used: ${user.freeUses}/${FREE_LIMIT}`;
  document.getElementById('reportsCount').textContent=user.reportsGenerated;
  document.getElementById('refBonus').textContent=user.refBonus;
}

// ---------------- PDF REPORT + AUTO EMAIL ----------------
async function generatePDFReport(){
  const page=document.getElementById('pageInput').value||'Your Page';
  const htmlContent=`
  <div style="font-family:Arial;padding:40px;background:#f9f9f9;width:600px;">
  <h1 style="text-align:center;color:#4f46e5">Your Free Growth Report</h1>
  <p><b>Page:</b> ${page}</p>
  <hr>
  <h2 style="color:#1e40af">Best Time: 8 PM weekdays</h2>
  <h2 style="color:#1e40af">Top Hashtag: #GrowEasy</h2>
  <h2 style="color:#1e40af">Tip: Post carousels on Thursday → 340% more likes</h2>
  <p style="margin-top:20px;font-size:14px;color:#555">
  Shared by ${currentUser} – earn $3 when friends upgrade
  </p>
  </div>`;
  
  const div=document.createElement('div');
  div.innerHTML=htmlContent;
  div.style.position='absolute'; div.style.left='-9999px';
  document.body.appendChild(div);

  const canvas=await html2canvas(div,{scale:2});
  const img=canvas.toDataURL('image/png');
  const { jsPDF}=window.jspdf;
  const pdf=new jsPDF('p','mm','a4');
  const width=pdf.internal.pageSize.getWidth();
  const height=(canvas.height*width)/canvas.width;
  pdf.addImage(img,'PNG',0,0,width,height);
  const blob=pdf.output('blob');

  // Send email via Resend API
  const form=new FormData();
  form.append('from','GrowReport <hello@growreport.io>');
  form.append('to',currentUser);
  form.append('subject','Your FREE Growth Report');
  form.append('html',`<p>Hi ${currentUser},</p><p>Here’s your free growth report PDF attached!</p>`);
  form.append('attachment',blob,'GrowReport.pdf');

  try{
    await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${RESEND_KEY}`},
      body:form
    });
    alert('Report generated and sent to your email!');
  }catch(err){
    console.error(err);
    alert('Error sending email. Check your Resend key.');
  }
  document.body.removeChild(div);
}

// ---------------- WALLETS ----------------
const walletsEl=document.getElementById('wallets');
async function getPrices(){
  const ETH=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').then(r=>r.json());
  const BTC=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(r=>r.json());
  const SOL=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd').then(r=>r.json());
  const MATIC=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd').then(r=>r.json());
  const SUI=1; // placeholder for SUI price; replace with API if available
  return {ETH:ETH.ethereum.usd,BTC:BTC.bitcoin.usd,SOL:SOL.solana.usd,MATIC:MATIC.matic,BUSD:SUI};
}
getPrices().then(prices=>{
  WALLETS.forEach(w=>{
    let price=prices[w.network]||PRO_AMOUNT_USD; 
    const cryptoAmount=(PRO_AMOUNT_USD/price).toFixed(6);
    const div=document.createElement('div');div.className='wallet';
    div.innerHTML=`<h3>${w.label} — ${w.network}</h3><div id="addr-${w.id}">${w.address}</div><p>Amount: ${cryptoAmount} ${w.network}</p><button class="btn copy" data-addr="${w.address}">Copy Address</button>`;
    walletsEl.appendChild(div);
  });
});
document.addEventListener('click',e=>{if(e.target.matches('.copy')){navigator.clipboard.writeText(e.target.getAttribute('data-addr')).then(()=>alert('Address copied'));}});

// ---------------- MANUAL PRO VERIFY ----------------
document.getElementById('verifyBtn').addEventListener('click',()=>{
  const tx=document.getElementById('txInput').value.trim();
  if(!tx)return alert('Paste transaction hash');
  const user=users[currentUser];
  user.pro=true;
  user.proExpiry=Date.now()+PRO_DURATION_MS;
  saveUsers(); showDashboard();
  alert('Pro unlocked for 2 weeks!');
});

// ---------------- DASHBOARD ----------------
function showDashboard(){
  document.getElementById('dashboard').style.display='block';
  document.getElementById('proSection').style.display='none';
  updateUsageInfo();
}

// ---------------- PRO EXPIRY ----------------
function checkProExpiry(){
  const user=users[currentUser];
  if(user.pro && user.proExpiry && Date.now()>user.proExpiry){
    user.pro=false;
    user.freeUses=0;
    saveUsers();
    alert('Your Pro plan has expired. Please pay again to continue.');
  }
}

// ---------------- REFERRAL ----------------
const params=new URLSearchParams(window.location.search);
const REF=params.get('ref');
if(currentUser && REF && REF!==currentUser && users[REF]){
  users[REF].refBonus+=3; saveUsers(); alert(`${REF} earned $3 referral bonus!`);
}

// Copy referral
document.getElementById('copyRefBtn').addEventListener('click',()=>navigator.clipboard.writeText(document.getElementById('refLink').value).then(()=>alert('Referral link copied')));