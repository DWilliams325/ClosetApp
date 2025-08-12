// ---------- Constants ----------
const STORAGE_KEY  = 'closetItems';
const OUTFIT_KEY   = 'closetOutfits';
const LAST_CAT_KEY = 'closetLastCategory';
const THEME_KEY    = 'closetTheme';

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


// Tops/Bottoms groupings for outfits
const TOPS_CATS = new Set(['Button Up', 'T-Shirt', 'Crop-Top', 'Hoodies', 'Dress']);
const BOTTOMS_CATS = new Set(['Dress Pants', 'Khaki Shorts', 'Basketball Shorts', 'Skirts', 'Sweats']);
function isTopCategory(cat){ return TOPS_CATS.has(cat); }
function isBottomCategory(cat){ return BOTTOMS_CATS.has(cat); }

// ---------- Theme helpers ----------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const sel = document.querySelector('#themeSelect');
  if (sel && sel.value !== theme) sel.value = theme;
  localStorage.setItem(THEME_KEY, theme);
}

// ---------- State ----------
let items = [];
let outfits = [];
let activeFilter = 'All';
let lastSelectedFileDataURL = null; // from camera/gallery
let lastSelectedImageURL    = null; // from URL field

// Speed Add state
let speedStream = null;
let speedQueue = [];  // [{dataURL:string, ts:number}]

// Edit modal state
let editingId = null;

// Outfit Builder state
let outfitSelectedIds = new Set();

// ---------- Elements ----------
const catSelect   = $('#category');
const colorSelect = $('#color');
const addBtn      = $('#addBtn');
const filters     = $('#filters');
const list        = $('#list');
const empty       = $('#empty');

// Add via URL
const imageUrlInput = $('#imageUrl');
const useUrlBtn     = $('#useUrlBtn');

// Speed Add
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
const speedGallery    = $('#speedGallery');

// Theme select
const themeSelect = document.querySelector('#themeSelect');

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
const editCategory  = $('#editCategory');
const editColor     = $('#editColor');
const editPhoto     = $('#editPhoto');
const editPhotoBtn  = $('#editPhotoBtn');
const editDelete    = $('#editDelete');
const editSave      = $('#editSave');
const editImageUrl  = $('#editImageUrl');
const editUseUrlBtn = $('#editUseUrlBtn');

// Outfit UI
const outfitBtn      = $('#outfitBtn');
const outfitList     = $('#outfitList');
const outfitEmpty    = $('#outfitEmpty');

const outfitModal    = $('#outfitModal');
const outfitClose    = $('#outfitClose');
const outfitCatFilter= $('#outfitCatFilter');
const outfitColorFilter = $('#outfitColorFilter');
const outfitGrid     = $('#outfitGrid');
const outfitSelectedTops = $('#outfitSelectedTops');
const outfitSelectedBottoms = $('#outfitSelectedBottoms');
const outfitName     = $('#outfitName');
const outfitClear    = $('#outfitClear');
const outfitSaveBtn  = $('#outfitSave');

// ---- Live URL previews (Add & Edit) ----

// Add Item preview + spinner
const imageUrlPreviewWrap = $('#imageUrlPreview');
const imageUrlPreview = imageUrlPreviewWrap?.querySelector('img');
const imageUrlSpinner = imageUrlPreviewWrap?.querySelector('.spinner');

imageUrlInput?.addEventListener('input', () => {
  const url = imageUrlInput.value.trim();
  if (!imageUrlPreviewWrap || !imageUrlPreview) return;

  if (url) {
    imageUrlPreviewWrap.style.display = 'block';
    if (imageUrlSpinner) imageUrlSpinner.style.display = 'block';

    imageUrlPreview.onload = () => { if (imageUrlSpinner) imageUrlSpinner.style.display = 'none'; };
    imageUrlPreview.onerror = () => {
      if (imageUrlSpinner) imageUrlSpinner.style.display = 'none';
      imageUrlPreviewWrap.style.display = 'none';
    };
    imageUrlPreview.src = url; // set src last so handlers are ready
  } else {
    imageUrlPreviewWrap.style.display = 'none';
    if (imageUrlSpinner) imageUrlSpinner.style.display = 'none';
    imageUrlPreview.removeAttribute('src');
  }
});


// Edit Item preview + spinner
const editImageUrlPreviewWrap = $('#editImageUrlPreview');
const editImageUrlPreview = editImageUrlPreviewWrap?.querySelector('img');
const editImageUrlSpinner = editImageUrlPreviewWrap?.querySelector('.spinner');

editImageUrl?.addEventListener('input', () => {
  const url = editImageUrl.value.trim();
  if (!editImageUrlPreviewWrap || !editImageUrlPreview) return;

  if (url) {
    editImageUrlPreviewWrap.style.display = 'block';
    if (editImageUrlSpinner) editImageUrlSpinner.style.display = 'block';

    editImageUrlPreview.onload = () => { if (editImageUrlSpinner) editImageUrlSpinner.style.display = 'none'; };
    editImageUrlPreview.onerror = () => {
      if (editImageUrlSpinner) editImageUrlSpinner.style.display = 'none';
      editImageUrlPreviewWrap.style.display = 'none';
    };
    editImageUrlPreview.src = url;
  } else {
    editImageUrlPreviewWrap.style.display = 'none';
    if (editImageUrlSpinner) editImageUrlSpinner.style.display = 'none';
    editImageUrlPreview.removeAttribute('src');
  }
});


// ---------- Helpers ----------
function colorNameFromHex(hex){ return (COLORS.find(c=>c.hex===hex)?.name) || ''; }

function populateCategories(selectEl, withAllPrompt=false){
  selectEl.innerHTML = withAllPrompt ? '<option value="">All categories</option>' : '<option value="">Select a category...</option>';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    selectEl.appendChild(opt);
  });
}
function populateColorSelect(sel, withAllPrompt=false){
  sel.innerHTML = withAllPrompt ? '<option value="">All colors</option>' : '<option value="">Select a color...</option>';
  COLORS.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.hex;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function getImageSrc(it){
  // Prefer dataURL (offline-safe). Fallback to remote URL.
  return it.imageDataURL || it.imageURL || '';
}

function looksLikeUrl(u){
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch { return false; }
}

function validateForm() {
  // require category + either local photo OR a URL
  const ok = catSelect.value.trim() && (!!lastSelectedFileDataURL || !!lastSelectedImageURL);
  addBtn.disabled = !ok;
}

function loadItems() {
  try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { items = []; }
}
function saveItems() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function loadOutfits() {
  try { outfits = JSON.parse(localStorage.getItem(OUTFIT_KEY) || '[]'); }
  catch { outfits = []; }
}
function saveOutfits() { localStorage.setItem(OUTFIT_KEY, JSON.stringify(outfits)); }

function setLastCategory(v){ localStorage.setItem(LAST_CAT_KEY, v||''); }
function getLastCategory(){ return localStorage.getItem(LAST_CAT_KEY) || ''; }

function toB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function fromB64(b64){ return decodeURIComponent(escape(atob(b64))); }

// Draft preserve (supports URL or dataURL)
const DRAFT_KEY='closetDraft';
function saveDraft(){
  const d={
    category: catSelect.value,
    // store whichever is present
    thumb: lastSelectedFileDataURL || lastSelectedImageURL || ''
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
}
function loadDraft(){
  try{
    const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if (!d) return;
    if (d.category) catSelect.value=d.category;
    if (d.thumb){
      if (d.thumb.startsWith('data:')){
        lastSelectedFileDataURL = d.thumb;
        lastSelectedImageURL = null;
      } else {
        lastSelectedImageURL = d.thumb;
        lastSelectedFileDataURL = null;
      }
      dzThumb.style.backgroundImage=`url('${d.thumb}')`;
    }
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

// ---------- Init ----------
populateCategories(catSelect);
populateCategories(speedCategory);
if (editCategory) populateCategories(editCategory);

populateColorSelect(colorSelect);
if (editColor) populateColorSelect(editColor);

populateCategories(outfitCatFilter, true);
populateColorSelect(outfitColorFilter, true);

// Theme: initial apply (saved → OS dark → light)
const savedTheme =
  localStorage.getItem(THEME_KEY) ||
  (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
themeSelect?.addEventListener('change', (e)=> applyTheme(e.target.value));

const _lastCat = getLastCategory();
if (_lastCat) { catSelect.value = _lastCat; speedCategory.value = _lastCat; }

loadItems();
loadOutfits();
loadDraft();
validateForm();

// ---------- Dropzone (camera/gallery) ----------
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
  const data = await compressFileToDataURL_Mobile(file);
  lastSelectedFileDataURL = data;
  lastSelectedImageURL = null;
  dzThumb.style.backgroundImage = `url('${data}')`;
  validateForm();
  saveDraft();
});



// File input change (supports batch)
photoInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) {
    lastSelectedFileDataURL = null; lastSelectedImageURL = null;
    dzThumb.style.backgroundImage = ''; validateForm(); saveDraft(); return;
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
      items.push({
        id:(now+i).toString(),
        category,
        colorHex, colorName,
        imageDataURL
      });
    }
    saveItems();
    lastSelectedFileDataURL=null; lastSelectedImageURL=null;
    dzThumb.style.backgroundImage=''; validateForm(); render();
    alert(`Imported ${files.length} items to ${category}.`);
    return;
  }
  const file = files[0];
  const data = await compressFileToDataURL_Mobile(file);
  lastSelectedFileDataURL = data;
  lastSelectedImageURL = null;
  dzThumb.style.backgroundImage = `url('${data}')`;
  validateForm();
  saveDraft();
});
// iOS A2HS tip (one-time)
(function () {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isIOS && !isStandalone && !localStorage.getItem('iosA2HS_seen')) {
    const bar = document.getElementById('iosA2HS');
    const close = document.getElementById('iosA2HSClose');
    if (bar) bar.style.display = 'block';
    close?.addEventListener('click', () => {
      bar.style.display = 'none';
      localStorage.setItem('iosA2HS_seen', '1');
    });
  }
})();

// ---------- Add via URL ----------
useUrlBtn?.addEventListener('click', () => {
  const u = (imageUrlInput?.value || '').trim();
  if (!looksLikeUrl(u)) { alert('Please paste a valid http(s) image URL.'); return; }
  lastSelectedImageURL = u;
  lastSelectedFileDataURL = null;
  dzThumb.style.backgroundImage = `url('${u}')`;
  validateForm();
  saveDraft();
});

// Category changes
catSelect.addEventListener('change', () => {
  setLastCategory(catSelect.value);
  speedCategory.value = catSelect.value;
  validateForm();
  saveDraft();
});

// ---------- Add item ----------
addBtn.addEventListener('click', () => {
  const category = catSelect.value.trim();
  const colorHex = colorSelect?.value || '';
  const colorName = colorNameFromHex(colorHex);

  if (!category) { alert('Pick a category.'); return; }
  if (!lastSelectedFileDataURL && !lastSelectedImageURL) { alert('Add a photo or URL first.'); return; }

  const newItem = {
    id: Date.now().toString(),
    category,
    colorHex, colorName
  };
  if (lastSelectedFileDataURL) newItem.imageDataURL = lastSelectedFileDataURL;
  else newItem.imageURL = lastSelectedImageURL;

  items.push(newItem);
  saveItems();

  setLastCategory(category);
  if (colorSelect) colorSelect.value = '';
  lastSelectedFileDataURL = null; lastSelectedImageURL = null;
  dzThumb.style.backgroundImage = '';
  if (imageUrlInput) imageUrlInput.value = '';
  validateForm();
  localStorage.removeItem(DRAFT_KEY);
  render();
});

// ---------- Render closet ----------
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
    img.src = getImageSrc(it); img.alt = it.category;
    card.appendChild(img);

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
      if (!confirm(`Delete this item?`)) return;
      items = items.filter(x => x.id !== it.id); saveItems(); render(); renderOutfits();
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
      const payload = { version: 3, items };
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
    const valid = arr.filter(it =>
      it && typeof it.id==='string' &&
      typeof it.category==='string' &&
      // must have either a dataURL or a URL
      (typeof it.imageDataURL==='string' || typeof it.imageURL==='string')
    );
    if (!valid.length) throw new Error('No valid items');

    modalSummary.textContent = `This link contains ${valid.length} item${valid.length!==1?'s':''}. Preview:`;
    modalGrid.innerHTML = '';
    valid.slice(0, 12).forEach(it => {
      const colorText = it.colorName || it.colorHex || '';
      const src = getImageSrc(it);
      const div = document.createElement('div'); div.className = 'thumb';
      div.innerHTML = `
        <img src="${src}" alt="">
        <div class="c">${it.category}${colorText ? ' • ' + colorText : ''}</div>
      `;
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
  speedModal.style.display = 'flex';
  const sticky = getLastCategory();
  if (sticky) speedCategory.value = sticky;
  speedQueue = [];
  updateSpeedUI();
  startSpeedCamera();
}
function closeSpeedModal(){
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

speedBtn?.addEventListener('click', openSpeedModal);
speedClose?.addEventListener('click', closeSpeedModal);
speedModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeSpeedModal);
speedCategory?.addEventListener('change', ()=>{ setLastCategory(speedCategory.value); speedSave.disabled = speedQueue.length === 0 || !speedCategory.value; });
speedUndo?.addEventListener('click', ()=>{ speedQueue.pop(); updateSpeedUI(); });
speedShutter?.addEventListener('click', async ()=>{
  if (!speedVideo.videoWidth) return;
  const dataURL = compressVideoFrameToDataURL(speedVideo);
  if (!dataURL) return;
  speedQueue.push({ dataURL, ts: Date.now() });
  await new Promise(r => setTimeout(r, 0)); // keep UI responsive
  updateSpeedUI();
});

// Add from Gallery (triggered via label)
speedGallery?.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []).filter(f => /^image\//.test(f.type));
  if (!files.length) return;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
    try {
      const dataURL = await compressFileToDataURL_Mobile(f);
      speedQueue.push({ dataURL, ts: Date.now() });
    } catch (err) {
      console.warn('Failed to add image from gallery:', err);
    }
  }
  e.target.value = '';
  updateSpeedUI();
  alert(`Added ${files.length} photo${files.length!==1?'s':''} from gallery.`);
});

speedSave?.addEventListener('click', ()=>{
  const category = speedCategory.value.trim();
  const colorHex = colorSelect?.value || '';
  const colorName = colorNameFromHex(colorHex);
  if (!category) { alert('Choose a category first.'); return; }
  const t0 = Date.now();
  speedQueue.forEach((q, i)=>{
    items.push({
      id: (t0+i).toString(),
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
  if (editCategory)  editCategory.value = item.category || '';
  if (editColor)     editColor.value = item.colorHex || '';
  if (editImageUrl)  editImageUrl.value = item.imageURL || '';
  // Initialize the edit URL preview on open
// Initialize the edit URL preview on open
if (editImageUrlPreviewWrap && editImageUrlPreview) {
  const u = item.imageURL || '';
  if (u) {
    editImageUrlPreviewWrap.style.display = 'block';
    const spinner = editImageUrlPreviewWrap.querySelector('.spinner');
    if (spinner) spinner.style.display = 'block';

    editImageUrlPreview.onload = () => { if (spinner) spinner.style.display = 'none'; };
    editImageUrlPreview.onerror = () => {
      if (spinner) spinner.style.display = 'none';
      editImageUrlPreviewWrap.style.display = 'none';
    };
    editImageUrlPreview.src = u;
  } else {
    editImageUrlPreviewWrap.style.display = 'none';
    const spinner = editImageUrlPreviewWrap.querySelector('.spinner');
    if (spinner) spinner.style.display = 'none';
    editImageUrlPreview.removeAttribute('src');
  }
}


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
  items = items.map(x => x.id===editingId ? {...x, imageDataURL: dataURL, imageURL: undefined} : x);
  saveItems(); render(); renderOutfits();
  alert('Photo updated.');
});

editUseUrlBtn?.addEventListener('click', ()=>{
  if (!editingId) return;
  const u = (editImageUrl?.value || '').trim();
  if (!looksLikeUrl(u)) { alert('Please paste a valid http(s) image URL.'); return; }
  items = items.map(x => x.id===editingId ? {...x, imageURL: u, imageDataURL: undefined} : x);
  saveItems(); render(); renderOutfits();
  alert('Image updated from URL.');
});

editDelete?.addEventListener('click', ()=>{
  if (!editingId) return;
  items = items.filter(x=>x.id!==editingId);
  saveItems(); render(); renderOutfits(); closeEditModal();
});

editSave?.addEventListener('click', ()=>{
  if (!editingId) return;
  const category = editCategory?.value.trim() || '';
  const colorHex = editColor?.value || '';
  const colorName = colorNameFromHex(colorHex);
  items = items.map(x=> x.id===editingId ? {...x, category, colorHex, colorName} : x);
  saveItems(); render(); renderOutfits(); closeEditModal();
});

// iOS Safari "Add to Home Screen" tip
(function () {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  if (isIOS && isSafari && !isStandalone && !localStorage.getItem('iosA2HS_seen')) {
    const bar = document.createElement('div');
    bar.id = 'iosA2HS';
    bar.style.cssText = `
      background: #222; color: #fff; padding: 10px;
      position: fixed; bottom: 0; left: 0; right: 0;
      z-index: 9999; text-align: center; font-size: 14px;
    `;
    bar.innerHTML = `
      <span>📱 Add this app to your Home Screen: tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
      <button id="iosA2HSClose" style="margin-left: 10px; background:none; border:none; color:#fff; font-weight:bold;">✕</button>
    `;
    document.body.appendChild(bar);

    document.getElementById('iosA2HSClose').addEventListener('click', () => {
      bar.remove();
      localStorage.setItem('iosA2HS_seen', '1');
    });
  }
})();

// ---------- OUTFIT BUILDER ----------
function openOutfitModal(){
  outfitSelectedIds = new Set();
  outfitName.value = '';
  outfitCatFilter.value = '';
  outfitColorFilter.value = '';
  drawOutfitGrid();
  drawOutfitSelected();
  outfitSaveBtn.disabled = true;
  outfitModal.style.display = 'flex';
}
function closeOutfitModal(){
  outfitModal.style.display = 'none';
}

function drawOutfitGrid(){
  const cat = outfitCatFilter.value;
  const colorHex = outfitColorFilter.value;
  const data = items.filter(it => {
    const cOk = !cat || it.category === cat;
    const colOk = !colorHex || it.colorHex === colorHex;
    return cOk && colOk;
  });

  outfitGrid.innerHTML = '';
  data.forEach(it=>{
    const div = document.createElement('div');
    div.className = 'thumb';
    div.style.cursor = 'pointer';
    div.setAttribute('data-id', it.id);
    const sel = outfitSelectedIds.has(it.id);
    div.innerHTML = `
      <img src="${getImageSrc(it)}" alt="">
      <div class="c">${it.category}${it.colorName ? ' • ' + it.colorName : ''}</div>
      ${sel ? '<div style="margin-top:4px;font-size:12px;color:var(--accent-color);font-weight:700;">Selected</div>' : ''}
    `;
    div.addEventListener('click', ()=>{
      if (outfitSelectedIds.has(it.id)) outfitSelectedIds.delete(it.id);
      else outfitSelectedIds.add(it.id);
      drawOutfitGrid();
      drawOutfitSelected();
    });
    outfitGrid.appendChild(div);
  });
}

function drawOutfitSelected(){
  outfitSelectedTops.innerHTML = '';
  outfitSelectedBottoms.innerHTML = '';

  const ids = Array.from(outfitSelectedIds);
  const tops = [];
  const bottoms = [];

  ids.forEach(id=>{
    const it = items.find(x=>x.id===id);
    if (!it) return;
    if (isTopCategory(it.category)) tops.push(it);
    else if (isBottomCategory(it.category)) bottoms.push(it);
    else tops.push(it); // default bucket
  });

  outfitSaveBtn.disabled = (tops.length + bottoms.length) === 0;

  function renderRow(container, arr){
    arr.forEach(it=>{
      const c = document.createElement('div');
      c.className = 'card';
      c.style.flex = '0 0 110px';
      c.innerHTML = `
        <img src="${getImageSrc(it)}" alt="${it.category}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;background:#eee;">
        <div class="cat">${it.category}${it.colorName ? ' • ' + it.colorName : ''}</div>
        <button class="btn btn-ghost" style="margin-top:6px;">Remove</button>
      `;
      c.querySelector('button').addEventListener('click', ()=>{
        outfitSelectedIds.delete(it.id);
        drawOutfitGrid();
        drawOutfitSelected();
      });
      container.appendChild(c);
    });
  }

  renderRow(outfitSelectedTops, tops);
  renderRow(outfitSelectedBottoms, bottoms);
}

function renderOutfits(){
  outfitList.innerHTML = '';
  const data = outfits.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  if (!data.length){ outfitEmpty.style.display='block'; return; }
  outfitEmpty.style.display='none';

  data.forEach(of=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.style.width = '220px';

    const title = document.createElement('div');
    title.className = 'name';
    title.style.marginBottom = '8px';
    title.textContent = of.name || `Outfit (${(of.itemIds||[]).length} items)`;

    const chosen = (of.itemIds||[]).map(id => items.find(x=>x.id===id)).filter(Boolean);
    const tops = [];
    const bottoms = [];
    chosen.forEach(it=>{
      if (isTopCategory(it.category)) tops.push(it);
      else if (isBottomCategory(it.category)) bottoms.push(it);
      else tops.push(it);
    });

    const topsRow = document.createElement('div');
    topsRow.style.display = 'grid';
    topsRow.style.gridTemplateColumns = '1fr 1fr';
    topsRow.style.gap = '4px';
    topsRow.style.marginBottom = '6px';
    tops.slice(0,4).forEach(it=>{
      const img = document.createElement('img');
      img.src = getImageSrc(it); img.alt = it.category;
      img.style.width='100%'; img.style.height='100px'; img.style.objectFit='cover'; img.style.borderRadius='8px';
      topsRow.appendChild(img);
    });
    if (!tops.length){
      const ph = document.createElement('div');
      ph.textContent = 'No tops'; ph.style.fontSize='12px'; ph.style.color='var(--text-color)';
      topsRow.appendChild(ph);
    }

    const bottomsRow = document.createElement('div');
    bottomsRow.style.display = 'grid';
    bottomsRow.style.gridTemplateColumns = '1fr 1fr';
    bottomsRow.style.gap = '4px';
    bottoms.slice(0,4).forEach(it=>{
      const img = document.createElement('img');
      img.src = getImageSrc(it); img.alt = it.category;
      img.style.width='100%'; img.style.height='100px'; img.style.objectFit='cover'; img.style.borderRadius='8px';
      bottomsRow.appendChild(img);
    });
    if (!bottoms.length){
      const ph = document.createElement('div');
      ph.textContent = 'No bottoms'; ph.style.fontSize='12px'; ph.style.color='var(--text-color)';
      bottomsRow.appendChild(ph);
    }

    const meta = document.createElement('div');
    meta.className = 'cat';
    meta.style.marginTop = '6px';
    meta.textContent = `${(of.itemIds||[]).length} item${(of.itemIds||[]).length!==1?'s':''}`;

    const del = document.createElement('button');
    del.className = 'btn btn-danger';
    del.textContent = 'Delete';
    del.addEventListener('click', ()=>{
      if (!confirm('Delete this outfit?')) return;
      outfits = outfits.filter(x=>x.id !== of.id);
      saveOutfits(); renderOutfits();
    });

    card.appendChild(title);
    card.appendChild(topsRow);
    card.appendChild(bottomsRow);
    card.appendChild(meta);
    card.appendChild(del);
    outfitList.appendChild(card);
  });
}



// open/close + handlers
// Safer binding with a quick health check + console hint
if (outfitBtn) {
  outfitBtn.addEventListener('click', () => {
    try { openOutfitModal(); }
    catch (e) {
      console.error('[Outfit] Failed to open modal:', e);
      alert('Could not open the Outfit builder. Check console for details.');
    }
  });
} else {
  console.warn('[Outfit] #outfitBtn not found on the page.');
}
outfitClose?.addEventListener('click', closeOutfitModal);
outfitModal?.querySelector('.modal-backdrop')?.addEventListener('click', closeOutfitModal);

outfitCatFilter?.addEventListener('change', drawOutfitGrid);
outfitColorFilter?.addEventListener('change', drawOutfitGrid);

outfitClear?.addEventListener('click', ()=>{
  outfitSelectedIds.clear();
  outfitName.value = '';
  drawOutfitGrid();
  drawOutfitSelected();
});

outfitSaveBtn?.addEventListener('click', ()=>{
  const ids = Array.from(outfitSelectedIds);
  if (!ids.length) return;
  const outfit = {
    id: Date.now().toString(),
    name: outfitName.value.trim(),
    itemIds: ids,
    createdAt: Date.now()
  };
  outfits.push(outfit);
  saveOutfits();
  renderOutfits();
  closeOutfitModal();
  alert('Outfit saved!');
});

// ---------- Boot ----------
render();
renderOutfits();
validateForm();
