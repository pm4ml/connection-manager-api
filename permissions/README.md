# MCM Authorization (Ory Keto OPL)

`mcm.keto.ts` defines MCM's authorization policy as [Ory Permission Language](https://www.ory.sh/docs/keto/reference/ory-permission-language) (OPL) namespaces.

## Model

Two namespaces:

- **`Hub`**: single object (`Hub:mojaloop`). Holds hub-admin relations and hub-level permits (`dfspList`, `dfspManage`, `monetaryZonesView`, `jwsCertsView`, `serverCertsView`, `endpointsView`, `endpointsManage`).
- **`Dfsp`**: one object per DFSP (`Dfsp:<dfspId>`). Has `parent` (Hub) and `members` relations, and permits `view` / `manage` (members OR hub admins), `memberAccess` (members only, used by PM4ML JWT rules), `credentialsAccess` (members only).

Permission inheritance is expressed via OPL `permits` (e.g. `dfsp.view = members.includes(subject) || parent.admin`). No intermediate "role" or "permission" namespaces.

## How it's deployed

The file ships inside the MCM API Docker image. The Helm chart mounts the image as a Kubernetes `ImageVolume` into the Keto pod and exposes the single file via `subPath`:

```yaml
volumeMounts:
  - name: mcm-opl
    mountPath: /etc/keto-namespaces/mcm.ts
    subPath: opt/app/permissions/mcm.keto.ts
```

Keto loads the file at startup. Authorization checks are made via Keto's `/permissions/check` endpoint, invoked by Oathkeeper for each MCM request.

## Tuples written at runtime

MCM API writes these directly to Keto's write API:

| Tuple | Written when |
|---|---|
| `Hub:mojaloop#admins@User:<id>` | A user becomes a hub admin |
| `Dfsp:<id>#parent@Hub:mojaloop` | A DFSP is created |
| `Dfsp:<id>#members@User:<id>` | A user is added to a DFSP |

PM4ML machine clients use their Hydra `client_id` as the subject (same `User:` namespace).

## Adding a new permission

1. Add the permit to the relevant namespace in `mcm.keto.ts`.
2. Add a corresponding Oathkeeper rule in `mojaloop/helm` (`connection-manager/templates/iam/oathkeeper-rules.yaml`) that checks the new permit.
3. Cut a new MCM API release. The OPL ships in the image; Helm references the new image tag.

## References

- [Ory Permission Language](https://www.ory.sh/docs/keto/reference/ory-permission-language)
- [OPL examples in Keto repo](https://github.com/ory/keto/tree/master/contrib/rewrites-example)
- [Zanzibar paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/): the model OPL is based on
