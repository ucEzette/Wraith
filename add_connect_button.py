import os
import glob
import re

def fix_connect_buttons():
    files = glob.glob('/Users/adam/Documents/wraith/Wraith/frontend/src/app/**/page.tsx', recursive=True)
    
    # Just match any button containing Connect Wallet
    button_regex = re.compile(r'<button[^>]*>\s*Connect Wallet\s*</button>', re.DOTALL | re.IGNORECASE)
    
    for file in files:
        with open(file, 'r') as f:
            content = f.read()
            
        if 'ConnectButton' not in content:
            content = 'import { ConnectButton } from "@rainbow-me/rainbowkit";\n' + content
            
        new_content = button_regex.sub('<ConnectButton />', content)
        
        # Also remove the "Mainnet" span right before the button as RainbowKit handles network
        mainnet_span = re.compile(r'<span[^>]*>Mainnet</span>', re.IGNORECASE)
        new_content = mainnet_span.sub('', new_content)
        
        if new_content != content:
            with open(file, 'w') as f:
                f.write(new_content)
            print(f"Updated ConnectButton in {file}")

if __name__ == '__main__':
    fix_connect_buttons()
