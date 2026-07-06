#!/usr/bin/env bash

# commit-msg hook template to validate conventional commit format

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Regular expression to match conventional commit format
pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+"

if [[ ! $commit_msg =~ $pattern ]]; then
  echo "ERROR: Commit message does not match Conventional Commits format."
  echo "Format: <type>(<scope>): <subject>"
  echo "Example: feat(portal): add dashboard layouts"
  exit 1
fi
