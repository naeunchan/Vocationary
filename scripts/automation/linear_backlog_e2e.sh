#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

LINEAR_API_KEY="${LINEAR_API_KEY:-}"
LINEAR_TEAM_ID="${LINEAR_TEAM_ID:-}"
LINEAR_PROJECT_ID="${LINEAR_PROJECT_ID:-}"
LINEAR_ASSIGNEE_ID="${LINEAR_ASSIGNEE_ID:-}"
LINEAR_STATE_DONE="${LINEAR_STATE_DONE:-}"
LINEAR_STATE_INPROGRESS="${LINEAR_STATE_INPROGRESS:-}"
LINEAR_STATE_TODO="${LINEAR_STATE_TODO:-}"
TARGET_ISSUE_IDENTIFIER="${TARGET_ISSUE_IDENTIFIER:-}"
INCLUDE_LABEL="${INCLUDE_LABEL:-}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-}"
MAX_ISSUES="${MAX_ISSUES:-1}"
DRY_RUN="${DRY_RUN:-false}"
AUTO_MERGE="${AUTO_MERGE:-true}"
VERIFY_COMMANDS="${VERIFY_COMMANDS:-npm run lint -- --max-warnings=0 && npm test -- --watch=false}"
IMPLEMENT_COMMAND="${IMPLEMENT_COMMAND:-}"
AUTO_FIX_COMMAND="${AUTO_FIX_COMMAND:-}"
MAX_FIX_ATTEMPTS="${MAX_FIX_ATTEMPTS:-2}"
AUTOMATION_IN_PROGRESS_LABEL="${AUTOMATION_IN_PROGRESS_LABEL:-automation-in-progress}"
NEEDS_FOLLOWUP_LABEL="${NEEDS_FOLLOWUP_LABEL:-needs-followup}"
ISSUES_JSON_PATH=".codex/linear_issues.json"
LOG_PREFIX="[linear-automation]"

mkdir -p .codex/plans .codex/pr

log() {
    printf "%s %s\n" "$LOG_PREFIX" "$*"
}

fail() {
    printf "%s ERROR: %s\n" "$LOG_PREFIX" "$*" >&2
    exit 1
}

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

run_or_echo() {
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] $*"
        return 0
    fi
    "$@"
}

run_shell_or_echo() {
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] $*"
        return 0
    fi
    bash -lc "$*"
}

sanitize_for_branch() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-{2,}/-/g'
}

linear_graphql() {
    local query="$1"
    local variables="${2:-{}}"
    local payload
    local response
    if [ -z "$variables" ]; then
        variables="{}"
    fi
    if ! jq -e . >/dev/null 2>&1 <<<"$variables"; then
        variables="{}"
    fi
    payload="$(jq -cn --arg query "$query" --argjson variables "$variables" '{query:$query,variables:$variables}')"
    response="$(curl -sS "https://api.linear.app/graphql" \
        -H "Content-Type: application/json" \
        -H "Authorization: ${LINEAR_API_KEY}" \
        --data "$payload")"

    if echo "$response" | jq -e '.errors and (.errors | length > 0)' >/dev/null 2>&1; then
        echo "$response" | jq -c '.errors' >&2
        return 1
    fi
    echo "$response"
}

detect_default_branch() {
    if [ -n "$DEFAULT_BRANCH" ]; then
        return
    fi
    if git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
        DEFAULT_BRANCH="main"
        return
    fi
    if git ls-remote --exit-code --heads origin master >/dev/null 2>&1; then
        DEFAULT_BRANCH="master"
        return
    fi
    fail "could not detect default branch (main/master). Set DEFAULT_BRANCH."
}

sync_default_branch() {
    run_or_echo git checkout "$DEFAULT_BRANCH"
    run_or_echo git pull origin "$DEFAULT_BRANCH"
}

ensure_clean_tree() {
    if [ -n "$(git status --porcelain)" ]; then
        fail "working tree is not clean. Commit/stash changes before running automation."
    fi
}

query_labels() {
    local query_with_team='query($teamId: String!) { labels(filter:{team:{id:{eq:$teamId}}}, first: 250) { nodes { id name } } }'
    local query_all='query { labels(first: 250) { nodes { id name } } }'
    local query_with_team_alt='query($teamId: String!) { issueLabels(filter:{team:{id:{eq:$teamId}}}, first: 250) { nodes { id name } } }'
    local query_all_alt='query { issueLabels(first: 250) { nodes { id name } } }'
    local response fallback
    fallback='{"data":{"labels":{"nodes":[]}}}'
    if [ -n "$LINEAR_TEAM_ID" ]; then
        response="$(linear_graphql "$query_with_team" "$(jq -cn --arg teamId "$LINEAR_TEAM_ID" '{teamId:$teamId}')")" || true
        if [ -z "$response" ]; then
            response="$(linear_graphql "$query_with_team_alt" "$(jq -cn --arg teamId "$LINEAR_TEAM_ID" '{teamId:$teamId}')")" || true
            if [ -n "$response" ]; then
                response="$(jq -c '{data:{labels:.data.issueLabels}}' <<<"$response")"
            fi
        fi
    else
        response="$(linear_graphql "$query_all" "{}")" || true
        if [ -z "$response" ]; then
            response="$(linear_graphql "$query_all_alt" "{}")" || true
            if [ -n "$response" ]; then
                response="$(jq -c '{data:{labels:.data.issueLabels}}' <<<"$response")"
            fi
        fi
    fi
    if [ -n "$response" ]; then
        echo "$response"
    else
        echo "$fallback"
    fi
}

query_workflow_states() {
    local query_with_team='query($teamId: String!) { workflowStates(filter:{team:{id:{eq:$teamId}}}, first: 250) { nodes { id name type } } }'
    local query_all='query { workflowStates(first: 250) { nodes { id name type } } }'
    if [ -n "$LINEAR_TEAM_ID" ]; then
        linear_graphql "$query_with_team" "$(jq -cn --arg teamId "$LINEAR_TEAM_ID" '{teamId:$teamId}')"
    else
        linear_graphql "$query_all" "{}"
    fi
}

resolve_state_ids() {
    local states_json
    states_json="$(query_workflow_states)"

    if [ -z "$LINEAR_STATE_DONE" ]; then
        LINEAR_STATE_DONE="$(echo "$states_json" | jq -r '.data.workflowStates.nodes[] | select((.type // "") == "completed" or (.name | ascii_downcase) == "done") | .id' | head -n1)"
    fi
    if [ -z "$LINEAR_STATE_INPROGRESS" ]; then
        LINEAR_STATE_INPROGRESS="$(echo "$states_json" | jq -r '.data.workflowStates.nodes[] | select((.type // "") == "started" or (.name | ascii_downcase) == "in progress") | .id' | head -n1)"
    fi
    if [ -z "$LINEAR_STATE_TODO" ]; then
        LINEAR_STATE_TODO="$(echo "$states_json" | jq -r '.data.workflowStates.nodes[] | select((.type // "") == "unstarted" or (.name | ascii_downcase) == "todo") | .id' | head -n1)"
    fi

    if [ -z "$LINEAR_STATE_DONE" ]; then
        fail "could not resolve Done workflow state id. Set LINEAR_STATE_DONE."
    fi
}

fetch_issues() {
    local query
    local variables
    if [ -n "$LINEAR_PROJECT_ID" ]; then
        query='query($projectId: String!, $first: Int!) { issues(filter:{project:{id:{eq:$projectId}}}, first:$first, orderBy: createdAt) { nodes { id identifier title description url priority createdAt updatedAt state { id name type } labels { nodes { id name } } assignee { id name } } } }'
        variables="$(jq -cn --arg projectId "$LINEAR_PROJECT_ID" --argjson first 200 '{projectId:$projectId, first:$first}')"
    elif [ -n "$LINEAR_TEAM_ID" ]; then
        query='query($teamId: String!, $first: Int!) { issues(filter:{team:{id:{eq:$teamId}}}, first:$first, orderBy: createdAt) { nodes { id identifier title description url priority createdAt updatedAt state { id name type } labels { nodes { id name } } assignee { id name } } } }'
        variables="$(jq -cn --arg teamId "$LINEAR_TEAM_ID" --argjson first 200 '{teamId:$teamId, first:$first}')"
    else
        query='query($first: Int!) { issues(first:$first, orderBy: createdAt) { nodes { id identifier title description url priority createdAt updatedAt state { id name type } labels { nodes { id name } } assignee { id name } } } }'
        variables="$(jq -cn --argjson first 200 '{first:$first}')"
    fi

    linear_graphql "$query" "$variables"
}

filter_issue_list() {
    local source_json="$1"
    jq \
        --arg doneId "$LINEAR_STATE_DONE" \
        --arg target "$TARGET_ISSUE_IDENTIFIER" \
        --arg includeLabel "$INCLUDE_LABEL" \
        --arg assigneeId "$LINEAR_ASSIGNEE_ID" \
        '
        .data.issues.nodes
        | map(select((.state.id != $doneId) and ((.state.type // "") != "completed") and ((.state.type // "") != "canceled")))
        | map(select($target == "" or .identifier == $target))
        | map(select($includeLabel == "" or any(.labels.nodes[]?; .name == $includeLabel)))
        | map(select($assigneeId != "" or (.assignee == null)))
        | sort_by((if .priority == null then 999 else .priority end), .createdAt)
        ' <<<"$source_json"
}

issue_update_state() {
    local issue_id="$1"
    local state_id="$2"
    local mutation='mutation($id: String!, $stateId: String!) { issueUpdate(id:$id, input:{stateId:$stateId}) { success } }'
    local vars
    vars="$(jq -cn --arg id "$issue_id" --arg stateId "$state_id" '{id:$id,stateId:$stateId}')"
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] linear issueUpdate(state): ${issue_id} -> ${state_id}"
        return 0
    fi
    linear_graphql "$mutation" "$vars" >/dev/null
}

issue_add_comment() {
    local issue_id="$1"
    local body="$2"
    local mutation='mutation($id: String!, $body: String!) { commentCreate(input:{issueId:$id, body:$body}) { success } }'
    local vars
    vars="$(jq -cn --arg id "$issue_id" --arg body "$body" '{id:$id,body:$body}')"
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] linear commentCreate(issue=${issue_id})"
        return 0
    fi
    linear_graphql "$mutation" "$vars" >/dev/null
}

issue_set_labels() {
    local issue_id="$1"
    local label_ids_json="$2"
    local mutation='mutation($id: String!, $labelIds: [String!]) { issueUpdate(id:$id, input:{labelIds:$labelIds}) { success } }'
    local vars
    vars="$(jq -cn --arg id "$issue_id" --argjson labelIds "$label_ids_json" '{id:$id,labelIds:$labelIds}')"
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] linear issueUpdate(labels): ${issue_id} labels=${label_ids_json}"
        return 0
    fi
    linear_graphql "$mutation" "$vars" >/dev/null
}

issue_update_assignee() {
    local issue_id="$1"
    local assignee_id="$2"
    local mutation='mutation($id: String!, $assigneeId: String) { issueUpdate(id:$id, input:{assigneeId:$assigneeId}) { success } }'
    local vars
    vars="$(jq -cn --arg id "$issue_id" --arg assigneeId "$assignee_id" '{id:$id,assigneeId:$assigneeId}')"
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] linear issueUpdate(assignee): ${issue_id} -> ${assignee_id}"
        return 0
    fi
    linear_graphql "$mutation" "$vars" >/dev/null
}

query_issue_label_ids() {
    local issue_id="$1"
    local query='query($id: String!) { issue(id:$id) { labels { nodes { id } } } }'
    local vars response
    vars="$(jq -cn --arg id "$issue_id" '{id:$id}')"
    response="$(linear_graphql "$query" "$vars")"
    jq -c '.data.issue.labels.nodes | map(.id)' <<<"$response"
}

label_id_by_name() {
    local labels_json="$1"
    local label_name="$2"
    jq -r --arg name "$label_name" '.data.labels.nodes[]? | select((.name | ascii_downcase) == ($name | ascii_downcase)) | .id' <<<"$labels_json" | head -n1
}

issue_add_label_by_name() {
    local issue_json="$1"
    local labels_json="$2"
    local label_name="$3"
    local issue_id label_id existing_labels updated_labels
    issue_id="$(jq -r '.id' <<<"$issue_json")"
    label_id="$(label_id_by_name "$labels_json" "$label_name")"
    if [ -z "$label_id" ]; then
        return 0
    fi
    existing_labels="$(jq -c '.labels.nodes | map(.id)' <<<"$issue_json")"
    updated_labels="$(jq -c --arg id "$label_id" '. + [$id] | unique' <<<"$existing_labels")"
    issue_set_labels "$issue_id" "$updated_labels"
}

build_plan_file() {
    local issue_identifier="$1"
    local issue_title="$2"
    local issue_description="$3"
    local plan_file=".codex/plans/${issue_identifier}.md"
    {
        echo "# ${issue_identifier} ${issue_title}"
        echo
        echo "## Scope Checklist"
        echo "- [ ] Parse requirements"
        echo "- [ ] Implement requested changes"
        echo "- [ ] Verify acceptance criteria"
        echo "- [ ] Run lint/test/build checks"
        echo "- [ ] Prepare PR and merge"
        echo
        echo "## Risks"
        echo "- Scope creep beyond acceptance criteria"
        echo "- CI failure after implementation"
        echo "- Merge conflicts with default branch"
        echo
        echo "## Acceptance Criteria"
        if [ -n "$issue_description" ]; then
            echo "$issue_description"
        else
            echo "- (No description provided)"
        fi
        echo
        echo "## Test Plan"
        echo "- ${VERIFY_COMMANDS}"
    } >"$plan_file"
}

create_issue_branch() {
    local issue_identifier="$1"
    local issue_title="$2"
    local suffix
    suffix="$(sanitize_for_branch "$issue_title")"
    echo "linear/${issue_identifier}-${suffix}" | tr '[:upper:]' '[:lower:]'
}

append_issue_log() {
    local message="$1"
    echo "$message"
}

process_issue() {
    local issue_json="$1"
    local labels_json="$2"

    local issue_id issue_identifier issue_title issue_description issue_url branch_name
    issue_id="$(jq -r '.id' <<<"$issue_json")"
    issue_identifier="$(jq -r '.identifier' <<<"$issue_json")"
    issue_title="$(jq -r '.title' <<<"$issue_json")"
    issue_description="$(jq -r '.description // ""' <<<"$issue_json")"
    issue_url="$(jq -r '.url' <<<"$issue_json")"
    branch_name="$(create_issue_branch "$issue_identifier" "$issue_title")"

    log "Processing ${issue_identifier}: ${issue_title}"
    log "Issue URL: ${issue_url}"
    log "Branch: ${branch_name}"

    if [ -n "$LINEAR_ASSIGNEE_ID" ]; then
        issue_update_assignee "$issue_id" "$LINEAR_ASSIGNEE_ID"
    fi

    if [ -n "$LINEAR_STATE_INPROGRESS" ]; then
        issue_update_state "$issue_id" "$LINEAR_STATE_INPROGRESS"
    else
        issue_add_label_by_name "$issue_json" "$labels_json" "$AUTOMATION_IN_PROGRESS_LABEL"
    fi

    issue_add_comment "$issue_id" "Automation started: creating branch and implementing."
    build_plan_file "$issue_identifier" "$issue_title" "$issue_description"

    sync_default_branch
    if git rev-parse --verify --quiet "$branch_name" >/dev/null; then
        run_or_echo git branch -D "$branch_name"
    fi
    run_or_echo git checkout -b "$branch_name"

    if [ -z "$IMPLEMENT_COMMAND" ]; then
        issue_add_comment "$issue_id" "Automation stopped: IMPLEMENT_COMMAND is not configured. Set IMPLEMENT_COMMAND in workflow env."
        fail "IMPLEMENT_COMMAND is required for automated implementation."
    fi

    export ISSUE_ID="$issue_id"
    export ISSUE_IDENTIFIER="$issue_identifier"
    export ISSUE_TITLE="$issue_title"
    export ISSUE_DESCRIPTION="$issue_description"
    export ISSUE_URL="$issue_url"
    export ISSUE_PLAN_FILE=".codex/plans/${issue_identifier}.md"

    run_shell_or_echo "$IMPLEMENT_COMMAND"
    run_shell_or_echo "$VERIFY_COMMANDS"

    if [ -z "$(git status --porcelain)" ]; then
        issue_add_comment "$issue_id" "Automation stopped: no code changes detected after implementation."
        fail "no code changes detected for ${issue_identifier}"
    fi

    local followup_file=".codex/plans/${issue_identifier}.followups.md"
    if [ -f "$followup_file" ] && [ -s "$followup_file" ]; then
        local followup_label_id existing_labels updated_labels
        followup_label_id="$(label_id_by_name "$labels_json" "$NEEDS_FOLLOWUP_LABEL")"
        if [ -n "$followup_label_id" ]; then
            existing_labels="$(jq -c '.labels.nodes | map(.id)' <<<"$issue_json")"
            updated_labels="$(jq -c --arg id "$followup_label_id" '. + [$id] | unique' <<<"$existing_labels")"
            issue_set_labels "$issue_id" "$updated_labels"
        fi
        issue_add_comment "$issue_id" "Follow-up items detected:\n\n$(cat "$followup_file")"
    fi

    run_or_echo git add -A
    run_or_echo git commit --no-verify -m "${issue_identifier}: ${issue_title}" -m "Linear: ${issue_url}" -m "Verified: ${VERIFY_COMMANDS}"
    run_or_echo git push -u origin "$branch_name"

    local pr_body_file=".codex/pr/${issue_identifier}.md"
    cat >"$pr_body_file" <<EOF
## Summary
- Implemented backlog item: ${issue_identifier}

## Acceptance Criteria
- [x] Implemented requested scope
- [x] Verified locally

## Tests Run
\`\`\`bash
${VERIFY_COMMANDS}
\`\`\`

## Linear
- ${issue_url}
EOF

    local pr_url
    if [ "$DRY_RUN" = "true" ]; then
        pr_url="https://github.com/<dry-run>"
        log "[dry-run] Would create PR: ${issue_identifier}: ${issue_title}"
    else
        pr_url="$(gh pr create --title "${issue_identifier}: ${issue_title}" --body-file "$pr_body_file" --base "$DEFAULT_BRANCH" --head "$branch_name")"
    fi
    log "PR: ${pr_url}"

    if [ "$DRY_RUN" != "true" ]; then
        local check_attempt=0
        until gh pr checks "$pr_url" --watch; do
            check_attempt=$((check_attempt + 1))
            append_issue_log "${issue_identifier}: CI failed (attempt ${check_attempt})"
            gh pr view "$pr_url" --json statusCheckRollup || true
            if [ "$check_attempt" -gt "$MAX_FIX_ATTEMPTS" ] || [ -z "$AUTO_FIX_COMMAND" ]; then
                issue_add_comment "$issue_id" "Automation stopped: CI checks failed after ${check_attempt} attempts. See PR checks/logs."
                fail "CI checks failed for ${issue_identifier}"
            fi
            run_shell_or_echo "$AUTO_FIX_COMMAND"
            run_shell_or_echo "$VERIFY_COMMANDS"
            run_or_echo git add -A
            run_or_echo git commit --no-verify -m "${issue_identifier}: fix CI (${check_attempt})"
            run_or_echo git push
        done
    fi

    if [ "$AUTO_MERGE" = "true" ]; then
        run_or_echo gh pr merge "$pr_url" --merge --delete-branch
    else
        issue_add_comment "$issue_id" "Automation completed implementation and PR creation: ${pr_url}\nMerge left for manual approval."
        return 0
    fi

    sync_default_branch
    ensure_clean_tree

    issue_update_state "$issue_id" "$LINEAR_STATE_DONE"
    issue_add_comment "$issue_id" "Merged in PR ${pr_url}. Verified: ${VERIFY_COMMANDS}"

    local progress_label_id existing_labels cleaned_labels
    progress_label_id="$(label_id_by_name "$labels_json" "$AUTOMATION_IN_PROGRESS_LABEL")"
    if [ -n "$progress_label_id" ]; then
        existing_labels="$(query_issue_label_ids "$issue_id")"
        cleaned_labels="$(jq -c --arg id "$progress_label_id" '[.[] | select(. != $id)] | unique' <<<"$existing_labels")"
        issue_set_labels "$issue_id" "$cleaned_labels"
    fi

    append_issue_log "${issue_identifier} | branch=${branch_name} | pr=${pr_url} | ci=green | merged=yes | linear=done"
}

main() {
    require_cmd git
    require_cmd gh
    require_cmd curl
    require_cmd jq

    [ -n "$LINEAR_API_KEY" ] || fail "LINEAR_API_KEY is required."

    gh auth status >/dev/null 2>&1 || fail "gh is not authenticated."
    detect_default_branch
    ensure_clean_tree

    log "git: $(git --version)"
    log "gh: $(gh --version | head -n1)"
    log "default branch: ${DEFAULT_BRANCH}"
    log "dry-run: ${DRY_RUN}"

    resolve_state_ids

    local issues_raw issues_filtered labels_json issues_count
    issues_raw="$(fetch_issues)"
    issues_filtered="$(filter_issue_list "$issues_raw")"
    echo "$issues_filtered" >"$ISSUES_JSON_PATH"
    labels_json="$(query_labels)"

    issues_count="$(jq 'length' <<<"$issues_filtered")"
    log "Backlog candidates: ${issues_count}"
    if [ "$issues_count" -eq 0 ]; then
        log "No backlog issues to process."
        exit 0
    fi

    local idx=0
    while [ "$idx" -lt "$MAX_ISSUES" ] && [ "$idx" -lt "$issues_count" ]; do
        local issue_json
        issue_json="$(jq -c ".[$idx]" <<<"$issues_filtered")"
        process_issue "$issue_json" "$labels_json"
        idx=$((idx + 1))
    done

    log "Automation completed. Processed ${idx} issue(s)."
}

main "$@"
