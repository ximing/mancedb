; NSIS Installer Script for LanceDB Admin
; This script is included by electron-builder during Windows installer creation

!macro customInit
  ; Custom initialization logic
!macroend

!macro customInstall
  ; Create file associations if needed
  ; DetailPrint "Creating file associations..."
!macroend

!macro customUnInstall
  ; Clean up user data on uninstall (optional)
  ; MessageBox MB_YESNO "Remove user data and settings?" IDNO skipRemoval
  ; RMDir /r "$APPDATA\LanceDB Admin"
  ; skipRemoval:
!macroend
