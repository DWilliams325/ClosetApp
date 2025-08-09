const STORAGE_KEY = 'closetItems';
const CATEGORIES = [
  'Dress','Button Up','T-Shirt','Crop-Top','Dress Pants','Khaki Shorts',
  'Basketball Shorts','Skirts','Hoodies','Sweats'
];

let items = [];
let activeFilter = 'All';
let lastSelectedFileDataURL = null;

const $ = (sel) => document.querySelector(sel);
const nameInput = $('#name');
const catSelect = $('#category');
const photoInput = $('#photo');
const preview = $('#preview');
const addBtn = $('#addBtn');
const filters = $('#filters');
const list = $('#list');
const empty = $('#empty');

const shareBtn   = document.getElementById('shareBtn');
const importModal = document.getElementById('importModal');
const closeModal  = document.getElementById('closeModal');
const modalSummary= document.getElementById('modalSummary');
const modalGrid   = document.getElementById('modalGrid');
const modalReplace= document.getElementById('modalReplace');
const modalMerge  = document.getElementById('modalMerge');

// Init categories
CATEGORIES.forEach(c => {
  const opt = document.createElement('option');
  opt.value = c; opt.textContent = c;
  catSelect.appendChild(opt);
});

// storage
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    items = raw ? JSON.parse(raw) : [];
  } catch { items = []; }
}
function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// file -> data URL
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// add form
photoInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) { lastSelectedFileDataURL = null; preview.textContent = 'Preview'; return; }
  lastSelectedFileDataURL = await fileToDataURL(file);
  preview.textContent = '';
  preview.style.background = 'transparent';
  preview.innerHTML = `<img src="${lastSelectedFileDataURL}" alt="preview" style="width:100%;height:100%;object-fit:cover;border-radius:6px" />`;
});

addBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const category = catSelect.value.trim();
  if (!name || !category) { alert('Please fill in both fields.'); return; }
  if (!lastSelectedFileDataURL) { alert('Add a photo first.'); return; }

  const newItem = { id: Date.now().toString(), name, category, imageDataURL: lastSelectedFileDataURL };
  items.push(newItem);
  saveItems();

  nameInput.value = '';
  catSelect.value = '';
  lastSelectedFileDataURL = null;
  preview.style.background = '#f5f5f5';
  preview.textContent = 'Preview';
  render();
});

// render
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
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = it.imageDataURL;
    img.alt = it.name;
    card.appendChild(img);

    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = it.name;
    card.appendChild(nameEl);

    const catEl = document.createElement('div');
    catEl.className = 'cat';
    catEl.textContent = it.category;
    card.appendChild(catEl);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-edit';
    editBtn.textContent = 'Edit Photo';
    editBtn.addEventListener('click', async () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const dataURL = await fileToDataURL(f);
        items = items.map(x => x.id === it.id ? { ...x, imageDataURL: dataURL } : x);
        saveItems(); render();
      };
      input.click();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      if (!confirm(`Remove "${it.name}"?`)) return;
      items = items.filter(x => x.id !== it.id);
      saveItems(); render();
    });

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.flexDirection = 'column';
    btnRow.style.gap = '6px';
    btnRow.appendChild(editBtn);
    btnRow.appendChild(delBtn);
    card.appendChild(btnRow);

    list.appendChild(card);
  });
}
function render() { renderFilters(); renderList(); }

// share link helpers
function toB64(str){ return btoa(unescape(encodeURIComponent(str))); }
function fromB64(b64){ return decodeURIComponent(escape(atob(b64))); }
function openModal(){ importModal.style.display = 'flex'; }
function closeModalFn(){ importModal.style.display = 'none'; }
closeModal.addEventListener('click', closeModalFn);
importModal.querySelector('.modal-backdrop').addEventListener('click', closeModalFn);

// share link
shareBtn.addEventListener('click', async () => {
  try {
    const payload = { version: 1, items };
    const json = JSON.stringify(payload);
    const b64 = toB64(json);
    const base = location.origin + location.pathname;
    const url  = `${base}?import=${encodeURIComponent(b64)}`;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!\n\nSend it to your friend.');
    } else {
      prompt('Copy this link:', url);
    }
  } catch (e) {
    console.error(e);
    alert('Failed to create share link.');
  }
});

// consume share link on load
(function handleImportParam(){
  const params = new URLSearchParams(location.search);
  const raw = params.get('import');
  if (!raw) return;

  try {
    const json = fromB64(decodeURIComponent(raw));
    const parsed = JSON.parse(json);
    const arr = Array.isArray(parsed?.items) ? parsed.items :
                Array.isArray(parsed) ? parsed : null;
    if (!arr) throw new Error('Invalid format');

    const valid = arr.filter(it =>
      it && typeof it.id === 'string' &&
      typeof it.name === 'string' &&
      typeof it.category === 'string' &&
      typeof it.imageDataURL === 'string'
    );
    if (!valid.length) throw new Error('No valid items');

    // preview
    modalSummary.textContent = `This link contains ${valid.length} item${valid.length!==1?'s':''}. Preview:`;
    modalGrid.innerHTML = '';
    valid.slice(0, 12).forEach(it => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.innerHTML = `
        <img src="${it.imageDataURL}" alt="">
        <div class="n">${it.name}</div>
        <div class="c">${it.category}</div>
      `;
      modalGrid.appendChild(div);
    });

    // actions
    modalReplace.onclick = () => {
      items = valid;
      saveItems(); render(); closeModalFn();
      history.replaceState({}, '', location.pathname);
      alert('Imported (replaced).');
    };
    modalMerge.onclick = () => {
      const map = new Map(items.map(i => [i.id, i]));
      for (const it of valid) if (!map.has(it.id)) map.set(it.id, it);
      items = Array.from(map.values());
      saveItems(); render(); closeModalFn();
      history.replaceState({}, '', location.pathname);
      alert('Imported (merged).');
    };

    openModal();
  } catch (e) {
    console.error('Import link parse failed:', e);
    alert('Sorry, that import link is invalid or too large.');
    history.replaceState({}, '', location.pathname);
  }
})();

loadItems();
render();
