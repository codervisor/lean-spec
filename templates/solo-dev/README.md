# Solo Dev Template

Quick setup for individual developers working on their own projects.

## What's Included

- **AGENTS.md** - Minimal AI agent instructions (customize for your project)
- **Example spec** - Shows the LeanSpec folder structure and format
- **Config** - Opinionated defaults for fast iteration

## Structure

```
your-project/
├── specs/
│   └── YYYYMMDD/
│       └── NNN-name/
│           └── README.md
├── AGENTS.md
└── .lspec/
    └── config.json
```

## Philosophy

Keep it minimal. Add structure only when needed. Focus on shipping, not documenting.

## Next Steps

1. Customize AGENTS.md for your project's coding standards
2. Delete the example spec
3. Create your first real spec: `lspec create my-feature`
