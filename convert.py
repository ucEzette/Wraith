import os
import re

html_dirs = {
    'dashboard_command_center': 'app/page.tsx',
    'pool_detail_pepe_eth': 'app/pool/[poolId]/page.tsx',
    'my_protection': 'app/protect/page.tsx',
    'sentinel_monitor': 'app/sentinel/page.tsx',
    'admin_panel_guardian_controls': 'app/admin/page.tsx',
}

base_dir = '/Users/adam/Documents/wraith/Wraith/stitch_wraith_protocol_dashboard'
out_dir = '/Users/adam/Documents/wraith/Wraith/frontend'

def html_to_jsx(html):
    # Basic conversion
    jsx = html.replace('class=', 'className=')
    jsx = re.sub(r'<!--(.*?)-->', r'{/*\1*/}', jsx)
    jsx = jsx.replace('for=', 'htmlFor=')
    jsx = jsx.replace('stroke-dasharray', 'strokeDasharray')
    jsx = jsx.replace('stroke-dashoffset', 'strokeDashoffset')
    jsx = jsx.replace('stroke-linecap', 'strokeLinecap')
    jsx = jsx.replace('stroke-width', 'strokeWidth')
    jsx = jsx.replace('viewBox', 'viewBox')
    jsx = jsx.replace('viewbox', 'viewBox')
    jsx = jsx.replace('preserveaspectratio', 'preserveAspectRatio')
    jsx = jsx.replace('vector-effect', 'vectorEffect')
    jsx = jsx.replace('stop-color', 'stopColor')
    jsx = jsx.replace('clip-rule', 'clipRule')
    jsx = jsx.replace('fill-rule', 'fillRule')
    
    # Self-closing tags that might be unclosed in HTML
    jsx = re.sub(r'<img([^>]*[^/])>', r'<img\1 />', jsx)
    jsx = re.sub(r'<input([^>]*[^/])>', r'<input\1 />', jsx)
    jsx = re.sub(r'<br([^>]*[^/])>', r'<br\1 />', jsx)
    jsx = re.sub(r'<hr([^>]*[^/])>', r'<hr\1 />', jsx)

    # Style attributes strings to objects
    # Very basic handler, assumes style="key: value; key: value"
    def repl_style(m):
        style_str = m.group(1)
        rules = [r.strip() for r in style_str.split(';') if r.strip()]
        style_obj = {}
        for rule in rules:
            if ':' in rule:
                k, v = rule.split(':', 1)
                k = k.strip()
                v = v.strip()
                # camelCase key
                parts = k.split('-')
                k_camel = parts[0] + ''.join(p.title() for p in parts[1:])
                style_obj[k_camel] = v
        
        # Format as React style prop
        obj_str = ", ".join(f"'{k}': '{v}'" for k, v in style_obj.items())
        return f"style={{{{{obj_str}}}}}"
    
    jsx = re.sub(r'style="([^"]*)"', repl_style, jsx)
    
    return jsx

for dir_name, target_file in html_dirs.items():
    html_path = os.path.join(base_dir, dir_name, 'code.html')
    if os.path.exists(html_path):
        with open(html_path, 'r') as f:
            content = f.read()
            
        # Extract body content
        body_match = re.search(r'<body[^>]*>(.*?)</body>', content, re.DOTALL | re.IGNORECASE)
        if body_match:
            body_content = body_match.group(1).strip()
            
            # Convert to JSX
            jsx_content = html_to_jsx(body_content)
            
            # Wrap in React component
            component_name = "Page"
            if 'admin' in dir_name:
                component_name = "AdminPage"
            elif 'sentinel' in dir_name:
                component_name = "SentinelPage"
            elif 'pool' in dir_name:
                component_name = "PoolDetailPage"
            elif 'protect' in dir_name:
                component_name = "ProtectPage"
            else:
                component_name = "DashboardPage"
            
            full_code = f"""export default function {component_name}() {{
  return (
    <>
{jsx_content}
    </>
  );
}}
"""
            
            # Write to output directory
            out_path = os.path.join(out_dir, target_file)
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, 'w') as f:
                f.write(full_code)
            print(f"Created {target_file}")
            
# Also let's extract the styles and tailwind config from dashboard
with open(os.path.join(base_dir, 'dashboard_command_center', 'code.html'), 'r') as f:
    content = f.read()
    style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    if style_match:
        with open(os.path.join(out_dir, 'app', 'stitch_globals.css'), 'w') as sf:
            sf.write(style_match.group(1))
            
    tw_match = re.search(r'tailwind\.config = ({.*});', content, re.DOTALL)
    if tw_match:
        with open(os.path.join(out_dir, 'stitch_tailwind.json'), 'w') as tf:
            tf.write(tw_match.group(1))
