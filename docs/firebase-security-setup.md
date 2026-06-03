# Firebase Security Setup

Use this checklist before deploying `database.rules.json`.

## 1. Bootstrap the first Super Admin

1. Sign in to the app once with the account that should become Super Admin.
2. Open Firebase Console.
3. Go to Realtime Database.
4. Open `Users/{uid}` for that account.
5. Change:

```json
"role": "player"
```

to:

```json
"role": "super-admin"
```

6. Keep `uid` unchanged. It must match the Firebase Auth UID.

Do this before deploying database rules. After rules are deployed, only a Super Admin can manage user roles.

## 2. Deploy rules

After the Super Admin user exists:

```bash
firebase deploy --only database
```

## 3. Verify access

After deployment:

- Super Admin can open `User Access` and promote/demote Admins.
- Admin can add, edit, and delete players.
- Admin can abandon matches.
- Player can create matches.
- Player can edit/delete only their own linked player profile.
- Player can score only matches they created.
- Any signed-in user can view matches and player career pages.

## 4. Existing match ownership

Older matches may not have `createdBy`.

Those matches can still be managed by Admin and Super Admin, but normal Players cannot score/edit them after rules are deployed. This is expected until old match records are migrated.

## 5. Database shape for new data

New app data should follow this structure:

```text
Users/{uid}
Cricket/Players/{playerId}
Cricket/Game/{yyyyMMdd}/Matches/{matchId}
Cricket/Teams/{teamId}
```

The app still reads older match dates like `31052021`, but new matches are written with sortable date keys like `20260531`.

## 6. Clean old public player fields

Older `Cricket/Players` records may contain `email` or `phone`. Those fields should not live in public player profiles anymore. User email and phone belong only under `Users/{uid}`.

In Firebase Console, inspect:

```text
Cricket/Players/{playerId}
```

For each player, remove:

```json
"email": "...",
"phone": "..."
```

Keep:

```json
"name": "...",
"description": "...",
"imgUrl": "...",
"userId": "..."
```

After this cleanup, deploy rules again:

```bash
firebase deploy --only database
```

## 7. Legacy nodes

Old nodes like this are not used by the current app:

```text
Cricket/Game/{date}/Teams
Cricket/Records
```

Do not add new data there. Keep them temporarily only if you need old backup/history. After confirming the app no longer depends on them, export a Firebase backup and delete those legacy nodes from the console.
