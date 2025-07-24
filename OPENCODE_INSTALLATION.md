# OpenCode CLI Installation Guide

## Overview
OpenCode is an AI coding agent built for the terminal, providing an interactive chat interface with AI capabilities, code analysis, and LSP integration.

## Installation Steps

### 1. Install OpenCode
```bash
curl -fsSL https://raw.githubusercontent.com/opencode-ai/opencode/refs/heads/main/install | bash
```

### 2. Add to PATH
Add the following to your `~/.bashrc` or `~/.zshrc`:
```bash
export PATH="$HOME/.opencode/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.bashrc
```

### 3. Install Dependencies (Optional but Recommended)
```bash
sudo apt-get update && sudo apt-get install -y ripgrep fzf
```

## Verification
- Version: `opencode --version` (Currently v0.0.55)
- Help: `opencode --help`
- Non-interactive test: `opencode -p "Hello" -q`

## Configuration
1. Set up an LLM provider:
   ```bash
   opencode auth login
   ```
   Select from providers like Anthropic, OpenAI, Google, etc.

2. Navigate to your project and initialize:
   ```bash
   cd /path/to/your/project
   opencode
   ```

## Alternative Installation Methods
- **Homebrew**: `brew install opencode-ai/tap/opencode`
- **AUR (Arch)**: `yay -S opencode-ai-bin`
- **Go**: `go install github.com/opencode-ai/opencode@latest`

## Resources
- GitHub: https://github.com/opencode-ai/opencode
- Documentation: https://opencode.ai/docs/
- CLI Reference: https://opencode.ai/docs/cli/