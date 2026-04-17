@echo off
set HOME=%USERPROFILE%
ssh-keygen -t ed25519 -C "chen-shao-2026" -f "%HOME%\.ssh\id_ed25519" -N ""
echo DONE
