#!/usr/bin/env python3
"""
Script to remove secrets from Git history using git-filter-repo
"""

import subprocess
import sys
import os

def run_command(cmd):
    """Run a command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    print("🔍 Removing secrets from Git history...")
    
    # Create a backup branch first
    print("📦 Creating backup branch...")
    success, stdout, stderr = run_command("git branch backup-before-secret-removal")
    if not success and "already exists" not in stderr:
        print(f"❌ Failed to create backup branch: {stderr}")
        return False
    
    # Create a replacement script for git-filter-repo
    replacement_script = """
import re

# Patterns to match and replace secrets
patterns = [
    # Stripe API keys
    (r'sk_live_[a-zA-Z0-9]{24}', 'STRIPE_SECRET_KEY'),
    (r'sk_test_[a-zA-Z0-9]{24}', 'STRIPE_TEST_KEY'),
    (r'sk_[a-zA-Z0-9]{24}', 'STRIPE_API_KEY'),
    
    # OpenAI API keys
    (r'sk-[a-zA-Z0-9]{48}', 'OPENAI_API_KEY'),
    
    # Hugging Face tokens
    (r'hf_[a-zA-Z0-9]{39}', 'HUGGINGFACE_TOKEN'),
    
    # Generic API keys (be more careful with this one)
    (r'[a-zA-Z0-9]{32,}', 'API_KEY'),  # This is very broad, use carefully
]

def replace_secrets(content):
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    return content

# Apply the replacement
if filename.endswith(('.ts', '.js', '.tsx', '.jsx', '.json', '.env', '.env.example')):
    content = replace_secrets(content)
"""
    
    # Write the replacement script
    with open('secret_replacement.py', 'w') as f:
        f.write(replacement_script)
    
    print("🔧 Running git-filter-repo to remove secrets...")
    
    # Use git-filter-repo to rewrite history
    cmd = """git filter-repo --replace-text secret_replacement.py --force"""
    success, stdout, stderr = run_command(cmd)
    
    if not success:
        print(f"❌ git-filter-repo failed: {stderr}")
        print("🔄 Restoring from backup...")
        run_command("git reset --hard backup-before-secret-removal")
        return False
    
    print("✅ Successfully removed secrets from Git history!")
    
    # Clean up
    if os.path.exists('secret_replacement.py'):
        os.remove('secret_replacement.py')
    
    print("🧹 Cleaned up temporary files")
    print("📝 Next steps:")
    print("   1. Force push to update remote: git push --force-with-lease origin main")
    print("   2. Update any other remotes that need the cleaned history")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 