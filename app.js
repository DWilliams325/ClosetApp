// ---------- Constants ----------
const STORAGE_KEY = 'closetItems';
const LAST_CAT_KEY = 'closetLastCategory';

// Shorthand first so it's available everywhere
const $ = (sel) => document.querySelector(sel);

const CATEGORIES = [
  'Dress','Button Up','T-Shirt','Crop-Top','Dress Pants','Khaki Shorts',
  'Basketball Shorts','Skirts','Hoodies','Sweats'
];

const COLORS = [
  { name: 'Black',  hex: '#000000' },
  { name: 'White',  hex: '#FFFFFF' },
  { name: 'Gray',   hex: '#808080' },
  { name: 'Navy',   hex: '#001f3f' },
  { name: 'Blue',   hex: '#1e90ff' },
  { name: 'Light Blue', hex: '#87cefa' },
  { name: 'Green',  hex: '#2ecc40' },
  { name: 'Olive',  hex: '#556b2f' },
  { name: 'Brown',  hex: '#8B4513' },
  { name: 'Tan',    hex: '#D2B48C' },
  { name: 'Beige',  hex: '#F5F5DC' },
  { name: 'Cream',  hex: '#FFFDD0' },
  { name: 'Yellow', hex: '#FFD700' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Red',    hex: '#FF4136' },
  { name: 'Burgundy', hex: '#800020' },
  { name: 'Pink',   hex: '#FFC0CB' },
  { name: 'Purple', hex: '#800080' }
];

// ---------- State ----------
let items = [];
let activeFilter = 'All';
let lastSelectedFileDataURL = null;

// Speed Add state
let speedStream = null;
let speedQueue = [];  // [{dataURL:string, ts:number}]
let speedOpen = false;

// Edit modal state
let editingId = null;

// ---------- Elements ----------
const nameInput   = $('#name');
const catSelect   = $('#category');
const colorSelect = $('#color');
const addBtn      = $('#addBtn');
const filters     = $('#filters');
const list        = $('#list');
const empty       = $('#empty');

const speedBtn    = $('#speedBtn');
const speedModal  = $('#speedModal');
const speedVideo  = $('#speedVideo');
const speedCanvas = $('#speedCanvas');
const speedClose  = $('#speedClose');
const speedShutter= $('#speedShutter');
const speedSave   = $('#speedSave');
const speedUndo   = $('#speedUndo');
const speedThumbs = $('#speedThumbs');
const speedCount  = $('#speedCount');
const speedCategory = $('#speedCategory');

// Share / import (optional)
const shareBtn     = $('#shareBtn');
const importModal  = $('#importModal');
const closeModal   = $('#closeModal');
const modalSummary = $('#modalSummary');
const modalGrid    = $('#modalGrid');
const modalReplace = $('#modalReplace');
const modalMerge   = $('#modalMerge');

// Dropzone
const dropzone   = $('#dropzone');
const dzThumb    = $('#dzThumb');
const photoInput = $('#photo');

// Edit modal
const editModal     = $('#editModal');
const editClose     = $('#editClose');
const editName      = $('#editName');
const editCategory  = $('#editCategory');
const editColor     = $('#editColor');
const editPhoto     = $('#editPhoto');
const editPhotoBtn  = $('#editPhotoBtn');
const editDelete    = $('#editDelete');
const editSave      = $('#editSave');

// ---------- Helpers ----------
function colorNameFromHex(hex){ return (COLORS.find(c=>c.hex===hex)?.name) || ''; }

function populateCategories(selectEl){
  selectEl.innerHTML = '<option value="">Select a category...</option>';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selectEl.appendChild(opt);
  });
}
function populateColorSelect(sel){
  sel.innerHTML = '<option value="">Select a color...</option>';
  COLORS.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.hex;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function validateForm() {
  // name optional
  const ok = catSelect.value.trim() && !!lastSelectedFileDataURL;
  addBtn.disabled = !ok;
}

function loadItems() {
  try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { items = []; }
}
function saveItems() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function setLastCategory(v){ localStorage.setItem(LAST_CAT_KEY, v||''); }
function getLastCategory(){ return localStorage.getItem(LAST_CAT_KEY) || ''; }

function toB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function fromB64(b64){ return decodeURIComponent(escape(atob(b64))); }

// Draft preserve
const DRAFT_KEY='closetDraft';
function saveDraft(){
  const d={name:nameInput.value, category:catSelect.value, thumb:lastSelectedFileDataURL||''};
  localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
}
function loadDraft(){
  try{
    const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if (!d) return;
    if (d.name) nameInput.value=d.name;
    if (d.category) catSelect.value=d.category;
    if (d.thumb){ lastSelectedFileDataURL=d.thumb; dzThumb.style.backgroundImage=`url('${d.thumb}')`; }
  }catch{}
}

// ---------- Image utils (mobile-friendly) ----------
async function fileToImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    const fr = new FileReader();
    fr.onload = () => { img.src = fr.result; };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}
async function fileToBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch {}
  }
  return await fileToImage(file);
}
function drawToCanvas(bitmap, max = 1280) {
  const w = bitmap.width  || bitmap.naturalWidth || bitmap.videoWidth;
  const h = bitmap.height || bitmap.naturalHeight || bitmap.videoHeight;
  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { alpha: false });
  ctx.drawImage(bitmap, 0, 0, cw, ch);
  return c;
}
function canvasToJPEGDataURL(canvas, quality = 0.8) { return canvas.toDataURL('image/jpeg', quality); }
async function compressFileToDataURL_Mobile(file) {
  const bmp = await fileToBitmap(file);
  const canvas = drawToCanvas(bmp, 1280);
  if (bmp && typeof bmp.close === 'function') { try { bmp.close(); } catch {} }
  return canvasToJPEGDataURL(canvas, 0.8);
}
function compressVideoFrameToDataURL(videoEl){
  const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
  if (!vw || !vh) return null;
  const max = 1280;
  const scale = Math.min(1, max / Math.max(vw, vh));
  const cw = Math.max(1, Math.round(vw * scale));
  const ch = Math.max(1, Math.round(vh * scale));
  speedCanvas.width = cw; speedCanvas.height = ch;
  const ctx = speedCanvas.getContext('2d', { alpha:false });
  ctx.drawImage(videoEl, 0, 0, cw, ch);
  return speedCanvas.toDataURL('image/jpeg', 0.8);
}
function suggestNameFromFile(file){
  if (!file?.name) return;
  const n = file.name.replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' ').trim();
  if (!nameInput.value) nameInput.value = n;
}

// ---------- Init ----------
populateCategories(catSelect);
populateCategories(speedCategory);
if (editCategory) populateCategories(editCategory);

populateColorSelect(colorSelect);
if (editColor) populateColorSelect(editColor);

const _lastCat = getLastCategory();
if (_lastCat) { catSelect.value = _lastCat; speedCategory.value = _lastCat; }

loadDraft();
validateForm();

// ---------- Dropzone ----------
dropzone.addEventListener('click', () => photoInput.click());
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); photoInput.click(); }
});
['dragenter','dragover'].forEach(ev => {
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dragover'); });
});
['dragleave','drop'].forEach(ev => {
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dragover'); });
});
dropzone.addEventListener('drop', async (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  lastSelectedFileDataURL = await compressFileToDataURL_Mobile(file);
  dzThumb.style.backgroundImage = `url('${lastSelectedFileDataURL}')`;
  suggestNameFromFile(file);
  validateForm();
  saveDraft();
});

// File input change (supports batch)
photoInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) {
    lastSelectedFileDataURL = null; dzThumb.style.backgroundImage = ''; validateForm(); saveDraft(); return;
  }
  if (files.length > 1) {
    if (!catSelect.value) { alert('Pick a Category first, then select multiple photos to batch add.'); return; }
    const category = catSelect.value.trim();
    const colorHex = colorSelect?.value || '';
    const colorName = colorNameFromHex(colorHex);
    const now = Date.now();
    for (let i=0;i<files.length;i++){
      const f = files[i];
      if (i % 3 === 0) { await new Promise(r => setTimeout(r, 0)); }
      const imageDataURL = await compressFileToDataURL_Mobile(f);
      const baseName = f.name.replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' ').trim();
      items.push({
        id:(now+i).toString(),
        name: baseName || `Item ${i+1}`,
        category,
        colorHex, colorName,
        imageDataURL
      });
    }
    saveItems();
    nameInput.value=''; lastSelectedFileDataURL=null; dzThumb.style.backgroundImage=''; validateForm(); render();
    alert(`Imported ${files.length} items to ${category}.`);
    return;
  }
  const file = files[0];
  lastSelectedFileDataURL = await compressFileToDataURL_Mobile(file);
  dzThumb.style.backgroundImage = `url('${lastSelectedFileDataURL}')`;
  suggestNameFromFile(file);
  validateForm();
  saveDraft();
});

// Validate on other fields
nameInput.addEventListener('input', () => { validateForm(); saveDraft(); });
catSelect.addEventListener('change', () => { setLastCategory(catSelect.value); speedCategory.value = catSelect.value; validateForm(); saveDraft(); });

// Enter to submit
nameInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter' && !addBtn.disabled) addBtn.click(); });
window.addEventListener('beforeunload', saveDraft);

// ---------- Add item ----------
addBtn.addEventListener('click', () => {
  const category = catSelect.value.trim();
  const colorHex = colorSelect?.value || '';
  const colorName = colorNameFromHex(colorHex);

  if (!category) { alert('Pick a category.'); return; }
  if (!lastSelectedFileDataURL) { alert('Add a photo first.'); return; }

  const safeName = (nameInput.value.trim() || `${category} ${colorName || ''}`).trim();

  const newItem = {
    id: Date.now().toString(),
    name: safeName,
    category,
    colorHex, colorName,
    imageDataURL: lastSelectedFileDataURL
  };

  items.push(newItem);
  saveItems();

  setLastCategory(category);
  nameInput.value = '';
  if (colorSelect) colorSelect.value = '';
  lastSelectedFileDataURL = null; dzThumb.style.backgroundImage = '';
  validateForm();
  localStorage.removeItem(DRAFT_KEY);
  render();
});

// ---------- Render ----------
function renderFilters() {
  filters.innerHTML = '';
  ['All', ...CATEGORIES].forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (activeFilter === c ? ' active' : '');
    chip.textContent = c;
    chip.addEventListener('click', () => { activeFilter = c; render(); });
    filters.appendChild(chip);
  });
}
function renderList() {
  const data = activeFilter === 'All' ? items : items.filter(it => it.category === activeFilter);
  list.innerHTML = '';
  if (!data.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  data.forEach(it => {
    const card = document.createElement('div'); card.className = 'card';

    const img = document.createElement('img');
    img.loading='lazy'; img.decoding='async';
    img.src = it.imageDataURL; img.alt = it.name;
    card.appendChild(img);

    const nameEl = document.createElement('div'); nameEl.className = 'name'; nameEl.textContent = it.name; card.appendChild(nameEl);

    const catEl = document.createElement('div'); catEl.className = 'cat'; catEl.textContent = it.category; card.appendChild(catEl);

    if (it.colorHex){
      const dot = document.createElement('span');
      dot.className = 'color-dot';
      dot.style.background = it.colorHex;
      dot.title = it.colorName || it.colorHex;
      card.appendChild(dot);
    }

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-edit'; editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', ()=> openEditModal(it));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      if (!confirm(`Remove "${it.name}"?`)) return;
      items = items.filter(x => x.id !== it.id); saveItems(); render();
    });

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex'; btnRow.style.flexDirection = 'column'; btnRow.style.gap = '6px';
    btnRow.appendChild(editBtn); btnRow.appendChild(delBtn); card.appendChild(btnRow);

    list.appendChild(card);
  });
}
function render() { renderFilters(); renderList(); }

// ---------- Share link + modal (optional) ----------
if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    try {
      const payload = { version: 1, items };
      const json = JSON.stringify(payload);
      const b64 = toB64(json);
      const base = location.origin + location.pathname;
      const url  = `${base}?import=${encodeURIComponent(b64)}`;
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); alert('Share link copied to clipboard!\n\nSend it to your friend.'); }
      else { prompt('Copy this link:', url); }
    } catch (e) { console.error(e); alert('Failed to create share link.'); }
  });
}
(function handleImportParam(){
  const params = new URLSearchParams(location.search);
  const raw = params.get('import'); if (!raw) return;
  try {
    const json = fromB64(decodeURIComponent(raw));
    const parsed = JSON.parse(json);
    const arr = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : null;
    if (!arr) throw new Error('Invalid format');
    const valid = arr.filter(it => it && typeof it.id==='string' && typeof it.name==='string' && typeof it.category==='string' && typeof it.imageDataURL==='string');
    if (!valid.length) throw new Error('No valid items');

    modalSummary.textContent = `This link contains ${valid.length} item${valid.length!==1?'s':''}. Preview:`;
    modalGrid.innerHTML = '';
    valid.slice(0, 12).forEach(it => {
      const div = document.createElement('div'); div.className = 'thumb';
      div.innerHTML = `<img src="${it.imageDataURL}" alt=""><div class="n">${it.name}</div><div class="c">${it.category}</div>`;
      modalGrid.appendChild(div);
    });

    modalReplace.onclick = () => { items = valid; saveItems(); render(); closeModalFn(); history.replaceState({}, '', location.pathname); alert('Imported (replaced).'); };
    modalMerge.onclick   = () => {
      const map = new Map(items.map(i => [i.id, i])); for (const it of valid) if (!map.has(it.id)) map.set(it.id, it);
      items = Array.from(map.values()); saveItems(); render(); closeModalFn(); history.replaceState({}, '', location.pathname); alert('Imported (merged).');
    };
    openModal();
  } catch (e) { console.error('Import link parse failed:', e); alert('Sorry, that import link is invalid or too large.'); history.replaceState({}, '', location.pathname); }
})();
function openModal(){ importModal.style.display = 'flex'; }
function closeModalFn(){ importModal.style.display = 'none'; }
closeModal?.addEventListener('click', closeModalFn);
importModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeModalFn);

// ---------- SPEED ADD ----------
async function startSpeedCamera(){
  try{
    speedStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    speedVideo.srcObject = speedStream;
    await speedVideo.play();
  }catch(e){
    console.error(e);
    alert('Could not open camera. Please allow camera permissions.');
    closeSpeedModal();
  }
}
function stopSpeedCamera(){
  if (speedStream){ speedStream.getTracks().forEach(t=>t.stop()); speedStream = null; }
  speedVideo.srcObject = null;
}
function openSpeedModal(){
  speedOpen = true;
  speedModal.style.display = 'flex';
  const sticky = getLastCategory();
  if (sticky) speedCategory.value = sticky;
  speedQueue = [];
  updateSpeedUI();
  startSpeedCamera();
}
function closeSpeedModal(){
  speedOpen = false;
  stopSpeedCamera();
  speedModal.style.display = 'none';
  speedQueue = [];
  updateSpeedUI();
}
function updateSpeedUI(){
  speedCount.textContent = String(speedQueue.length);
  speedUndo.disabled = speedQueue.length === 0;
  speedSave.disabled = speedQueue.length === 0 || !speedCategory.value;
  speedThumbs.innerHTML = '';
  speedQueue.slice(-30).forEach(q=>{
    const img = document.createElement('img');
    img.src = q.dataURL; img.alt='preview';
    speedThumbs.appendChild(img);
  });
}

speedBtn.addEventListener('click', openSpeedModal);
speedClose.addEventListener('click', closeSpeedModal);
speedModal.querySelector('.modal-backdrop').addEventListener('click', closeSpeedModal);
speedCategory.addEventListener('change', ()=>{ setLastCategory(speedCategory.value); speedSave.disabled = speedQueue.length === 0 || !speedCategory.value; });
speedUndo.addEventListener('click', ()=>{ speedQueue.pop(); updateSpeedUI(); });
speedShutter.addEventListener('click', async ()=>{
  if (!speedVideo.videoWidth) return;
  const dataURL = compressVideoFrameToDataURL(speedVideo);
  if (!dataURL) return;
  speedQueue.push({ dataURL, ts: Date.now() });
  await new Promise(r => setTimeout(r, 0)); // keep UI responsive
  updateSpeedUI();
});
speedSave.addEventListener('click', ()=>{
  const category = speedCategory.value.trim();
  const colorHex = colorSelect?.value || '';
  const colorName = colorNameFromHex(colorHex);
  if (!category) { alert('Choose a category first.'); return; }
  const t0 = Date.now();
  const base = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  speedQueue.forEach((q, i)=>{
    items.push({
      id: (t0+i).toString(),
      name: `${category} ${base}-${i+1}`,
      category,
      colorHex, colorName,
      imageDataURL: q.dataURL
    });
  });
  saveItems();
  render();
  alert(`Saved ${speedQueue.length} items to ${category}.`);
  closeSpeedModal();
});

// ---------- EDIT MODAL ----------
function openEditModal(item){
  editingId = item.id;
  if (editName)      editName.value = item.name || '';
  if (editCategory)  editCategory.value = item.category || '';
  if (editColor)     editColor.value = item.colorHex || '';
  editModal.style.display = 'flex';
}
function closeEditModal(){
  editingId = null;
  editModal.style.display = 'none';
}
editClose?.addEventListener('click', closeEditModal);
editModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeEditModal);

editPhotoBtn?.addEventListener('click', ()=> editPhoto?.click());
editPhoto?.addEventListener('change', async (e)=>{
  const f = e.target.files && e.target.files[0];
  if (!f || !editingId) return;
  const dataURL = await compressFileToDataURL_Mobile(f);
  items = items.map(x => x.id===editingId ? {...x, imageDataURL: dataURL} : x);
  saveItems(); render();
  alert('Photo updated.');
});

editDelete?.addEventListener('click', ()=>{
  if (!editingId) return;
  const it = items.find(x=>x.id===editingId);
  if (it && confirm(`Delete "${it.name || it.category}"?`)){
    items = items.filter(x=>x.id!==editingId);
    saveItems(); render(); closeEditModal();
  }
});

editSave?.addEventListener('click', ()=>{
  if (!editingId) return;
  const name = editName?.value.trim() || '';
  const category = editCategory?.value.trim() || '';
  const colorHex = editColor?.value || '';
  const colorName = colorNameFromHex(colorHex);
  items = items.map(x=> x.id===editingId ? {...x, name, category, colorHex, colorName} : x);
  saveItems(); render(); closeEditModal();
});

// ---------- Boot ----------
loadItems();
render();
validateForm();
