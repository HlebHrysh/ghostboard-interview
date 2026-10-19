!macro NSIS_HOOK_POSTINSTALL
  ; Create Desktop Shortcut for Ghostboard
  CreateShortcut "$DESKTOP\Ghostboard.lnk" "$INSTDIR\Ghostboard.exe" "" "$INSTDIR\Ghostboard.exe" 0

  ; Register copilot:// protocol handler in HKCU\Software\Classes
  WriteRegStr HKCU "Software\Classes\copilot" "" "URL:Ghostboard Copilot Protocol"
  WriteRegStr HKCU "Software\Classes\copilot" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\copilot\DefaultIcon" "" "$INSTDIR\Ghostboard.exe,0"
  WriteRegStr HKCU "Software\Classes\copilot\shell" "" "open"
  WriteRegStr HKCU "Software\Classes\copilot\shell\open" "" ""
  WriteRegStr HKCU "Software\Classes\copilot\shell\open\command" "" '"$INSTDIR\Ghostboard.exe" "%1"'

  ; Also write to SHCTX for per-machine installs
  WriteRegStr SHCTX "Software\Classes\copilot" "" "URL:Ghostboard Copilot Protocol"
  WriteRegStr SHCTX "Software\Classes\copilot" "URL Protocol" ""
  WriteRegStr SHCTX "Software\Classes\copilot\DefaultIcon" "" "$INSTDIR\Ghostboard.exe,0"
  WriteRegStr SHCTX "Software\Classes\copilot\shell" "" "open"
  WriteRegStr SHCTX "Software\Classes\copilot\shell\open" "" ""
  WriteRegStr SHCTX "Software\Classes\copilot\shell\open\command" "" '"$INSTDIR\Ghostboard.exe" "%1"'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Remove Desktop Shortcut
  Delete "$DESKTOP\Ghostboard.lnk"

  ; Clean up copilot:// protocol keys
  DeleteRegKey HKCU "Software\Classes\copilot"
  DeleteRegKey SHCTX "Software\Classes\copilot"
!macroend
