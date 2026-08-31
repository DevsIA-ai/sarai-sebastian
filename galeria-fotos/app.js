// ============================================================
// Galería de fotos · Boda de Sebastián & Saraí
// Lógica de la app: autenticación anónima, subida, galería en
// vivo, borrado (dueño de la foto o administradores).
// ============================================================

import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const $ = (id) => document.getElementById(id);

// ---------- bloqueo por fecha ----------
// La galería se abre automáticamente dos semanas antes de la boda. Antes de esa
// fecha no se toca Firebase en absoluto (nada de initializeApp ni login
// anónimo), así que no importa si firebase-config.js todavía tiene datos
// de ejemplo sin configurar. Para abrirla antes de tiempo (ej. para probar),
// basta con adelantar esta fecha.
const GALLERY_OPEN_DATE = new Date("2026-11-14T00:00:00");

if (Date.now() < GALLERY_OPEN_DATE.getTime()) {
  $("guest-bar").style.display = "none";
  $("upload-section").style.display = "none";
  document.querySelector(".section-divider").style.display = "none";
  $("gallery-section").style.display = "none";
  $("coming-soon").style.display = "block";
} else {
  initGalleryApp();
}

function initGalleryApp() {

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUid = null;
let isAdmin = false;
let guestName = localStorage.getItem("guestName") || "";

// Clave secreta para entrar como administradores. Solo vive en este archivo
// y en el botón "Administrar Galería de Fotos" de generar.html (página privada
// que los invitados no conocen). No hay ningún botón ni campo de clave
// visible dentro de esta app: la única forma de entrar es abriendo el link
// con ?admin=<esta clave> al final.
const ADMIN_SECRET = "29d8a90b10c08742d6158eae5020d2e8829fa0b9";

// ---------- helpers ----------
function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "justo ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

// Reduce/comprime la imagen en el navegador antes de subirla
function resizeImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen")), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Archivo de imagen inválido")); };
    img.src = url;
  });
}

// ---------- auth ----------
onAuthStateChanged(auth, async (user) => {
  if (!user) { signInAnonymously(auth).catch(console.error); return; }
  currentUid = user.uid;

  // Restaura estado de administradora si esta sesión ya lo tenía activo
  try {
    const snap = await getDoc(doc(db, "adminSessions", currentUid));
    isAdmin = snap.exists();
  } catch { isAdmin = false; }
  updateAdminUI();

  if (!guestName) openNameModal();
  else $("guest-name-display").textContent = guestName;

  startGalleryListener();
  maybeActivateAdminFromUrl();
});

// ---------- nombre del invitado ----------
function openNameModal() {
  $("name-input").value = guestName || "";
  $("name-error").textContent = "";
  $("name-modal").classList.add("open");
}
function closeNameModal() { $("name-modal").classList.remove("open"); }

$("name-save-btn").addEventListener("click", () => {
  const val = $("name-input").value.trim();
  if (val.length < 2) { $("name-error").textContent = "Escribe tu nombre completo."; return; }
  guestName = val.slice(0, 40);
  localStorage.setItem("guestName", guestName);
  $("guest-name-display").textContent = guestName;
  closeNameModal();
});
$("name-input").addEventListener("keydown", (e) => { if (e.key === "Enter") $("name-save-btn").click(); });
$("change-name-btn").addEventListener("click", openNameModal);

// ---------- administradores ----------
// No hay ningún botón ni campo visible en esta app para entrar como
// administradores. La única forma de entrar es abrir esta misma página con
// ?admin=<ADMIN_SECRET> al final de la URL — ese link vive únicamente en el
// botón "Administrar Galería de Fotos" de generar.html.
function updateAdminUI() {
  $("admin-active-badge").style.display = isAdmin ? "inline" : "none";
  $("download-all-btn").style.display = isAdmin ? "inline-block" : "none";
  renderGallery(lastPhotos);
}

async function maybeActivateAdminFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("admin");
  history.replaceState({}, "", window.location.pathname);
  if (!key || isAdmin) return;
  if (key !== ADMIN_SECRET) return;
  try {
    await setDoc(doc(db, "adminSessions", currentUid), { ts: serverTimestamp() });
    isAdmin = true;
    updateAdminUI();
  } catch (err) {
    console.error(err);
  }
}

// ---------- subida ----------
const dropzone = $("dropzone");
const fileInput = $("file-input");
dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => handleFiles(fileInput.files));

["dragenter", "dragover"].forEach(evt => dropzone.addEventListener(evt, (e) => {
  e.preventDefault(); dropzone.classList.add("drag");
}));
["dragleave", "drop"].forEach(evt => dropzone.addEventListener(evt, (e) => {
  e.preventDefault(); dropzone.classList.remove("drag");
}));
dropzone.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
  if (!files.length) return;
  if (!guestName) { openNameModal(); return; }
  files.forEach(uploadOne);
  fileInput.value = "";
}

async function uploadOne(file) {
  const row = document.createElement("div");
  row.className = "uq-item";
  const previewUrl = URL.createObjectURL(file);
  row.innerHTML = `
    <img class="uq-thumb" src="${previewUrl}" alt="">
    <span class="uq-name">${file.name}</span>
    <span class="uq-bar"><span class="uq-bar-fill"></span></span>
    <span class="uq-status">0%</span>
  `;
  $("upload-queue").appendChild(row);
  const fill = row.querySelector(".uq-bar-fill");
  const status = row.querySelector(".uq-status");

  try {
    status.textContent = "Procesando…";
    const blob = await resizeImage(file);

    const photoRef = doc(collection(db, "photos"));
    const storagePath = `photos/${photoRef.id}/${photoRef.id}.jpg`;
    const sRef = ref(storage, storagePath);
    const task = uploadBytesResumable(sRef, blob, { contentType: "image/jpeg" });

    task.on("state_changed", (snap) => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      fill.style.width = pct + "%";
      status.textContent = pct + "%";
    });

    await task;
    const url = await getDownloadURL(sRef);

    await setDoc(photoRef, {
      ownerUid: currentUid,
      guestName: guestName,
      url,
      storagePath,
      createdAt: serverTimestamp()
    });

    status.textContent = "Listo ✓";
    setTimeout(() => row.remove(), 1600);
  } catch (err) {
    console.error(err);
    status.textContent = "Error";
    status.classList.add("err");
  }
}

// ---------- galería en vivo ----------
let lastPhotos = [];

function startGalleryListener() {
  const q = query(collection(db, "photos"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    lastPhotos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGallery(lastPhotos);
  }, (err) => {
    console.error(err);
    $("gallery-count").textContent = "No se pudo cargar la galería.";
  });
}

function renderGallery(photos) {
  const grid = $("gallery-grid");
  grid.innerHTML = "";
  $("gallery-empty").style.display = photos.length ? "none" : "block";
  $("gallery-count").textContent = photos.length
    ? `${photos.length} foto${photos.length === 1 ? "" : "s"} compartida${photos.length === 1 ? "" : "s"}`
    : "";

  photos.forEach((p) => {
    const canDelete = isAdmin || p.ownerUid === currentUid;
    const created = p.createdAt?.toDate ? p.createdAt.toDate() : null;

    const card = document.createElement("div");
    card.className = "g-card";
    card.innerHTML = `
      <img src="${p.url}" alt="Foto de ${p.guestName || "invitado"}" loading="lazy">
      <div class="g-caption">
        <span class="g-owner">${escapeHtml(p.guestName || "Invitado")}</span>
        <span class="g-time">${timeAgo(created)}</span>
      </div>
      ${canDelete ? `<button class="g-delete" title="Borrar foto">✕</button>` : ""}
    `;
    card.querySelector("img").addEventListener("click", () => openLightbox(p));
    if (canDelete) {
      card.querySelector(".g-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        deletePhoto(p);
      });
    }
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

async function deletePhoto(p) {
  const ok = confirm(`¿Borrar la foto de ${p.guestName || "este invitado"}?`);
  if (!ok) return;
  try {
    await deleteObject(ref(storage, p.storagePath));
  } catch (err) {
    console.warn("No se pudo borrar el archivo en Storage (puede que ya no exista):", err);
  }
  try {
    await deleteDoc(doc(db, "photos", p.id));
  } catch (err) {
    console.error(err);
    alert("No se pudo borrar la foto. Intenta de nuevo.");
  }
}

// ---------- descargar todas las fotos (.zip) ----------
$("download-all-btn").addEventListener("click", downloadAllPhotos);

async function downloadAllPhotos() {
  if (!lastPhotos.length) { alert("Todavía no hay fotos para descargar."); return; }

  const btn = $("download-all-btn");
  const originalText = btn.textContent;
  btn.disabled = true;

  const zip = new JSZip();
  let done = 0;
  let failed = 0;

  for (const p of lastPhotos) {
    try {
      const res = await fetch(p.url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const blob = await res.blob();
      const diacritics = new RegExp("[\\u0300-\\u036f]", "g");
      const safeName = (p.guestName || "invitado").normalize("NFD").replace(diacritics, "").replace(/[^a-zA-Z0-9]+/g, "_");
      zip.file(`${safeName}_${p.id}.jpg`, blob);
    } catch (err) {
      console.error("No se pudo incluir esta foto en el zip:", p.id, err);
      failed++;
    }
    done++;
    btn.textContent = `Descargando ${done}/${lastPhotos.length}…`;
  }

  if (failed === lastPhotos.length) {
    alert("No se pudo descargar ninguna foto. Es probable que falte configurar CORS en Firebase Storage (ver INSTRUCCIONES-FIREBASE.md).");
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }

  btn.textContent = "Generando .zip…";
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fotos-boda-michel-asael.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (failed > 0) alert(`Se descargaron ${done - failed} de ${lastPhotos.length} fotos. ${failed} no se pudieron incluir.`);

  btn.disabled = false;
  btn.textContent = originalText;
}

// ---------- lightbox ----------
function openLightbox(p) {
  $("lightbox-img").src = p.url;
  const created = p.createdAt?.toDate ? p.createdAt.toDate() : null;
  $("lightbox-caption").textContent = `${p.guestName || "Invitado"} · ${timeAgo(created)}`;
  $("lightbox").classList.add("open");
}
$("lightbox-close").addEventListener("click", () => $("lightbox").classList.remove("open"));
$("lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") $("lightbox").classList.remove("open"); });

} // fin de initGalleryApp()
