import os
import glob

def fix_jsx():
    files = glob.glob('/Users/adam/Documents/wraith/Wraith/frontend/src/app/**/page.tsx', recursive=True)
    for file in files:
        with open(file, 'r') as f:
            content = f.read()
            
        # Fix the fontVariationSettings issue
        content = content.replace("''FILL' 0'", "\"'FILL' 0\"")
        content = content.replace("''FILL' 1'", "\"'FILL' 1\"")
        
        # Also fix class to className if any was missed
        content = content.replace('class=', 'className=')
        
        with open(file, 'w') as f:
            f.write(content)

if __name__ == '__main__':
    fix_jsx()
