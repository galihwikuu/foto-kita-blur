const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const bgMusic = document.getElementById('bgMusic');
const muteMusicBtn = document.getElementById('muteMusicBtn');
const vinyl = document.getElementById('vinyl');
const countdownEl = document.getElementById('countdown');
const resultSection = document.getElementById('resultSection');
const stripPreview = document.getElementById('stripPreview');
const showResultBtn = document.getElementById('showResultBtn');
const downloadBtn = document.getElementById('downloadBtn');
const retakeBtn = document.getElementById('retakeBtn');
let capturedShots = [];
const songTitle = document.getElementById('songTitle');
const SONG_NAME = "Sal Priadi - Foto kita blur"; // ganti sesuai musik kamu

let camera = null;
let peaceDetected = false;



// --- Logic deteksi peace  ---
function isFingerUp(landmarks, tipIdx, pipIdx) {
  return landmarks[tipIdx].y < landmarks[pipIdx].y;
}

function isThumbUp(landmarks, handedness) {
  // handedness "Right"/"Left" dari sudut pandang kamera (sudah di-mirror)
  if (handedness === 'Right') {
    return landmarks[4].x < landmarks[3].x;
  }
  return landmarks[4].x > landmarks[3].x;
}

function detectPeace(landmarks, handedness) {
  const index = isFingerUp(landmarks, 8, 6);
  const middle = isFingerUp(landmarks, 12, 10);
  const ring = isFingerUp(landmarks, 16, 14);
  const pinky = isFingerUp(landmarks, 20, 18);
  const thumb = isThumbUp(landmarks, handedness);
  // strict: index & middle naik, thumb/ring/pinky turun
  return index && middle && !thumb && !ring && !pinky;
}

// --- Setup MediaPipe Hands ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.6
});

hands.onResults((results) => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.save();
  // mirror biar natural kayak cermin
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  peaceDetected = false;
  if (results.multiHandLandmarks && results.multiHandedness) {
    results.multiHandLandmarks.forEach((landmarks, i) => {
      const label = results.multiHandedness[i].label;
      if (detectPeace(landmarks, label)) peaceDetected = true;
    });
  }

  canvas.style.filter = peaceDetected ? 'blur(18px)' : 'none';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  statusEl.textContent = peaceDetected ? 'PEACE TERDETEKSI — BLUR' : 'Menunggu tangan...';
  statusEl.classList.toggle('active', peaceDetected);
});

// Minta izin kamera lebih awal saat halaman dibuka
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // langsung matikan lagi, cuma buat trigger izin di awal
    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    console.warn('Izin kamera ditolak atau gagal:', err);
  }
});


// --- Start / Stop ---
startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;
  muteMusicBtn.disabled = false;

    songTitle.textContent = SONG_NAME;
    vinyl.classList.add('playing');

  if (bgMusic.src) {
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {
      console.warn('Autoplay diblokir, coba klik lagi jika musik tidak jalan.');
    });
  }

  camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });
  await camera.start();
  runPhotoBooth();
});

stopBtn.addEventListener('click', () => {
  if (camera) camera.stop();
  bgMusic.pause();
  vinyl.classList.remove('playing');
  muteMusicBtn.disabled = true;
  document.getElementById('volumeIcon').className = 'bi bi-volume-up-fill';
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = 'Dihentikan';
  statusEl.classList.remove('active');
});

bgMusic.addEventListener('ended', () => {
  stopBtn.click(); // trigger logic yang sama persis dengan tombol Berhenti
});

muteMusicBtn.addEventListener('click', () => {
  const icon = document.getElementById('volumeIcon');
  if (bgMusic.paused) {
    bgMusic.play();
    vinyl.classList.add('playing');
    icon.className = 'bi bi-volume-up-fill';
  } else {
    bgMusic.pause();
    vinyl.classList.remove('playing');
    icon.className = 'bi bi-volume-mute-fill';
  }
});

showResultBtn.addEventListener('click', () => {
  resultSection.hidden = false;
  showResultBtn.hidden = true;
});

function countdownStep(seconds) {
  return new Promise((resolve) => {
    let s = seconds;
    countdownEl.classList.add('show');
    countdownEl.textContent = s;
    const interval = setInterval(() => {
      s--;
      if (s > 0) {
        countdownEl.textContent = s;
      } else {
        clearInterval(interval);
        countdownEl.classList.remove('show');
        resolve();
      }
    }, 1000);
  });
}

async function runPhotoBooth() {
  capturedShots = [];

  await new Promise(r => setTimeout(r, 1300));
  await triggerFlash();
  capturePhoto();
  await new Promise(r => setTimeout(r, 3200));

  for (let i = 1; i < 3; i++) {
    await countdownStep(3);
    await triggerFlash();
    capturePhoto();
    if (i < 2) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const dataUrl = composeStrip();
  stripPreview.src = dataUrl;
  downloadBtn.href = dataUrl;
  showResultBtn.hidden = false;
}

retakeBtn.addEventListener('click', () => {
  resultSection.hidden = true;
  showResultBtn.hidden = true;
  stopBtn.click();  // pastikan kamera lama berhenti dulu
  startBtn.click();  // baru mulai ulang
});

function capturePhoto() {
  const shot = document.createElement('canvas');
  shot.width = canvas.width;
  shot.height = canvas.height;
  shot.getContext('2d').drawImage(canvas, 0, 0);
  capturedShots.push(shot);
}

const FRAME_PRESETS = {
  brutalist: {
    bg: '#ffffff',
    outline: '#111111',
    outlineWidth: 6
  }
};


let selectedFrame = 'brutalist';

document.querySelectorAll('.frame-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const frame = btn.dataset.frame;

    if (!FRAME_PRESETS[frame]) {
      alert('Frame ini masih Coming Soon 👀');
      return;
    }

    selectedFrame = frame;
    document.querySelectorAll('.frame-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    if (capturedShots.length > 0) {
      const dataUrl = composeStrip();
      stripPreview.src = dataUrl;
      downloadBtn.href = dataUrl;
    }
  });
});

// const frameImages = {};
// Object.keys(FRAME_PRESETS).forEach(key => {
//   const img = new Image();
//   img.src = FRAME_PRESETS[key].image;
//   frameImages[key] = img;
// });

function composeStrip() {
  const preset = FRAME_PRESETS[selectedFrame];
  const padding = 20;
  const gap = 16;
  const w = capturedShots[0].width;
  const h = capturedShots[0].height;
  const bottomExtra = preset.bottomLabel ? preset.bottomHeight : 0;

  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = w + padding * 2;
  stripCanvas.height = h * capturedShots.length + gap * (capturedShots.length - 1) + padding * 2 + bottomExtra;

  const ctx2 = stripCanvas.getContext('2d', { alpha: false });
  ctx2.fillStyle = preset.bg;
  ctx2.fillRect(0, 0, stripCanvas.width, stripCanvas.height);

  capturedShots.forEach((shot, i) => {
    const y = padding + i * (h + gap);
    ctx2.drawImage(shot, padding, y);
    ctx2.strokeStyle = preset.outline;
    ctx2.lineWidth = preset.outlineWidth;
    ctx2.strokeRect(padding, y, w, h);
  });

  return stripCanvas.toDataURL('image/png');
}


function triggerFlash() {
  return new Promise((resolve) => {
    const flashEl = document.getElementById('flash');
    flashEl.classList.remove('active');
    void flashEl.offsetWidth; // reset animasi biar bisa retrigger
    flashEl.classList.add('active');
    setTimeout(resolve, 300);
  });
}