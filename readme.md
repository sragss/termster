# termster
Lightweight agentic Terminal that prioritizes visibility of Terminal commands, runs directly in your Terminal.

Two simple panes, always visible: Terminal, Chat.

![Termster Demo](imgs/termster_2.gif)

Built with [Echo](https://echo.merit.systems/) to handle end-user credits.

## Install

### From source
```bash
# Clone the repository
git clone https://github.com/sragss/termster.git
cd termster

# Install dependencies and build + install globally
npm install && npm run install-global
```

### Dev: Run without installing
```bash
# Clone and run directly
git clone https://github.com/sragss/termster.git
cd termster
npm install
npm run build
node dist/cli.js
```

## CLI

```
$ termster --help

  Usage
    $ termster

  Options
    --name  Your name
    --devtools  Enable React DevTools

  Examples
    $ termster --name=Jane
    Hello, Jane
    $ termster --devtools
    Launch with React DevTools enabled
```

## Development

### React DevTools

Ink supports React DevTools out-of-the-box. To enable integration with React DevTools in your CLI:

1. Run your app with the `DEV=true` environment variable:

   ```bash
   npm run devtools
   ```

   or

   ```bash
   DEV=true termster
   ```

2. In another terminal, start React DevTools:
   ```bash
   npx react-devtools
   ```

After React DevTools starts up, you should see the component tree of your CLI. You can inspect and change the props of components, and see the results immediately in the CLI, without restarting it.

**Note**: You must manually quit your CLI via Ctrl+C after you're done testing.

## Logging

Termster generates debug and session logs in two locations:

### 1. Session Logs (`~/.termster/logs/`)
- **LLM Chat Sessions**: `session_YYYY-MM-DD_HH-MM-SS_xxx.log`
  - Contains all LLM interactions, tool calls, approvals, and execution results
  - Structured JSON logging with timestamps and severity levels
  - Used for debugging LLM behavior and tool execution

### 2. Terminal Session Logs (`~/.termster/logs/`)
- **Terminal Sessions**: `terminal-session-YYYY-MM-DDTHH-MM-SS.log`
  - Contains actual terminal commands and output (like shell history)
  - Clean format without ANSI codes, timestamped commands
  - Asynchronously buffered to prevent performance impact
  - Used for reviewing terminal session history

Both log types are stored in the same directory for easy access and debugging.

# TODO
- [x] Save xterm-debug.log in ~/.termster/logs -- then allow the user to view it in the TUI if they want full history
- [ ] Tune the the prompt so 4.1 does more without groveling
- [ ] Do the same for the chat log  
- [ ] Fix flickering / re-renders -- use react-devtools
- [ ] Allow non-mutable terminal commands
- [ ] Clearer CTA when needing user input
- [ ] UX for handling prompts that are fired during tool execution
- [ ] UX for canceling LLM execution
- [ ] Bring back ctrl+C to terminal context
- [ ] After one character of input, the cursor goes to a newline.
- [ ] Exec tool call truncates too aggressively -- should have another tool that can read contents progressively
- [ ] HistoryService is a POS, needs full refactor
- [ ] Thinking needs to come back after tool calling
- [ ] Handle window resizing
- [ ] Virtual scroll in the PromptPane is fully bricked.