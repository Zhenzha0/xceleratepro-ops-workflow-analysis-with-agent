# Git Workflow Guide for ProcessGPT

## Understanding the Current Issue

The Git lock file `.git/index.lock` is preventing operations. This happens when:
- A Git operation was interrupted
- Multiple Git processes tried to run simultaneously
- Replit's Git integration had a conflict

## Proper Git Workflow Resolution

### Step 1: Safe Lock File Removal
In a normal environment, you would run:
```bash
rm .git/index.lock
```

However, Replit has restrictions. The proper approach is:

### Step 2: Use Replit's Git Interface Properly
1. **Close all Git panels** completely
2. **Wait 30 seconds** for any background processes to finish
3. **Reopen the Git panel** from the sidebar
4. **Try the push operation again**

### Step 3: Alternative Git Commands (If Shell Access)
If you have proper shell access:
```bash
# Check Git status
git status

# Add all changes
git add .

# Commit with message
git commit -m "Complete ProcessGPT local deployment package"

# Push to GitHub
git push origin main
```

### Step 4: Verify Repository State
```bash
# Check remote connection
git remote -v

# Check branch status
git branch -v

# Check uncommitted changes
git diff --stat
```

## Best Practices for Future Version Control

### Commit Message Conventions
```bash
# Feature additions
git commit -m "feat: add Gemma-2B-IT local AI integration"

# Bug fixes
git commit -m "fix: resolve AI service factory method calls"

# Documentation
git commit -m "docs: add comprehensive deployment guides"

# Configuration
git commit -m "config: update environment setup for local deployment"
```

### Branch Management
```bash
# Create feature branch
git checkout -b feature/local-ai-integration

# Switch back to main
git checkout main

# Merge feature branch
git merge feature/local-ai-integration
```

### Regular Workflow
```bash
# Daily workflow
git pull origin main          # Get latest changes
git checkout -b feature/new-feature
# Make your changes
git add .
git commit -m "feat: description"
git push origin feature/new-feature
# Create pull request on GitHub
```

## Resolving Common Git Issues

### Issue: Merge Conflicts
```bash
git status                    # See conflicted files
# Edit files to resolve conflicts
git add .
git commit -m "resolve: merge conflicts"
```

### Issue: Detached HEAD
```bash
git checkout main
git branch -D temp-branch     # If needed
```

### Issue: Uncommitted Changes Block Pull
```bash
git stash                     # Save changes temporarily
git pull origin main         # Update from remote
git stash pop                 # Restore your changes
```

## GitHub Integration Best Practices

### Setting Up Proper Remote
```bash
git remote add origin https://github.com/USERNAME/processgpt-local.git
git branch -M main
git push -u origin main
```

### Keeping Repository Clean
```bash
# See what's being tracked
git ls-files

# Check .gitignore effectiveness
git status --ignored

# Clean untracked files (be careful!)
git clean -n                  # Preview what will be deleted
git clean -fd                 # Actually delete
```

## ProcessGPT Specific Git Workflow

### Initial Setup
1. Repository created with complete ProcessGPT codebase
2. All documentation and guides included
3. Environment configuration templates
4. Setup scripts and utilities

### Development Workflow
1. Clone repository locally
2. Create feature branches for improvements
3. Test changes thoroughly
4. Commit with descriptive messages
5. Push to GitHub
6. Use pull requests for code review

### File Management
- `.gitignore` excludes AI models (too large for Git)
- Environment files (`.env`) excluded for security
- Generated files (`dist/`, `node_modules/`) excluded
- Documentation and source code tracked

This workflow ensures proper version control while maintaining the integrity of your ProcessGPT manufacturing analytics platform.