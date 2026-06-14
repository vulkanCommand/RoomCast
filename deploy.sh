#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh [options] [remote] [branch]

Examples:
  ./deploy.sh
  ./deploy.sh origin main
  ./deploy.sh --allow-new-branch origin feature/my-branch
  ./deploy.sh --firebase hosting
  ./deploy.sh --firebase functions
  ./deploy.sh --firebase rules
  ./deploy.sh --firebase all
  ./deploy.sh --firebase hosting,functions
  ./deploy.sh --message "fix: ship latest RoomCast updates" --firebase hosting

Options:
  --allow-new-branch     Allow the script to create a brand-new remote branch
  --firebase <scope>     Deploy to Firebase after pushing
                         Supported scopes:
                           hosting
                           functions
                           rules
                           all
                           hosting,functions
                           hosting,rules
                           functions,rules
                           hosting,functions,rules
  --message <text>       Commit message to use when local changes are present
  -h, --help             Show this help text

Behavior:
  - stages and commits local changes when the worktree is dirty
  - fetches the target remote
  - rebases the current branch onto remote/branch when it exists
  - pushes safely with --force-with-lease only when a rebase rewrites local history
  - refuses to create a brand-new remote branch unless --allow-new-branch is provided
  - deploys to Firebase only when --firebase is explicitly passed
  - runs safety checks before Firebase deployment
EOF
}

die() {
  echo "Error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command '$1' is not installed or not on PATH."
}

normalize_firebase_scope() {
  local raw="${1,,}"
  case "$raw" in
    all)
      echo "hosting,functions,firestore:rules"
      ;;
    hosting)
      echo "hosting"
      ;;
    functions)
      echo "functions"
      ;;
    rules)
      echo "firestore:rules"
      ;;
    hosting,functions|functions,hosting)
      echo "hosting,functions"
      ;;
    hosting,rules|rules,hosting)
      echo "hosting,firestore:rules"
      ;;
    functions,rules|rules,functions)
      echo "functions,firestore:rules"
      ;;
    hosting,functions,rules|hosting,rules,functions|functions,hosting,rules|functions,rules,hosting|rules,hosting,functions|rules,functions,hosting)
      echo "hosting,functions,firestore:rules"
      ;;
    *)
      die "unsupported Firebase scope '$1'. Use hosting, functions, rules, all, or a comma-separated combination."
      ;;
  esac
}

run_firebase_checks() {
  local scope="$1"

  require_command firebase
  require_command npm

  echo "Confirming Firebase project..."
  local firebase_project
  firebase_project="$(firebase use --json | sed -n 's/.*"result":"\([^"]*\)".*/\1/p')"
  [[ -n "$firebase_project" ]] || die "could not determine the active Firebase project."

  echo "Active Firebase project: $firebase_project"

  if [[ "$scope" == *"hosting"* ]]; then
    echo "Running frontend build before Hosting deploy..."
    npm run build
  fi

  if [[ "$scope" == *"functions"* ]]; then
    echo "Building Cloud Functions before deploy..."
    (
      cd functions
      npm run build
    )
  fi

  if [[ "$scope" == *"firestore:rules"* ]]; then
    [[ -f firestore.rules ]] || die "firestore.rules not found."
  fi
}

ALLOW_NEW_BRANCH="false"
FIREBASE_SCOPE=""
COMMIT_MESSAGE=""

POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --allow-new-branch)
      ALLOW_NEW_BRANCH="true"
      shift
      ;;
    --firebase)
      [[ $# -ge 2 ]] || die "--firebase requires a scope."
      FIREBASE_SCOPE="$(normalize_firebase_scope "$2")"
      shift 2
      ;;
    --message)
      [[ $# -ge 2 ]] || die "--message requires commit text."
      COMMIT_MESSAGE="$2"
      shift 2
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

REMOTE="${POSITIONAL[0]:-origin}"
CURRENT_BRANCH="$(git branch --show-current)"
BRANCH="${POSITIONAL[1]:-$CURRENT_BRANCH}"

[[ -n "$CURRENT_BRANCH" ]] || die "not on a local branch. Check out a branch before deploying."
[[ "$BRANCH" == "$CURRENT_BRANCH" ]] || die "current branch is '$CURRENT_BRANCH' but target branch is '$BRANCH'. Switch first or omit the override."

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "this script must be run inside a Git repository."
git remote get-url "$REMOTE" >/dev/null 2>&1 || die "remote '$REMOTE' does not exist."

GIT_DIR="$(git rev-parse --git-dir)"
[[ ! -d "$GIT_DIR/rebase-merge" && ! -d "$GIT_DIR/rebase-apply" && ! -f "$GIT_DIR/MERGE_HEAD" ]] || die "a merge or rebase is already in progress."

if [[ -n "$(git status --porcelain)" ]]; then
  git update-index -q --refresh
  echo "Detected local changes. Staging and creating a commit..."
  git add -A
  if [[ -z "$COMMIT_MESSAGE" ]]; then
    COMMIT_MESSAGE="chore: deploy latest RoomCast updates ($(date +%Y-%m-%d\ %H:%M:%S))"
  fi
  git commit -m "$COMMIT_MESSAGE"
fi

echo "Fetching '$REMOTE'..."
git fetch --prune "$REMOTE"

REMOTE_REF="refs/remotes/$REMOTE/$BRANCH"
REMOTE_BRANCH_EXISTS="false"
if git show-ref --verify --quiet "$REMOTE_REF"; then
  REMOTE_BRANCH_EXISTS="true"
fi

BEFORE_HEAD="$(git rev-parse HEAD)"

if [[ "$REMOTE_BRANCH_EXISTS" == "true" ]]; then
  echo "Rebasing '$BRANCH' onto '$REMOTE/$BRANCH'..."
  git rebase "$REMOTE/$BRANCH"
else
  [[ "$ALLOW_NEW_BRANCH" == "true" ]] || die "remote branch '$REMOTE/$BRANCH' does not exist. Re-run with --allow-new-branch if you want to create it intentionally."
  echo "Remote branch '$REMOTE/$BRANCH' does not exist. Preparing first push."
fi

AFTER_HEAD="$(git rev-parse HEAD)"

echo "Pushing '$BRANCH' to '$REMOTE'..."
if [[ "$REMOTE_BRANCH_EXISTS" == "true" ]]; then
  if [[ "$BEFORE_HEAD" != "$AFTER_HEAD" ]]; then
    git push --force-with-lease "$REMOTE" "$BRANCH"
  else
    git push "$REMOTE" "$BRANCH"
  fi
else
  git push -u "$REMOTE" "$BRANCH"
fi

if [[ -n "$FIREBASE_SCOPE" ]]; then
  echo "Preparing Firebase deployment for scope: $FIREBASE_SCOPE"
  run_firebase_checks "$FIREBASE_SCOPE"
  echo "Deploying to Firebase..."
  firebase deploy --only "$FIREBASE_SCOPE"
fi

echo "Deploy script completed successfully."
