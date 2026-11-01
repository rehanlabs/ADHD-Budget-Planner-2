@echo off
echo ============================================================
echo   Pushing ADHD Budget Planner (Edition 2) to GitHub...
echo ============================================================
git push -u origin main
if %ERRORLEVEL% EQU 0 (
  echo.
  echo [SUCCESS] Pushed to https://github.com/rehanlabs/ADHD-Budget-Planner-2
  echo Now visit GitHub Repo - Settings - Pages, and set Source to "Deploy from a branch (main / root)".
) else (
  echo.
  echo [NOTE] If repository was not found, create an empty repository named:
  echo        "ADHD-Budget-Planner-2" at https://github.com/new
  echo        Then run this script again!
)
pause
