# slash.cash video

Remotion app for slash.cash marketing videos.

## Commands

```bash
pnpm --filter @knitly/video dev
pnpm --filter @knitly/video render:story
pnpm --filter @knitly/video lint
```

The current social video composition is `InboxToInsight`.

## Local audio

The video expects a local music file at:

```text
apps/video/public/audio/powerhouse-first-30.mp3
```

That MP3 is intentionally ignored and should not be committed. Generated SFX and source files are safe to keep in the repo.
