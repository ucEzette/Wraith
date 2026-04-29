import subprocess
import time
import os
import sys

def run_command(command):
    print(f"Executing: {command}")
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = process.communicate()
    return stdout.strip(), stderr.strip(), process.returncode

def get_changed_files():
    stdout, _, _ = run_command("git status --porcelain")
    if not stdout:
        return []
    
    files = []
    for line in stdout.split('\n'):
        if not line or len(line) < 4: continue
        
        # Porcelain format is XY path
        # The path starts at index 3
        path = line[3:].strip()
        
        # Handle quoted paths
        if path.startswith('"') and path.endswith('"'):
            path = path[1:-1]
        
        # Skip pycache and other noise
        if "__pycache__" in path or path.endswith(".pyc") or not path:
            continue
            
        # Verify file exists (it might be a deletion)
        if os.path.exists(path) or line[0] == 'D' or line[1] == 'D':
            files.append(path)
        else:
            # Try to find where the path actually starts if index 3 failed
            # This handles cases where there might be more/fewer spaces
            parts = line.split(None, 1)
            if len(parts) > 1:
                path = parts[1].strip()
                if os.path.exists(path):
                    files.append(path)

    return files

def get_commit_message(files):
    if not files:
        return "chore: general updates"
    
    # Clean file names for message
    names = [os.path.basename(f) for f in files]
    
    if any("sentinel" in f or "toxicity" in f for f in files):
        return f"feat(agents): update sentinel monitoring and toxicity logic"
    if all(f.startswith("contracts/") for f in files):
        return f"feat(contracts): update core protocol contracts: {', '.join(names)}"
    if all(f.startswith("frontend/") for f in files):
        return f"feat(frontend): UI enhancements for {', '.join(names)}"
    if all(f.startswith("scripts/") or f.startswith("script/") for f in files):
        return f"chore(scripts): update automation utilities: {', '.join(names)}"
    
    return f"chore: update {', '.join(names)}"

def main():
    print("Starting Dynamic Drip Push...")
    
    while True:
        all_files = get_changed_files()
        if not all_files:
            print("No more changed files. Exiting.")
            break
            
        # Take max 2 files
        batch = all_files[:2]
        message = get_commit_message(batch)
        
        print(f"\n--- Processing Batch: {batch} ---")
        
        # Stage
        for f in batch:
            stdout, stderr, code = run_command(f"git add \"{f}\"")
            if code != 0:
                print(f"Warning: Failed to add {f}: {stderr}")
            
        # Check if anything is staged
        stdout, _, _ = run_command("git diff --cached --name-only")
        if not stdout:
            print("Nothing staged for this batch. Skipping.")
            # Remove from list to avoid infinite loop
            # (Though get_changed_files should handle this by seeing they aren't 'add'able)
            # For now, let's just break to be safe or skip
            time.sleep(10)
            continue

        # Commit
        stdout, stderr, code = run_command(f"git commit -m \"{message}\"")
        if code != 0:
            print(f"Commit failed: {stderr}")
            break
        
        # Push
        stdout, stderr, code = run_command("git push origin $(git rev-parse --abbrev-ref HEAD)")
        if code != 0:
            print(f"Push failed: {stderr}")
            # If push fails, we might want to undo the commit or just wait
            break
            
        print(f"Successfully pushed batch. Waiting 3 minutes...")
        time.sleep(180)

if __name__ == "__main__":
    main()
