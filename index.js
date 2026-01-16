#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for cross-platform terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

/**
 * Check if a directory is a git repository
 */
function isGitRepo(dirPath) {
    const gitDir = path.join(dirPath, '.git');
    return fs.existsSync(gitDir);
}

/**
 * Get git status for a repository
 */
function getGitStatus(repoPath) {
    try {
        // Get status in porcelain format for easy parsing
        const status = execSync('git status --porcelain', {
            cwd: repoPath,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        // Get branch information
        let branch = 'unknown';
        try {
            branch = execSync('git branch --show-current', {
                cwd: repoPath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim() || 'detached HEAD';
        } catch {
            branch = 'detached HEAD';
        }

        // Check for unpushed commits
        let unpushed = 0;
        try {
            const ahead = execSync('git rev-list @{u}..HEAD --count 2>nul || git rev-list @{u}..HEAD --count 2>/dev/null', {
                cwd: repoPath,
                encoding: 'utf8',
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            }).trim();
            unpushed = parseInt(ahead, 10) || 0;
        } catch {
            // No upstream configured or other error
            unpushed = 0;
        }

        // Check for stashed changes
        let stashes = 0;
        try {
            const stashList = execSync('git stash list', {
                cwd: repoPath,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
            stashes = stashList.split('\n').filter(line => line.trim()).length;
        } catch {
            stashes = 0;
        }

        // Parse status
        const lines = status.split('\n').filter(line => line.trim());
        const staged = lines.filter(line => /^[MADRC]/.test(line)).length;
        const modified = lines.filter(line => /^.[MD]/.test(line)).length;
        const untracked = lines.filter(line => line.startsWith('??')).length;
        const conflicts = lines.filter(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD')).length;

        return {
            branch,
            staged,
            modified,
            untracked,
            conflicts,
            unpushed,
            stashes,
            hasChanges: lines.length > 0 || unpushed > 0 || stashes > 0
        };
    } catch (error) {
        return {
            error: error.message,
            hasChanges: false
        };
    }
}

/**
 * Find all git repositories in subdirectories
 */
function findGitRepos(basePath, maxDepth = 3, currentDepth = 0) {
    const repos = [];
    
    if (currentDepth > maxDepth) {
        return repos;
    }

    try {
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            
            // Skip common non-repo directories
            if (entry.name.startsWith('.') || 
                entry.name === 'node_modules' || 
                entry.name === 'vendor' ||
                entry.name === '__pycache__') {
                continue;
            }

            const fullPath = path.join(basePath, entry.name);
            
            if (isGitRepo(fullPath)) {
                repos.push(fullPath);
            } else {
                // Recursively search subdirectories
                repos.push(...findGitRepos(fullPath, maxDepth, currentDepth + 1));
            }
        }
    } catch (error) {
        // Permission denied or other error, skip this directory
    }

    return repos;
}

/**
 * Format the status output for a repository
 */
function formatStatus(repoPath, status, basePath) {
    const relativePath = path.relative(basePath, repoPath);
    const parts = [];

    if (status.error) {
        return `${colors.red}✗${colors.reset} ${relativePath}: ${colors.red}Error - ${status.error}${colors.reset}`;
    }

    if (!status.hasChanges) {
        return null; // Skip clean repos
    }

    // Build status indicators
    if (status.staged > 0) {
        parts.push(`${colors.green}+${status.staged} staged${colors.reset}`);
    }
    if (status.modified > 0) {
        parts.push(`${colors.yellow}~${status.modified} modified${colors.reset}`);
    }
    if (status.untracked > 0) {
        parts.push(`${colors.cyan}?${status.untracked} untracked${colors.reset}`);
    }
    if (status.conflicts > 0) {
        parts.push(`${colors.red}!${status.conflicts} conflicts${colors.reset}`);
    }
    if (status.unpushed > 0) {
        parts.push(`${colors.blue}↑${status.unpushed} unpushed${colors.reset}`);
    }
    if (status.stashes > 0) {
        parts.push(`${colors.yellow}⚑${status.stashes} stashed${colors.reset}`);
    }

    const branchInfo = `${colors.bold}[${status.branch}]${colors.reset}`;
    return `${colors.red}●${colors.reset} ${relativePath} ${branchInfo}\n    ${parts.join(' | ')}`;
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let searchPath = process.cwd();
    let maxDepth = 3;
    let showAll = false;
    let showHelp = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-h' || arg === '--help') {
            showHelp = true;
        } else if (arg === '-a' || arg === '--all') {
            showAll = true;
        } else if (arg === '-d' || arg === '--depth') {
            maxDepth = parseInt(args[++i], 10) || 3;
        } else if (!arg.startsWith('-')) {
            searchPath = path.resolve(arg);
        }
    }

    if (showHelp) {
        console.log(`
${colors.bold}git-pending${colors.reset} - Find git repositories with pending changes

${colors.bold}Usage:${colors.reset}
    git-pending [options] [path]

${colors.bold}Options:${colors.reset}
    -h, --help      Show this help message
    -a, --all       Show all repositories, including clean ones
    -d, --depth N   Maximum directory depth to search (default: 3)

${colors.bold}Examples:${colors.reset}
    git-pending                  Search current directory
    git-pending ~/projects       Search specific directory
    git-pending -d 5 ~/code      Search with depth of 5
    git-pending -a               Show all repos including clean ones
`);
        process.exit(0);
    }

    // Validate search path
    if (!fs.existsSync(searchPath)) {
        console.error(`${colors.red}Error: Path does not exist: ${searchPath}${colors.reset}`);
        process.exit(1);
    }

    console.log(`\n${colors.bold}Scanning for git repositories in:${colors.reset} ${searchPath}\n`);

    // Find all git repos
    const repos = findGitRepos(searchPath, maxDepth);

    if (repos.length === 0) {
        console.log(`${colors.yellow}No git repositories found.${colors.reset}\n`);
        process.exit(0);
    }

    // Check status of each repo
    let reposWithChanges = 0;
    const results = [];

    for (const repoPath of repos) {
        const status = getGitStatus(repoPath);
        const formatted = formatStatus(repoPath, status, searchPath);
        
        if (status.hasChanges) {
            reposWithChanges++;
        }

        if (formatted || showAll) {
            if (showAll && !formatted) {
                const relativePath = path.relative(searchPath, repoPath);
                results.push(`${colors.green}✓${colors.reset} ${relativePath} ${colors.bold}[${status.branch}]${colors.reset} - clean`);
            } else if (formatted) {
                results.push(formatted);
            }
        }
    }

    // Output results
    if (results.length > 0) {
        console.log(results.join('\n\n'));
    }

    // Summary
    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`  Total repositories scanned: ${repos.length}`);
    console.log(`  Repositories with changes: ${colors.yellow}${reposWithChanges}${colors.reset}`);
    console.log(`  Clean repositories: ${colors.green}${repos.length - reposWithChanges}${colors.reset}\n`);

    // Exit with code 1 if there are pending changes (useful for CI/scripts)
    process.exit(reposWithChanges > 0 ? 1 : 0);
}

main();
