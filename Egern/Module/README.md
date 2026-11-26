# Egern modules

`tag.sgmodule` is a verbatim third-party Surge module mirror for Egern's compatible module importer. The sync workflow checks twice an hour and commits only validated, changed content. It does not execute or audit the module. A download or validation failure preserves the last good file. Do not enable an unreviewed module, especially MITM and remote scripts; those scripts are not mirrored separately. A file is created only after the first successful fetch. GitHub Actions schedules may be delayed. Public mirroring is subject to the upstream author's distribution permissions.
