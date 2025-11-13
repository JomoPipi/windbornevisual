import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const box = document.createElement("div");
const textElement = document.createElement("div");
const closeButton = document.createElement("button");
closeButton.innerText = "close";
closeButton.onclick = () => document.body.removeChild(box);
textElement.innerText = "test";
box.classList.add("txtbox");
box.append(textElement, closeButton);

const nHours = 24;
const wbApiURL = (h) =>
  `https://corsproxy.io/?https://a.windbornesystems.com/treasure/${h
    .toString()
    .padStart(2, "0")}.json`;

const rGeocodeApi = (lat, lng) =>
  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;

// Latitude, Longitutde, Altitude
fetch(wbApiURL(2))
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    return response.json();
  })
  .then((data) => {
    addBalloons(data);
  })
  .catch((err) => {
    console.error("Fetch error:", err);
  });

// 1. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 1.5 Raycaster
const raycaster = new THREE.Raycaster();

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

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-5, -5, -5);
scene.add(light2);

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
// const markerGeometry = new THREE.SphereGeometry(0.02, 8, 8);
// const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
// const marker = new THREE.Mesh(markerGeometry, markerMaterial);
// marker.position.copy(latLongToVector3(40.7128, -74.006, 1.01));
// scene.add(marker);

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

function addBalloons(data) {
  renderer.domElement.addEventListener("click", onClick, false);

  const balloons = [];
  for (const [lat, long, alt] of data) {
    const markerGeometry = new THREE.SphereGeometry(0.045, 8, 8);
    const color = new THREE.Color();
    const y = Math.min(1, alt * 0.05);
    color.setRGB(1 - y, 0, y);
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: color,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    //   marker.position.copy(latLongToVector3(lat, long, 1.01 + alt));
    marker.position.copy(latLongToVector3(lat, long, 1 + 0.003 * alt));
    marker.userData = { lat, long, alt };
    scene.add(marker);
    balloons.push(marker);
  }

  function onClick(event) {
    const mouse = {};
    // convert mouse click to normalized device coords (-1 to +1)
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    // update raycaster
    raycaster.setFromCamera(mouse, camera);

    // check intersection with balloons
    const intersects = raycaster.intersectObjects(balloons);
    if (intersects.length > 0) {
      const clicked = intersects[0].object;
      const info = clicked.userData;
      //   console.log("Balloon clicked:", info);

      // spawn info box
      fetch(rGeocodeApi(info.lat, info.long))
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
          return response.json();
        })
        .then((data) => {
          //   console.log({ data });
          const city = data.city;
          const countryCode = data.countryCode;
          const continent = data.continent;
          const message = [city, countryCode, continent]
            .filter((x) => x)
            .join(", ");
          showBox(event, message || data.locality || "No data available");
        })
        .catch((err) => {
          showBox(event, `error fetching data: ${err}`);
        });
      // Here you can fetch reverse‑geocode / timezone / day‑night info for info.lat/info.lon
      // Show UI panel or popup with info
    }
  }

  function showBox(event, message) {
    document.body.appendChild(box);
    textElement.innerText = message;
    box.style.top = event.offsetY + 20 + "px";
    box.style.left = event.offsetX - box.offsetWidth * 0.5 + "px";
  }
}
