# NOC Monitoring Dashboard (Simulated)

A small browser project that imitates what a monitoring team sees: a list of network devices with live status and an alarm feed.
All data is simulated with JavaScript. No real device is monitored.

## Features
- 10 devices (router, switches, access point, servers, voice, video, optical) with Up / Degraded / Down / Unreachable status and latency
- Alarms with severity (Critical, Major, Warning, Clear) and an impact line for quick triage
- Alarm correlation: when a parent device is Down, devices behind it become Unreachable and their alarms show the parent as root cause
- Acknowledge one alarm or all alarms, filter by severity, hide acknowledged alarms
- Pause/resume the simulation, and a button to simulate a core router failure

## Tech
HTML, CSS, JavaScript (no libraries)

## Run
Open `index.html` in a browser. To host free, enable GitHub Pages in the repository settings.
