# Chrome Web Store Metadata — Ghostboard LeetCode Copilot

## Store Listing
- **Extension Name**: Ghostboard LeetCode Copilot
- **Summary**: Instant 1-click LeetCode problem extractor to Ghostboard Copilot HUD. Zero OCR delays, 100% technical accuracy.
- **Category**: Developer Tools / Productivity
- **Language**: English

## Detailed Description
Ghostboard LeetCode Copilot bridges your technical interview workspace with your live coding sessions.

### Features:
- **Instant Hotkey Capture**: Press Alt+G on any LeetCode problem to parse title, description, constraints, and test cases.
- **Direct HUD Sync**: Bypasses slow screen capture and OCR, streaming staff-engineer algorithmic explanations directly to your Ghostboard Teleprompter.
- **Multilingual Support**: Supports code and reasoning in Ukrainian, English, Polish, German, French, and Spanish.
- **Manifest V3 Compliant**: Lightweight, RAM-efficient background service worker with zero telemetry tracking.

## Permissions Justification
- **storage**: Used strictly to store user preferences (local Ghostboard server URL and target explanation language).
- **host_permissions (leetcode.com, leetcode.cn)**: Required to read the active DOM of LeetCode problem descriptions when triggered by the user.
- **host_permissions (localhost:3000, localhost:3001)**: Required to transmit the problem statement to the user's local Ghostboard Copilot instance.

## Single Purpose
The single purpose of Ghostboard LeetCode Copilot is to extract the current LeetCode problem description and forward it to the candidate's personal Ghostboard interview workspace.
