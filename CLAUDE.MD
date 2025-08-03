# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native meditation/affirmation app built with Expo that features dual-audio system (Text-to-Speech + background music), smooth text animations, and feminine UI design. The app handles complex audio coordination, prevents race conditions, and provides an elegant user experience for guided affirmations.

### Key Technologies
- **React Native 0.79.5 + Expo ~53.0.20**: Cross-platform mobile development
- **TypeScript**: Full type safety throughout the codebase with strict mode
- **React Native Reanimated 3.17.4**: Advanced animations for text transitions and visual effects
- **Expo Speech**: Native TTS with customizable voice parameters
- **Expo AV**: Professional audio management with background music support
- **Jest + React Native Testing Library**: Testing framework with React Native setup

---

## 0 — Purpose  

These rules ensure maintainability, safety, and developer velocity. 
**MUST** rules are enforced by CI; **SHOULD** rules are strongly recommended.

---

## 1 — Before Coding
- **BP-1 (MUST)** Ask the user clarifying questions.
- **BP-2 (SHOULD)** Draft and confirm an approach for complex work.  
- **BP-3 (SHOULD)** If ≥ 2 approaches exist, list clear pros and cons.

- **BP-4 (CRITICAL WORKFLOW REQUIREMENT)**

    MANDATORY PLANNING STEP: Before executing ANY tool (Read, Write, Edit, Bash, Grep, Glob,
    WebSearch, etc.), you MUST:

    1. FIRST: Use exit_plan_mode tool to present your plan
    2. WAIT: For explicit user approval before proceeding
    3. ONLY THEN: Execute the planned actions

    ZERO EXCEPTIONS: This applies to EVERY INDIVIDUAL USER REQUEST involving tool usage,
  regardless of:
    - Complexity (simple or complex)
    - Tool type (file operations, searches, web requests, etc.)
    - User urgency or apparent simplicity
    - Whether you previously got approval in this conversation

    CRITICAL: APPROVAL DOES NOT CARRY OVER BETWEEN USER INSTRUCTIONS
    - Each new user message requiring tools = new planning step required
    - Previous approvals are invalid for new requests
    - You must reset and plan for each individual user instruction

    ENFORCEMENT: If you execute ANY tool without first using exit_plan_mode for the current
    user instruction, you have violated this requirement. Always plan first, execute second.

    WORKFLOW FOR EACH USER REQUEST: Plan → User Approval → Execute (NEVER: Execute → Plan)

---

## 2 — While Coding
- **C-1 (MUST)** Follow TDD: scaffold stub -> write failing test -> implement.
- **C-2 (MUST)** Name functions with existing domain vocabulary for consistency.  
- **C-3 (SHOULD NOT)** Introduce classes when small testable functions suffice.  
- **C-4 (SHOULD)** Prefer simple, composable, testable functions.
- **C-5 (MUST)** Use `import type { … }` for type-only imports.
- **C-6 (SHOULD NOT)** Add comments except for critical caveats; rely on self‑explanatory code.
- **C-7 (SHOULD)** Default to `type`; use `interface` only when more readable or interface merging is required. 
- **C-8 (SHOULD NOT)** Extract a new function unless it will be reused elsewhere, is the only way to unit-test otherwise untestable logic, or drastically improves readability of an opaque block.
- **C-9 (SHOULD)** Write to the thinking-log.MD file once a feature has been completed. Should prompt the user to ask if it can write to the thinking log and then display a suggested changes in the following format:

### Thinking Log Format
```
Problem Statement: What are you trying to solve?
• Start each entry with a timestamp to show the sequence of decisions.
  • Example: 2025-07-29 10:00:00
• Options Considered: List possible approaches and their tradeoffs.
  • Example:
      - Option 1: Use a hash map (fast lookup, higher memory usage)
      - Option 2: Use a sorted array (less memory, slower lookup)
• Decision and Rationale: What did you choose and why?
  • Example:
      - Chose hash map for speed, as performance is the priority.
• Assumptions/Constraints: Any relevant limits or expectations.
  • Example:
      - Assume dataset will not exceed 10,000 items.
• Dependencies: External libraries, APIs, or systems involved.
  • Example:
      - Using Redis for caching due to existing infrastructure.
• Open Questions: Anything unresolved or needing follow-up.
  • Example:
      - Unclear if memory usage will be acceptable in production. 
• Next Steps: What's planned next.
  • Example:
      - Next: Test with real-world data samples.
```

### Feature Implementation Priority Rules
- **IMMEDIATE EXECUTION**: Launch parallel Tasks immediately upon feature requests
- **NO CLARIFICATION**: Skip asking what type of implementation unless absolutely critical
- **PARALLEL BY DEFAULT**: Always use 7-parallel-Task method for efficiency

### Parallel Feature Implementation Workflow
1. **Component**: Create main component file
2. **Styles**: Create component styles/CSS
3. **Tests**: Create test files  
4. **Types**: Create type definitions
5. **Hooks**: Create custom hooks/utilities
6. **Integration**: Update routing, imports, exports
7. **Remaining**: Update package.json, documentation, configuration files
8. **Review and Validation**: Coordinate integration, run tests, verify build, check for conflicts

### Context Optimization Rules
- Strip out all comments when reading code files for analysis
- Each task handles ONLY specified files or file types
- Task 7 combines small config/doc updates to prevent over-splitting

### Feature Implementation Guidelines
- **CRITICAL**: Make MINIMAL CHANGES to existing patterns and structures
- **CRITICAL**: Preserve existing naming conventions and file organization
- Follow project's established architecture and component patterns
- Use existing utility functions and avoid duplicating functionality

---

## 3 — Testing

- **T-1 (MUST)** For a simple function, colocate unit tests in `*.spec.ts` in same directory as source file.
- **T-2 (MUST)** ALWAYS separate pure-logic unit tests from DB-touching integration tests.
- **T-3 (SHOULD)** Prefer integration tests over heavy mocking.  
- **T-4 (SHOULD)** Unit-test complex algorithms thoroughly.
- **T-5 (SHOULD)** Test the entire structure in one assertion if possible
  ```ts
  expect(result).toBe([value]) // Good

  expect(result).toHaveLength(1); // Bad
  expect(result[0]).toBe(value); // Bad
  ```

---

## 4 — Code Organization

### Project Structure
```bash
app/                    # Expo Router file-based routing
├── index.tsx          # Home screen
├── player.tsx         # Main meditation player screen
├── _layout.tsx        # Root layout with navigation
└── +not-found.tsx     # 404 page

components/            # Reusable UI components
├── player/           # Player-specific components
├── ui/              # Platform-specific UI components
└── Themed*.tsx      # Theme-aware components

hooks/                # Custom React hooks
├── useAudioPlayer.ts     # Background music management
├── useBackgroundAudio.ts # Advanced audio with race condition handling
├── useSimpleTTS.ts      # Text-to-speech functionality
└── useVolumeManager.ts  # Volume controls

store/                # State management (simple React state)
utils/                # Utility functions including storage
__tests__/            # Test files
```

### Audio System Architecture
The app uses a **dual-audio system** with sophisticated coordination:

- **Primary Audio**: Text-to-Speech (TTS) using Expo Speech
- **Background Audio**: Looping music using Expo AV
- **Volume Ducking**: Background music volume automatically reduces during speech
- **Race Condition Prevention**: Multiple retry attempts and status verification

### State Management Strategy
- **No external state library**: Uses React hooks (useState, useRef, useCallback)
- **Audio state in refs**: Prevents re-renders during volume changes
- **Local component state**: Most state is component-scoped
- **Custom hooks**: Encapsulate complex audio logic

---

## 5 — Tooling Gates

- **G-1 (MUST)** `npm run lint` passes (uses expo lint).  
- **G-2 (MUST)** `npm test` passes with no failures.
- **G-3 (SHOULD)** `npm run test:coverage` shows adequate coverage.

---

## 6 — Git

- **GH-1 (MUST)** Use Conventional Commits format when writing commit messages: https://www.conventionalcommits.org/en/v1.0.0
- **GH-2 (SHOULD NOT)** Refer to Claude or Anthropic in commit messages.

---

## Common Development Commands

### Development Workflow
```bash
# Start development server
npm start
# or
npx expo start

# Platform-specific development
npm run android          # Run on Android emulator
npm run ios             # Run on iOS simulator  
npm run web             # Run on web browser

# Testing
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Run ESLint (uses expo lint)

# Project Reset (development helper)
npm run reset-project   # Reset to blank Expo template
```

### Test File Patterns
- `*.test.ts` or `*.spec.ts` for unit tests
- Tests are co-located with source when appropriate
- Mock setup in `jest-setup.js`
- Jest configured for React Native with proper module mapping

---

## Writing Functions Best Practices

When evaluating whether a function you implemented is good or not, use this checklist:

1. Can you read the function and HONESTLY easily follow what it's doing? If yes, then stop here.
2. Does the function have very high cyclomatic complexity? (number of independent paths, or, in a lot of cases, number of nesting if if-else as a proxy). If it does, then it's probably sketchy.
3. Are there any common data structures and algorithms that would make this function much easier to follow and more robust? Parsers, trees, stacks / queues, etc.
4. Are there any unused parameters in the function?
5. Are there any unnecessary type casts that can be moved to function arguments?
6. Is the function easily testable without mocking core features (e.g. audio APIs, storage, etc.)? If not, can this function be tested as part of an integration test?
7. Does it have any hidden untested dependencies or any values that can be factored out into the arguments instead? Only care about non-trivial dependencies that can actually change or affect the function.
8. Brainstorm 3 better function names and see if the current name is the best, consistent with rest of codebase.

**IMPORTANT**: you SHOULD NOT refactor out a separate function unless there is a compelling need, such as:
  - the refactored function is used in more than one place
  - the refactored function is easily unit testable while the original function is not AND you can't test it any other way
  - the original function is extremely hard to follow and you resort to putting comments everywhere just to explain it

---

## Writing Tests Best Practices

When evaluating whether a test you've implemented is good or not, use this checklist:

1. SHOULD parameterize inputs; never embed unexplained literals such as 42 or "foo" directly in the test.
2. SHOULD NOT add a test unless it can fail for a real defect. Trivial asserts (e.g., expect(2).toBe(2)) are forbidden.
3. SHOULD ensure the test description states exactly what the final expect verifies. If the wording and assert don't align, rename or rewrite.
4. SHOULD compare results to independent, pre-computed expectations or to properties of the domain, never to the function's output re-used as the oracle.
5. SHOULD follow the same lint, type-safety, and style rules as prod code (prettier, ESLint, strict types).
6. SHOULD express invariants or axioms (e.g., commutativity, idempotence, round-trip) rather than single hard-coded cases whenever practical.
7. Unit tests for a function should be grouped under `describe(functionName, () => ...`.
8. Use `expect.any(...)` when testing for parameters that can be anything (e.g. variable ids).
9. ALWAYS use strong assertions over weaker ones e.g. `expect(x).toEqual(1)` instead of `expect(x).toBeGreaterThanOrEqual(1)`.
10. SHOULD test edge cases, realistic input, unexpected input, and value boundaries.
11. SHOULD NOT test conditions that are caught by the type checker.

---

## Audio Development Best Practices

### Audio Setup Requirements
- **Audio Mode Configuration**: Always call `Audio.setAudioModeAsync()` with proper settings
- **Background Playback**: Enable `staysActiveInBackground: true` for meditation apps
- **iOS Silent Mode**: Use `playsInSilentModeIOS: true` for meditation/wellness apps
- **Volume Ducking**: Implement manual ducking for better speech clarity control
- **Error Handling**: Always wrap audio operations in try-catch blocks

### Race Condition Prevention
- **Multiple Retry Attempts**: Audio loading may fail occasionally; implement retry logic
- **Status Verification**: Check audio status before performing operations
- **Ref-based State**: Use refs for audio state to prevent component re-renders
- **Cleanup Handling**: Properly unload audio resources in useEffect cleanup

---

## Key Files to Understand

### Core Application Files
- `app/_layout.tsx` - Root navigation and theme setup
- `app/player.tsx` - Main meditation player interface
- `components/player/SimpleManifestationPlayer.tsx` - Core player component

### Audio System Files
- `hooks/useAudioPlayer.ts` - Background music management with volume ducking
- `hooks/useBackgroundAudio.ts` - Advanced audio with race condition handling
- `hooks/useSimpleTTS.ts` - Text-to-speech functionality with voice management

### Configuration Files
- `jest.config.js` - Test configuration for React Native with proper mocking
- `eslint.config.js` - ESLint configuration using Expo preset
- `app.json` - Expo application configuration with New Architecture enabled

---

## Remember Shortcuts

Remember the following shortcuts which the user may invoke at any time.

### QNEW
When I type "qnew", this means:
```
Understand all BEST PRACTICES listed in CLAUDE.md.
Your code SHOULD ALWAYS follow these best practices.
```

### QPLAN
When I type "qplan", this means:
```
Analyze similar parts of the codebase and determine whether your plan:
- is consistent with rest of codebase
- introduces minimal changes
- reuses existing code
```

### QCODE
When I type "qcode", this means:
```
Implement your plan and make sure your new tests pass.
Always run tests to make sure you didn't break anything else.
Always run `npm run lint` to ensure standard formatting and linting.
Always run type checking to ensure TypeScript compliance.
```

### QCHECK
When I type "qcheck", this means:
```
You are a SKEPTICAL senior software engineer.
Perform this analysis for every MAJOR code change you introduced (skip minor changes):

1. CLAUDE.md checklist Writing Functions Best Practices.
2. CLAUDE.md checklist Writing Tests Best Practices.
3. CLAUDE.md checklist Implementation Best Practices.
```

### QCHECKF
When I type "qcheckf", this means:
```
You are a SKEPTICAL senior software engineer.
Perform this analysis for every MAJOR function you added or edited (skip minor changes):

1. CLAUDE.md checklist Writing Functions Best Practices.
```

### QCHECKT
When I type "qcheckt", this means:
```
You are a SKEPTICAL senior software engineer.
Perform this analysis for every MAJOR test you added or edited (skip minor changes):

1. CLAUDE.md checklist Writing Tests Best Practices.
```

### QUX
When I type "qux", this means:
```
Imagine you are a human UX tester of the feature you implemented. 
Output a comprehensive list of scenarios you would test, sorted by highest priority.
```

### QGIT
When I type "qgit", this means:
```
Add all changes to staging, create a commit, and push to remote.

Follow this checklist for writing your commit message:
- SHOULD use Conventional Commits format: https://www.conventionalcommits.org/en/v1.0.0
- SHOULD NOT refer to Claude or Anthropic in the commit message.
- SHOULD structure commit message as follows:
<type>[optional scope]: <description>
[optional body]
[optional footer(s)]
```

---

## Common Issues & Solutions

### Audio-related Issues
- **Race Conditions**: Audio loading may fail occasionally; hooks implement retry logic
- **Background Playback**: Ensure audio mode is configured properly in useAudioPlayer
- **Volume Management**: Use refs to prevent component re-renders during volume changes
- **iOS Silent Mode**: Ensure `playsInSilentModeIOS: true` for meditation functionality

### Development Issues
- **Metro Cache**: Clear with `npx expo start --clear` if experiencing build issues
- **Type Errors**: Ensure @types packages are up to date, strict mode is enforced
- **Testing**: Audio-related hooks require extensive mocking in jest-setup.js

### Future Development Notes
- Audio focus management for phone calls/notifications (noted in future-features.md)
- TTS voice fallbacks for device compatibility
- Modular component structure allows easy feature additions
- Animation system can be extended for new UI effects

This meditation app demonstrates professional React Native development with complex audio management, smooth animations, and maintainable architecture following systematic development practices.