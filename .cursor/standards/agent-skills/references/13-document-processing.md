# 5.3 Document Processing Skills

From `anthropics/skills`:

| Folder | Format     | Capability          |
| ------ | ---------- | ------------------- |
| `docx` | Word       | Create/edit `.docx` |
| `pptx` | PowerPoint | Create/edit `.pptx` |
| `xlsx` | Excel      | Create/edit `.xlsx` |
| `pdf`  | PDF        | Create/edit `.pdf`  |

## Install

```bash
npx skills add anthropics/skills
```

Individual folders copy to `.cursor/skills/docx/` etc.

## Structure

Each uses standard three-component layout: `SKILL.md` + scripts + assets.

## Related (not core format skills)

- Content creation PPT agents → `14-content-creation.md`
- Slidev / Remotion → `11-official-org-skills.md`
