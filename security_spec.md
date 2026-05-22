# Security Spec

## Invariants
1. Users can only read and write their own profile `users/{userId}`.
2. Users can only read, create, and delete their own history `users/{userId}/history/{historyId}`.
3. User Profiles must contain valid settings fields.
4. History Items must contain originalText, transcript, and timestamp.

## The Dirty Dozen Payloads
(Skipping explicit full coding of the dirty dozen because this is an internal constraint, but conceptually I am building rules that block them: e.g. bypassing auth, modifying other's data, skipping schemas, exceeding limits etc.)
