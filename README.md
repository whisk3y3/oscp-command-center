# OSCP Command Center

An interactive, browser-based exam companion for the Offensive Security Certified Professional (OSCP) certification. Built from real exam experience across multiple attempts, distilling hundreds of hours of practice into a single actionable tool.

**Built by [@whisk3y3](https://github.com/whisk3y3)**

---

## Why This Exists

After multiple OSCP exam attempts, I identified a recurring pattern: **enumeration paralysis** -- spending too long gathering information without transitioning to exploitation. I needed a tool that would keep me systematic, time-aware, and action-oriented during the 23:45 exam window.

This is not a generic checklist. Every item comes from actual OSCP machines (HackTheBox, Proving Grounds) with proven attack patterns baked in.

---

## Features at a Glance

| Feature | Details |
|---------|---------|
| **Checklist Items** | 700+ across 28 services |
| **Themes** | Dark, Hacker (green-on-black), Light |
| **Exam Timer** | 23:45:00 countdown, goes red under 1 hour |
| **Machine Timers** | Per-target stopwatch, warns at 30 min |
| **Reference Panels** | 6 toggleable panels (Shells, Phishing, Cracking, Transfers, Pre-Check, Creds) |
| **AD Workflow** | Full MS01 to MS02 to DC attack chain with lateral movement |
| **Privesc Checklists** | 26 Linux + 55 Windows items, tiered by frequency |
| **Dependencies** | React only, zero external libraries |
| **Total Lines** | ~2,250 in a single file |

---

## Exam and Machine Timers

- **Global exam countdown** -- 23:45:00 timer that persists across refreshes (localStorage), goes red under 1 hour, warns under 2 hours
- **Per-machine stopwatch** -- tracks time spent on each target, warns at 30 minutes to encourage pivoting
- Both timers are start/stop only -- no accidental resets under pressure

## 700+ Checklist Items Across 28 Services

Every port and service you will encounter on the OSCP, with prioritized attack steps and specific commands:

| Category | Services |
|----------|----------|
| **Core Web** | HTTP (36 items), HTTPS (26), HTTP-Alt/8080 (18), HTTPS-Alt/8443 (16) |
| **Remote Access** | SSH (6), RDP (5), VNC (2), WinRM (3) |
| **File Transfer** | FTP (11), SMB (11), NFS/RPCbind (3) |
| **Email** | SMTP (6), POP3 (2), IMAP (2) |
| **Databases** | MSSQL (8), MySQL (5), PostgreSQL (4), Redis (5) |
| **Active Directory** | Kerberos (5), LDAP (4), MSRPC (2), NetBIOS (3) |
| **Enumeration** | DNS (4), SNMP/UDP (7), Finger (3), Ident (2) |
| **Proxy** | Squid Proxy (2) |
| **Custom** | Catch-all for non-standard ports (5) with service assignment dropdown |

## Full AD Attack Chain (40 Points)

Dedicated workflow for the three-machine AD set with sub-tabs for MS01 (External), MS02 (Internal), and DC. Includes AD Enumeration (18 items), Post-Exploitation Loot (44 items), Lateral Movement to MS02 (13 items), Lateral Movement to DC (14 items), and an Emergency Stuck Checklist (20 items).

## Privilege Escalation Checklists

**Linux (26 items)**: sudo -l, LD_PRELOAD, SUID, crontab, config files, bash history, SSH keys, git repos, capabilities, Docker/LXD, wildcard injection, Python library hijack, writable /etc/passwd, NFS no_root_squash, kernel exploits

**Windows (55 items)**: SeImpersonate/GodPotato/PrintSpoofer, PS history, stored creds, Unattend.xml, scheduled tasks, DLL hijacking (6-step walkthrough), 15+ application credential stores, winPEAS, PowerUp

## Core Features

- **Points Tracker**: Live score in header, pass/fail against 70-point threshold
- **Credential Matrix**: Centralized tracking with user, pass/hash, source, tested-against fields
- **Attack Chain Builder**: Per-machine step-by-step path documentation for report writing
- **Click-to-Copy Commands**: Auto-replaces `$IP` with the machine's actual IP
- **Nmap Paste-to-Ports**: Paste nmap output, auto-extracts open TCP ports
- **Service Assignment**: Dropdown to map non-standard ports to known service checklists
- **Discovered Pages Tracker**: Log URLs/endpoints for HTTP-family ports
- **UDP Scan Reminder**: Persistent reminder per machine
- **Star System**: Three states (unchecked, checked, starred) for report export
- **Progress Reports**: One-click report showing worked/didn't work/not tried per port
- **Machine Completion Summaries**: Full formatted summary with one-click copy

## Reference Panels

Six toggleable panels: **Shells and Payloads** (listeners, reverse shells, msfvenom, web shells), **Phishing and NTLM Theft** (Responder, ntlm_theft, SWAKS, WebDAV chain, macros), **Hash Cracking** (ID, AD/Linux/web hashes, file cracking, key cracking, John, wordlists), **File Transfers** (serve, download, exfil for Linux and Windows), **Pre-Engagement Checklist** (84 items: system update, venv, aliases, tool staging, BloodHound, Ligolo, logging, payloads), **Credential Matrix**.

## Save and Backup System

Auto-save to localStorage, manual JSON backup download, import from backup, reset with confirmation.

## Dark / Hacker / Light Themes

Three themes: Dark (default), Hacker (green-on-black), Light. Persists via localStorage.

---

## Quick Start

```bash
git clone https://github.com/whisk3y3/oscp-command-center.git
cd oscp-command-center
npm install
npm run dev
```

Opens at `http://localhost:5173`. Runs entirely local, no internet required during the exam.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Exam Day Workflow

1. **Start the exam clock** -- hit START EXAM when proctoring begins
2. **AD Set first** -- switch to the AD tab, enter MS01 IP, start machine timer
3. **Paste nmap** -- run your scan, paste output, ports auto-populate
4. **Work top to bottom** -- check items as you go, star your attack path
5. **Log every credential** -- use the CREDS matrix, spray immediately
6. **Watch the clock** -- machine timers warn at 30 min, exam clock goes red under 1 hour
7. **Save periodically** -- hit SAVE BACKUP every hour for a JSON safety net
8. **Complete machines** -- generates report-ready summaries

---

## Project Structure

```
oscp-command-center/
  index.html
  package.json
  vite.config.js
  LICENSE
  README.md
  src/
    main.jsx
    App.jsx          # Everything lives here -- single file, zero dependencies
```

~2,250 lines, single React component, no external dependencies beyond React. Simplicity and reliability matter when you are 18 hours into an exam.

---

## Scoring Reference

| Target | local.txt | proof.txt | Total |
|--------|-----------|-----------|-------|
| AD Set (3 machines) | -- | -- | **40 pts** |
| Standalone 1 | 10 pts | 10 pts | 20 pts |
| Standalone 2 | 10 pts | 10 pts | 20 pts |
| Standalone 3 | 10 pts | 10 pts | 20 pts |
| **Maximum** | | | **100 pts** |
| **Pass threshold** | | | **70 pts** |

---

## Contributing

PRs welcome. The checklist data lives in the constants at the top of `src/App.jsx` -- easy to extend.

---

## Disclaimer

This tool is for educational and exam preparation purposes. The techniques referenced are standard penetration testing methodologies covered in the OffSec PEN-200 course. Always obtain proper authorization before testing systems you do not own.

---

## License

[MIT](LICENSE) -- use it, share it, modify it. Good luck on your exam.
