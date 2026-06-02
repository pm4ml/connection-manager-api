storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address     = "0.0.0.0:8233"
  tls_disable = 1
}

# mlock is disabled so the container runs as the non-root vault user without
# needing setcap; IPC_LOCK is still required by the kernel to exec the
# file-capability-tagged vault binary.
disable_mlock     = true
default_lease_ttl = "168h"
max_lease_ttl     = "720h"
ui                = true
