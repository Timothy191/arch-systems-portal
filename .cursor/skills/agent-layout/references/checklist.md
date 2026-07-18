# New agent checklist

- [ ] Entry file `.cursor/agents/<name>.md` (flat — required by Cursor)
- [ ] Collateral folder `.cursor/agents/<name>/` with `references/` + `assets/`
- [ ] YAML: `name`, `description` with anti-triggers
- [ ] Optional: `model`, `readonly`, `is_background` per Cursor docs
- [ ] Link `_shared/references/gold-standard-contract.md`
- [ ] Entry ≤65 lines; depth in `references/`
- [ ] Output template in `assets/`
- [ ] Update `.cursor/agents/README.md` and `04-subagent-auto-routing.mdc`
- [ ] Run `validate-agents.sh`
