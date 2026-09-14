@echo off
cd /d "%~dp0"
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    set "%%A=%%B"
)
java -jar build/libs/taskflow-backend.jar
