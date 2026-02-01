---
trigger: always_on
---

Terminal Environment Rule: "I am working on a Windows machine. The integrated
terminal is PowerShell.

NEVER use Linux-specific commands like sed, grep, or ls -F.

ALWAYS use PowerShell-equivalent commands (e.g., Get-Content, Select-String,
dir).

If you need to edit files via terminal, use PowerShell scripting or direct file
manipulation through the IDE's file system API."
