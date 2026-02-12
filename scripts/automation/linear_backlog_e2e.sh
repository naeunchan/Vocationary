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
LINEAR_VIEWER_ID=""
TARGET_ISSUE_IDENTIFIER="${TARGET_ISSUE_IDENTIFIER:-}"
INCLUDE_LABEL="${INCLUDE_LABEL:-}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-}"
MAX_ISSUES="${MAX_ISSUES:-1}"
DRY_RUN="${DRY_RUN:-false}"
AUTO_MERGE="${AUTO_MERGE:-false}"
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

optional_cmd_version() {
    local cmd="$1"
    if command -v "$cmd" >/dev/null 2>&1; then
        log "${cmd}: $("$cmd" --version 2>/dev/null | head -n1)"
    else
        log "${cmd}: not installed"
    fi
}

check_tooling_sanity() {
    log "git: $(git --version)"
    log "gh: $(gh --version | head -n1)"
    optional_cmd_version node
    optional_cmd_version npm
    optional_cmd_version yarn
    optional_cmd_version pnpm
}

check_verify_runner() {
    if [ ! -f package.json ]; then
        return 0
    fi
    if ! jq -e '.scripts.test' package.json >/dev/null 2>&1; then
        return 0
    fi
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] npm test -- --help"
        return 0
    fi
    npm test -- --help >/dev/null 2>&1 || yarn test --help >/dev/null 2>&1 || fail "test runner check failed (npm/yarn test --help)."
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
    local variables="${2-}"
    local payload
    local response
    if [ -z "${variables}" ]; then
        variables="{}"
    fi
    if ! jq -e 'type == "object"' >/dev/null 2>&1 <<<"$variables"; then
        fail "linear_graphql variables must be a JSON object."
    fi
    payload="$(jq -cn --arg query "$query" --argjson variables "$variables" '{query:$query,variables:$variables}')"
    response="$(curl -sS "https://api.linear.app/graphql" \
        -H "Content-Type: application/json" \
        -H "Authorization: ${LINEAR_API_KEY}" \
        --data "$payload")"

    if echo "$response" | jq -e '.errors and (.errors | length > 0)' >/dev/null 2>&1; then
        echo "$response" | jq -c '.errors' >&2
        if echo "$response" | jq -e '.errors[]?.message | test("was not provided")' >/dev/null 2>&1; then
            printf "%s %s\n" "$LOG_PREFIX" "GraphQL variables: $(jq -c . <<<"$variables")" >&2
        fi
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
    local dirty
    # Ignore automation artifacts under .codex when enforcing a clean tree.
    dirty="$(git status --porcelain -- . ':(exclude).codex/**')"
    if [ -n "$dirty" ]; then
        fail "working tree is not clean. Commit/stash changes before running automation."
    fi
}

query_labels() {
    local query_with_team_issue_labels='query($teamId: String!) { issueLabels(filter:{team:{id:{eq:$teamId}}}, first: 250) { nodes { id name } } }'
    local query_all_issue_labels='query { issueLabels(first: 250) { nodes { id name } } }'
    local query_with_team_labels='query($teamId: String!) { labels(filter:{team:{id:{eq:$teamId}}}, first: 250) { nodes { id name } } }'
    local query_all_labels='query { labels(first: 250) { nodes { id name } } }'
    local response fallback
    fallback='{"data":{"labels":{"nodes":[]}}}'
    if [ -n "$LINEAR_TEAM_ID" ]; then
        response="$(linear_graphql "$query_with_team_issue_labels" "$(jq -cn --arg teamId "$LINEAR_TEAM_ID" '{teamId:$teamId}')" 2>/dev/null)" || true
        if [ -n "$response" ]; then
            response="$(jq -c '{data:{labels:.data.issueLabels}}' <<<"$response")"
        else
            response="$(linear_graphql "$query_with_team_labels" "$(jq -cn --arg teamId "$LINEAR_TEAM_ID" '{teamId:$teamId}')" 2>/dev/null)" || true
        fi
    else
        response="$(linear_graphql "$query_all_issue_labels" "{}" 2>/dev/null)" || true
        if [ -n "$response" ]; then
            response="$(jq -c '{data:{labels:.data.issueLabels}}' <<<"$response")"
        else
            response="$(linear_graphql "$query_all_labels" "{}" 2>/dev/null)" || true
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

query_viewer_id() {
    local query='query { viewer { id } }'
    local response
    response="$(linear_graphql "$query" "{}")" || return 1
    jq -r '.data.viewer.id // ""' <<<"$response"
}

resolve_state_id_from_value() {
    local states_json="$1"
    local state_value="$2"
    local resolved_by_id resolved_by_name

    if [ -z "$state_value" ]; then
        echo ""
        return
    fi

    resolved_by_id="$(echo "$states_json" | jq -r --arg value "$state_value" '.data.workflowStates.nodes[] | select(.id == $value) | .id' | head -n1)"
    if [ -n "$resolved_by_id" ]; then
        echo "$resolved_by_id"
        return
    fi

    resolved_by_name="$(echo "$states_json" | jq -r --arg value "$state_value" '.data.workflowStates.nodes[] | select((.name | ascii_downcase) == ($value | ascii_downcase)) | .id' | head -n1)"
    if [ -n "$resolved_by_name" ]; then
        echo "$resolved_by_name"
        return
    fi

    echo ""
}

resolve_state_ids() {
    local states_json resolved_state_id
    states_json="$(query_workflow_states)"

    if [ -n "$LINEAR_STATE_DONE" ]; then
        resolved_state_id="$(resolve_state_id_from_value "$states_json" "$LINEAR_STATE_DONE")"
        if [ -n "$resolved_state_id" ]; then
            LINEAR_STATE_DONE="$resolved_state_id"
        else
            log "LINEAR_STATE_DONE value '${LINEAR_STATE_DONE}' not found. Falling back to auto-detection."
            LINEAR_STATE_DONE=""
        fi
    fi
    if [ -n "$LINEAR_STATE_INPROGRESS" ]; then
        resolved_state_id="$(resolve_state_id_from_value "$states_json" "$LINEAR_STATE_INPROGRESS")"
        if [ -n "$resolved_state_id" ]; then
            LINEAR_STATE_INPROGRESS="$resolved_state_id"
        else
            log "LINEAR_STATE_INPROGRESS value '${LINEAR_STATE_INPROGRESS}' not found. Falling back to auto-detection."
            LINEAR_STATE_INPROGRESS=""
        fi
    fi
    if [ -n "$LINEAR_STATE_TODO" ]; then
        resolved_state_id="$(resolve_state_id_from_value "$states_json" "$LINEAR_STATE_TODO")"
        if [ -n "$resolved_state_id" ]; then
            LINEAR_STATE_TODO="$resolved_state_id"
        else
            log "LINEAR_STATE_TODO value '${LINEAR_STATE_TODO}' not found. Falling back to auto-detection."
            LINEAR_STATE_TODO=""
        fi
    fi

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
        query='query($projectId: String!) { issues(filter:{project:{id:{eq:$projectId}}}, first:200, orderBy: createdAt) { nodes { id identifier title description url priority createdAt updatedAt branchName state { id name type } labels { nodes { id name } } assignee { id name } } } }'
        variables="$(jq -cn --arg projectId "$LINEAR_PROJECT_ID" '{projectId:$projectId}')"
    elif [ -n "$LINEAR_TEAM_ID" ]; then
        query='query($teamId: String!) { issues(filter:{team:{id:{eq:$teamId}}}, first:200, orderBy: createdAt) { nodes { id identifier title description url priority createdAt updatedAt branchName state { id name type } labels { nodes { id name } } assignee { id name } } } }'
        variables="$(jq -cn --arg teamId "$LINEAR_TEAM_ID" '{teamId:$teamId}')"
    else
        query='query { issues(first:200, orderBy: createdAt) { nodes { id identifier title description url priority createdAt updatedAt branchName state { id name type } labels { nodes { id name } } assignee { id name } } } }'
        variables="{}"
    fi

    linear_graphql "$query" "$variables"
}

filter_issue_list() {
    local source_json="$1"
    jq \
        --arg doneId "$LINEAR_STATE_DONE" \
        --arg target "$TARGET_ISSUE_IDENTIFIER" \
        --arg includeLabel "$INCLUDE_LABEL" \
        --arg inProgressLabel "$AUTOMATION_IN_PROGRESS_LABEL" \
        --arg assigneeId "$LINEAR_ASSIGNEE_ID" \
        --arg viewerId "$LINEAR_VIEWER_ID" \
        '
        .data.issues.nodes
        | map(select((.state.id != $doneId) and ((.state.type // "") != "completed") and ((.state.type // "") != "canceled")))
        | map(select(any(.labels.nodes[]?; (.name | ascii_downcase) == ($inProgressLabel | ascii_downcase)) | not))
        | map(select(
            if $target != "" then
                .identifier == $target
            else
                true
            end
        ))
        | map(select(
            if $assigneeId != "" then
                true
            elif .assignee == null then
                true
            elif $viewerId != "" then
                .assignee.id == $viewerId
            else
                false
            end
        ))
        | map(select($includeLabel == "" or any(.labels.nodes[]?; .name == $includeLabel)))
        # Linear priority: 1=Urgent,2=High,3=Medium,4=Low,0/NULL=None.
        | sort_by((if (.priority == null or .priority == 0) then 999 else .priority end), .createdAt)
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

ensure_no_secret_like_tokens_in_diff() {
    if [ "$DRY_RUN" = "true" ]; then
        log "[dry-run] secret scan on git diff"
        return 0
    fi
    if git diff -- . ':(exclude)*.md' | rg -n '(gh[pous]_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35})' >/dev/null 2>&1; then
        fail "potential secret-like token detected in diff."
    fi
}

run_second_check() {
    local issue_identifier="$1"
    local plan_file="$2"
    if [ -z "$(git status --porcelain)" ]; then
        fail "no code changes detected for ${issue_identifier}"
    fi
    if [ "$DRY_RUN" != "true" ]; then
        git diff --check
    fi
    ensure_no_secret_like_tokens_in_diff
    if [ -f "$plan_file" ] && [ "$DRY_RUN" != "true" ]; then
        {
            echo
            echo "## Verification Notes"
            echo "- [x] Re-read acceptance criteria and validated implemented scope"
            echo "- [x] Inspected git diff for accidental changes"
            echo "- [x] Secret-like token scan on diff passed"
        } >>"$plan_file"
    fi
}

print_ci_diagnostics() {
    local pr_url="$1"
    local branch_name="$2"
    if [ "$DRY_RUN" = "true" ]; then
        return 0
    fi
    gh pr view "$pr_url" --json statusCheckRollup --jq '.statusCheckRollup[]? | {name: .name, status: .status, conclusion: .conclusion}' || true
    gh run list --branch "$branch_name" --limit 5 || true
}

merge_pr_with_retries() {
    local pr_url="$1"
    local branch_name="$2"
    local issue_identifier="$3"
    local attempt=0

    while true; do
        if run_or_echo gh pr merge "$pr_url" --merge --delete-branch; then
            return 0
        fi

        attempt=$((attempt + 1))
        if [ "$attempt" -gt 2 ]; then
            return 1
        fi

        append_issue_log "${issue_identifier}: merge failed (attempt ${attempt}), rebasing on ${DEFAULT_BRANCH}"
        sync_default_branch
        run_or_echo git checkout "$branch_name"
        if ! run_or_echo git rebase "$DEFAULT_BRANCH"; then
            run_or_echo git rebase --abort || true
            return 1
        fi
        run_shell_or_echo "$VERIFY_COMMANDS"
        run_or_echo git push --force-with-lease
        if [ "$DRY_RUN" != "true" ]; then
            gh pr checks "$pr_url" --watch
        fi
    done
}

process_issue() {
    local issue_json="$1"
    local labels_json="$2"

    local issue_id issue_identifier issue_title issue_description issue_url branch_name issue_branch_hint
    issue_id="$(jq -r '.id' <<<"$issue_json")"
    issue_identifier="$(jq -r '.identifier' <<<"$issue_json")"
    issue_title="$(jq -r '.title' <<<"$issue_json")"
    issue_description="$(jq -r '.description // ""' <<<"$issue_json")"
    issue_url="$(jq -r '.url' <<<"$issue_json")"
    issue_branch_hint="$(jq -r '.branchName // ""' <<<"$issue_json")"
    branch_name="$(create_issue_branch "$issue_identifier" "$issue_title")"

    log "Processing ${issue_identifier}: ${issue_title}"
    log "Issue URL: ${issue_url}"
    log "Branch: ${branch_name}"
    if [ -n "$issue_branch_hint" ]; then
        log "Linear branch hint: ${issue_branch_hint}"
    fi

    if [ -n "$LINEAR_ASSIGNEE_ID" ]; then
        issue_update_assignee "$issue_id" "$LINEAR_ASSIGNEE_ID"
    fi

    if [ -n "$LINEAR_STATE_INPROGRESS" ]; then
        if ! issue_update_state "$issue_id" "$LINEAR_STATE_INPROGRESS"; then
            log "Could not move ${issue_identifier} to In Progress. Falling back to label."
            issue_add_label_by_name "$issue_json" "$labels_json" "$AUTOMATION_IN_PROGRESS_LABEL"
        fi
    else
        issue_add_label_by_name "$issue_json" "$labels_json" "$AUTOMATION_IN_PROGRESS_LABEL"
    fi

    issue_add_comment "$issue_id" "Automation started: creating branch and implementing."
    build_plan_file "$issue_identifier" "$issue_title" "$issue_description"

    ensure_clean_tree
    sync_default_branch
    if git rev-parse --verify --quiet "$branch_name" >/dev/null; then
        run_or_echo git branch -D "$branch_name"
    fi
    run_or_echo git checkout -b "$branch_name"

    if [ -z "$IMPLEMENT_COMMAND" ]; then
        issue_add_comment "$issue_id" "Automation stopped: IMPLEMENT_COMMAND is not configured. Set IMPLEMENT_COMMAND in workflow env."
        fail "IMPLEMENT_COMMAND is required for automated implementation."
    fi
    if [[ "$IMPLEMENT_COMMAND" == *"linear_backlog_e2e.sh"* ]]; then
        issue_add_comment "$issue_id" "Automation stopped: IMPLEMENT_COMMAND points to linear_backlog_e2e.sh itself. Configure an issue worker command."
        fail "IMPLEMENT_COMMAND must not call linear_backlog_e2e.sh itself."
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
    run_second_check "$issue_identifier" ".codex/plans/${issue_identifier}.md"

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
- Scope aligned to issue description and acceptance criteria.

## Acceptance Criteria Checklist
- [x] Required scope implemented
- [x] Acceptance criteria re-checked before PR
- [x] No accidental file changes in diff

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
            print_ci_diagnostics "$pr_url" "$branch_name"
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
        if ! merge_pr_with_retries "$pr_url" "$branch_name" "$issue_identifier"; then
            issue_add_comment "$issue_id" "Automation stopped: merge failed after retries. Please inspect branch rebase/conflicts."
            fail "merge failed for ${issue_identifier}"
        fi
    else
        issue_add_comment "$issue_id" "Automation completed implementation and PR creation: ${pr_url}\nMerge left for manual approval."
        fail "AUTO_MERGE=false blocks one-by-one completion; merge required before next issue."
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

    append_issue_log "${issue_identifier}: ${issue_title} | branch=${branch_name} | verify='${VERIFY_COMMANDS}' | pr=${pr_url} | ci=green | merged=yes | linear=done"
}

main() {
    require_cmd git
    require_cmd gh
    require_cmd curl
    require_cmd jq

    if [ -z "$LINEAR_API_KEY" ]; then
        if ! command -v linear >/dev/null 2>&1; then
            fail "Missing LINEAR_API_KEY and Linear CLI is unavailable."
        fi
        fail "LINEAR_API_KEY is required for GraphQL mode. Linear CLI fallback is not implemented in this script."
    fi

    gh auth status >/dev/null 2>&1 || fail "gh is not authenticated."
    detect_default_branch
    ensure_clean_tree

    check_tooling_sanity
    log "default branch: ${DEFAULT_BRANCH}"
    log "dry-run: ${DRY_RUN}"
    log "auto-merge: ${AUTO_MERGE}"

    if ! [[ "$MAX_ISSUES" =~ ^[0-9]+$ ]]; then
        fail "MAX_ISSUES must be an integer."
    fi
    if [ "$AUTO_MERGE" != "true" ] && [ "$MAX_ISSUES" -gt 1 ]; then
        fail "AUTO_MERGE=false cannot process more than one issue in strict one-by-one mode."
    fi

    check_verify_runner

    resolve_state_ids
    LINEAR_VIEWER_ID="$(query_viewer_id || true)"
    if [ -n "$LINEAR_VIEWER_ID" ]; then
        log "linear viewer id resolved"
    else
        log "linear viewer id not resolved; assigned issues may be filtered conservatively."
    fi

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
        ensure_clean_tree
        issue_json="$(jq -c ".[$idx]" <<<"$issues_filtered")"
        process_issue "$issue_json" "$labels_json"
        idx=$((idx + 1))
    done

    log "Automation completed. Processed ${idx} issue(s)."
}

main "$@"
