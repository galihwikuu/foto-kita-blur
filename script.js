const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const bgMusic = document.getElementById('bgMusic');
const vinyl = document.getElementById('vinyl');
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

  ctx.filter = peaceDetected ? 'blur(3px)' : 'none';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  statusEl.textContent = peaceDetected ? 'PEACE TERDETEKSI — BLUR' : 'Menunggu tangan...';
  statusEl.classList.toggle('active', peaceDetected);
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