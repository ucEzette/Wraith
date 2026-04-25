import os
import glob
import re

def fix_nav_links():
    files = glob.glob('/Users/adam/Documents/wraith/Wraith/frontend/src/app/**/page.tsx', recursive=True)
    
    for file in files:
        with open(file, 'r') as f:
            content = f.read()
            
        # Add import if not exists
        if 'import Link from "next/link"' not in content:
            content = 'import Link from "next/link";\n' + content
            
        # Replace <a> tags with <Link> and correct paths
        content = re.sub(r'<a([^>]*?)href="#"([^>]*?)>Dashboard</a>', r'<Link\1href="/"\2>Dashboard</Link>', content)
        content = re.sub(r'<a([^>]*?)href="#"([^>]*?)>Pools</a>', r'<Link\1href="/pool/pepe-eth"\2>Pools</Link>', content)
        content = re.sub(r'<a([^>]*?)href="#"([^>]*?)>Protection</a>', r'<Link\1href="/protect"\2>Protection</Link>', content)
        content = re.sub(r'<a([^>]*?)href="#"([^>]*?)>Sentinel</a>', r'<Link\1href="/sentinel"\2>Sentinel</Link>', content)
        content = re.sub(r'<a([^>]*?)href="#"([^>]*?)>Admin</a>', r'<Link\1href="/admin"\2>Admin</Link>', content)
        
        with open(file, 'w') as f:
            f.write(content)

if __name__ == '__main__':
    fix_nav_links()
