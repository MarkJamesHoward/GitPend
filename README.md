# git-pend

A CLI tool to quickly scan subdirectories and find git repositories with pending changes, unpushed commits, or stashed work.

Perfect for developers managing multiple projects who want to ensure nothing is forgotten before ending their workday or switching tasks.

## Installation

### Global Installation (Recommended)

```bash
npm install -g git-pend
```

After installation, you can use the `git-pend` command from anywhere:

```bash
git-pend
```

### Local Installation

```bash
npm install git-pend
```

Then run via npx:

```bash
npx git-pend
```

## Usage

### Basic Usage

Scan the current directory and all subdirectories for git repositories with pending changes:

```bash
git-pend
```

### Scan a Specific Directory

```bash
git-pend ~/projects
git-pend /path/to/your/repos
```

### Command Line Options

```bash
git-pend [options] [path]
```

#### Options:

- `-h, --help` - Show help message
- `-a, --all` - Show all repositories, including clean ones
- `-d, --depth N` - Maximum directory depth to search (default: 3)

### Examples

```bash
# Scan current directory
git-pend

# Scan specific directory
git-pend ~/projects

# Search with greater depth
git-pend -d 5 ~/code

# Show all repositories including clean ones
git-pend -a

# Combine options
git-pend -a -d 4 ~/workspace
```

## Features

### Status Detection

git-pend detects and displays:

- **Staged changes** - Files ready to commit
- **Modified files** - Tracked files with changes
- **Untracked files** - New files not yet added to git
- **Merge conflicts** - Files with unresolved conflicts
- **Unpushed commits** - Commits not yet pushed to remote
- **Stashed changes** - Changes saved in git stash

### Color-Coded Output

- 🔴 Red dot (●) - Repository with pending changes
- 🟢 Green checkmark (✓) - Clean repository (with `--all` flag)
- 🟢 Green - Staged changes
- 🟡 Yellow - Modified files and stashes
- 🔵 Blue - Unpushed commits
- 🔴 Red - Conflicts and errors

### Sample Output

```
Scanning for git repositories in: /home/user/projects

● my-website [main]
    +2 staged | ~3 modified | ↑1 unpushed

● api-server [develop]
    ~5 modified | ?2 untracked | ⚑1 stashed

Summary:
  Total repositories scanned: 15
  Repositories with changes: 2
  Clean repositories: 13
```

## Use Cases

- **End of Day Check** - Ensure you haven't forgotten to commit or push changes
- **Project Overview** - Get a quick status of all your projects
- **Pre-Shutdown Routine** - Check for pending work before closing your laptop
- **CI/CD Validation** - Use in scripts to verify clean working directories
- **Team Lead Reviews** - Scan team directories for abandoned work

## Exit Codes

- `0` - All repositories are clean (no pending changes)
- `1` - One or more repositories have pending changes

This makes git-pend useful in scripts and automation:

```bash
if git-pend ~/projects; then
    echo "All clean!"
else
    echo "You have pending changes!"
fi
```

## Requirements

- Node.js >= 14.0.0
- Git installed and available in PATH

## Supported Platforms

- Linux
- macOS
- Windows

## Performance

git-pend is designed to be fast:

- Skips common non-repository directories (node_modules, vendor, etc.)
- Configurable depth limit to avoid deep directory scans
- Only shows repositories with changes by default

## License

ISC

## Contributing

Issues and pull requests are welcome! If you find a bug or have a feature request, please open an issue on the project repository.

## Tips

1. Add `git-pend` to your shell profile to run automatically:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   alias checkgit='git-pend ~/projects'
   ```

2. Use it before system shutdown:
   ```bash
   git-pend && shutdown -h now
   ```

3. Create a cron job for daily reminders:
   ```bash
   0 17 * * * git-pend ~/projects && notify-send "Git Status Check Complete"
   ```
