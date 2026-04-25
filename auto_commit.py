import os
import subprocess
import time
import random

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

def get_modified_files():
    output = run_cmd("git status -uall -s")
    files = []
    for line in output.split('\n'):
        if line.strip():
            # git status -s format is usually " M file" or "?? file"
            parts = line.strip().split(maxsplit=1)
            if len(parts) == 2:
                files.append(parts[1])
    return files

def generate_commit_msg(files):
    if not files:
        return "Update files"
    
    first_file = files[0]
    if "frontend" in first_file:
        return f"feat(frontend): update {os.path.basename(first_file)}"
    elif "script" in first_file:
        return f"chore(scripts): update {os.path.basename(first_file)}"
    elif "test" in first_file:
        return f"test: add/update {os.path.basename(first_file)}"
    elif "contracts" in first_file:
        return f"feat(contracts): update {os.path.basename(first_file)}"
    elif first_file.endswith(".py"):
        return f"chore(tools): add {os.path.basename(first_file)} utilities"
    else:
        return f"chore: update {os.path.basename(first_file)}"

def main():
    files = get_modified_files()
    if not files:
        print("No files to commit.")
        return
        
    print(f"Found {len(files)} files to commit.")
    
    # Chunk files into groups of 2
    chunks = [files[i:i + 2] for i in range(0, len(files), 2)]
    
    for i, chunk in enumerate(chunks):
        for f in chunk:
            run_cmd(f'git add "{f}"')
        
        msg = generate_commit_msg(chunk)
        print(f"[{i+1}/{len(chunks)}] Committing: {msg} with files: {chunk}")
        run_cmd(f'git commit -m "{msg}"')
        run_cmd('git push')
        
        if i < len(chunks) - 1:
            wait_time = random.randint(180, 240) # 3 to 4 minutes
            print(f"Waiting {wait_time} seconds before next commit...")
            time.sleep(wait_time)
            
    print("All commits finished!")

if __name__ == '__main__':
    main()
