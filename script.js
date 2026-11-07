// NOC Monitoring Dashboard - simulated data only.
// "parent" means which device this one depends on. If the parent goes down,
// everything behind it becomes Unreachable (child alarms point to the root cause).

const devices = [
  { id: 1, name: "Core-Router-01", type: "Router", parent: null, impact: "Whole site connectivity may be lost" },
  { id: 2, name: "Core-Switch-01", type: "Switch", parent: 1, impact: "All switches behind it lose connectivity" },
  { id: 3, name: "Access-Switch-A", type: "Switch", parent: 2, impact: "Floor 1 users offline" },
  { id: 4, name: "Access-Switch-B", type: "Switch", parent: 2, impact: "Floor 2 users offline" },
  { id: 5, name: "WiFi-AP-Floor1", type: "Access Point", parent: 3, impact: "Wireless users on Floor 1 affected" },
  { id: 6, name: "App-Server-01", type: "Server", parent: 2, impact: "Application not reachable for users" },
  { id: 7, name: "DB-Server-01", type: "Server", parent: 2, impact: "Application data not available" },
  { id: 8, name: "Voice-Gateway-01", type: "Voice", parent: 1, impact: "Incoming and outgoing calls affected" },
  { id: 9, name: "Video-Codec-Room1", type: "Video", parent: 4, impact: "Video conferencing unavailable" },
  { id: 10, name: "Optical-Link-DEL-GGN", type: "Optical", parent: 1, impact: "Link to the other site is down" }
];

devices.forEach(d => { d.status = "Up"; d.latency = randomBetween(5, 40); });

const SEVERITY = { Down: "Critical", Degraded: "Major", Unreachable: "Warning", Up: "Clear" };

let alarms = [];
let alarmCounter = 1;
let running = true;

const deviceGrid = document.getElementById("deviceGrid");
const alarmBody = document.getElementById("alarmBody");
const sevFilter = document.getElementById("sevFilter");
const hideAcked = document.getElementById("hideAcked");

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDevice(id) {
  return devices.find(d => d.id === id);
}

function getDescendants(id) {
  let result = [];
  devices.filter(d => d.parent === id).forEach(child => {
    result.push(child);
    result = result.concat(getDescendants(child.id));
  });
  return result;
}

function hasDownAncestor(device) {
  let p = device.parent;
  while (p !== null) {
    const parent = getDevice(p);
    if (parent.status === "Down") return true;
    p = parent.parent;
  }
  return false;
}

function addAlarm(device, newStatus, rootCause) {
  const message = newStatus === "Up"
    ? device.name + " has recovered"
    : device.name + " is " + newStatus;
  alarms.unshift({
    id: alarmCounter++,
    time: new Date().toLocaleTimeString(),
    severity: SEVERITY[newStatus],
    device: device.name,
    message: message,
    impact: newStatus === "Up" ? "-" : device.impact,
    rootCause: rootCause || "-",
    acked: false
  });
  if (alarms.length > 60) alarms.pop();
}

function setStatus(device, newStatus, rootCause) {
  if (device.status === newStatus) return;
  const wasDown = device.status === "Down";
  device.status = newStatus;
  if (newStatus === "Up") device.latency = randomBetween(5, 40);
  if (newStatus === "Degraded") device.latency = randomBetween(120, 300);
  addAlarm(device, newStatus, rootCause);

  // Correlation: one parent failure should not create confusion with many separate faults.
  if (newStatus === "Down") {
    getDescendants(device.id).forEach(child => {
      if (child.status !== "Unreachable") setStatus(child, "Unreachable", device.name);
    });
  }
  if (wasDown && newStatus === "Up") {
    getDescendants(device.id).forEach(child => {
      if (child.status === "Unreachable" && !hasDownAncestor(child)) setStatus(child, "Up");
    });
  }
}

function simulateTick() {
  devices.forEach(d => {
    if (d.status === "Unreachable") return;
    const r = Math.random();
    if (d.status === "Up") {
      if (r < 0.015) setStatus(d, "Down");
      else if (r < 0.045) setStatus(d, "Degraded");
      else d.latency = randomBetween(5, 40);
    } else if (d.status === "Degraded") {
      if (r < 0.10) setStatus(d, "Down");
      else if (r < 0.40) setStatus(d, "Up");
    } else if (d.status === "Down") {
      if (r < 0.25) setStatus(d, "Up");
    }
  });
  render();
}

function renderDevices() {
  deviceGrid.innerHTML = "";
  devices.forEach(d => {
    const div = document.createElement("div");
    div.className = "device " + d.status.toLowerCase();
    const latencyText = (d.status === "Up" || d.status === "Degraded") ? d.latency + " ms" : "--";
    div.innerHTML =
      "<h3>" + d.name + "</h3>" +
      "<p>" + d.type + "</p>" +
      "<p class='status'>" + d.status + "</p>" +
      "<p>Latency: " + latencyText + "</p>";
    deviceGrid.appendChild(div);
  });
}

function renderCounts() {
  document.getElementById("countTotal").textContent = devices.length;
  ["Up", "Degraded", "Down", "Unreachable"].forEach(s => {
    document.getElementById("count" + s).textContent = devices.filter(d => d.status === s).length;
  });
}

function renderAlarms() {
  alarmBody.innerHTML = "";
  const sev = sevFilter.value;
  alarms
    .filter(a => sev === "All" || a.severity === sev)
    .filter(a => !(hideAcked.checked && a.acked))
    .forEach(a => {
      const tr = document.createElement("tr");
      if (a.acked) tr.className = "acked";
      tr.innerHTML =
        "<td>" + a.time + "</td>" +
        "<td><span class='sev " + a.severity + "'>" + a.severity + "</span></td>" +
        "<td>" + a.device + "</td>" +
        "<td>" + a.message + "</td>" +
        "<td>" + a.impact + "</td>" +
        "<td>" + a.rootCause + "</td>" +
        "<td>" + (a.acked ? "Acknowledged" : "<button data-id='" + a.id + "'>Acknowledge</button>") + "</td>";
      alarmBody.appendChild(tr);
    });
}

function render() {
  renderCounts();
  renderDevices();
  renderAlarms();
}

alarmBody.addEventListener("click", e => {
  const id = e.target.getAttribute("data-id");
  if (!id) return;
  const alarm = alarms.find(a => a.id === Number(id));
  if (alarm) alarm.acked = true;
  renderAlarms();
});

document.getElementById("toggleBtn").addEventListener("click", e => {
  running = !running;
  e.target.textContent = running ? "Pause" : "Resume";
});
document.getElementById("failBtn").addEventListener("click", () => {
  setStatus(getDevice(1), "Down");
  render();
});
document.getElementById("restoreBtn").addEventListener("click", () => {
  setStatus(getDevice(1), "Up");
  render();
});
document.getElementById("ackAllBtn").addEventListener("click", () => {
  alarms.forEach(a => { a.acked = true; });
  renderAlarms();
});
sevFilter.addEventListener("change", renderAlarms);
hideAcked.addEventListener("change", renderAlarms);

setInterval(() => { if (running) simulateTick(); }, 3000);
render();
