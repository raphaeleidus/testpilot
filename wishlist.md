
- Patch setTimeout and setInterval. If a test sets a timeout then ends before it is either
expired or torn down, Testpilot should warn so the user knows later why the process is hanging.

