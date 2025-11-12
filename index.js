import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const nHours = 24;
const wbApiURL = (h) =>
  `https://corsproxy.io/?https://a.windbornesystems.com/treasure/${h
    .toString()
    .padStart(2, "0")}.json`;

// Latitude, Longitutde, Altitude
const coords = fetch(wbApiURL(0))
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    return response.json();
  })
  .then((data) => {
    console.log("Fetched data:", data);
  })
  .catch((err) => {
    console.error("Fetch error:", err);
  });

// 1. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.5, 3);

// 3. Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 4. Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040)); // soft ambient light

// 5. Earth texture
const loader = new THREE.TextureLoader();
const earthTexture = loader.load("earth.jpg");

// 6. Earth geometry & material
const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture });
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earthMesh);

// 7. Function to convert lat/long to 3D position on sphere
function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// Example: Add a red marker at New York (40.7128° N, 74.0060° W)
const markerGeometry = new THREE.SphereGeometry(0.02, 8, 8);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const marker = new THREE.Mesh(markerGeometry, markerMaterial);
marker.position.copy(latLongToVector3(40.7128, -74.006, 1.01));
scene.add(marker);

// 8. Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 9. Animation loop
function animate() {
  requestAnimationFrame(animate);
  //   earthMesh.rotation.y += 0.001; // slow rotation
  controls.update();
  renderer.render(scene, camera);
}
animate();
