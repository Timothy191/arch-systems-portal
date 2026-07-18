# 2.2 Conversational Tool Integration

Conversational platforms use **UI-based** skill binding, not filesystem paths.

| Platform      | Integration                                                     |
| ------------- | --------------------------------------------------------------- |
| Coze / 扣子   | Coze Space agent builder (Coze 2.0+); `cozespace/what_is_skill` |
| Cherry Studio | Agent configuration panel; skill injected into context          |

## vs programming tools

|          | Programming tools              | Conversational                   |
| -------- | ------------------------------ | -------------------------------- |
| Install  | Copy folder to `.tool/skills/` | Attach in agent builder UI       |
| Load     | Automatic at session start     | Platform injects at agent invoke |
| Artifact | Same normalized skill folder   | Same folder content              |

All three integration surfaces (programming, conversational, marketplaces/CLI) operate on the **same skill folder** format.
