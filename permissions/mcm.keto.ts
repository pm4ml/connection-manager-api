import { Namespace, Context } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Hub implements Namespace {
  related: {
    admins: User[]
  }

  permits = {
    admin:             (ctx: Context): boolean => this.related.admins.includes(ctx.subject),
    dfspList:          (ctx: Context): boolean => this.permits.admin(ctx),
    dfspManage:        (ctx: Context): boolean => this.permits.admin(ctx),
    monetaryZonesView: (ctx: Context): boolean => this.permits.admin(ctx),
    jwsCertsView:      (ctx: Context): boolean => this.permits.admin(ctx),
    serverCertsView:   (ctx: Context): boolean => this.permits.admin(ctx),
    endpointsView:     (ctx: Context): boolean => this.permits.admin(ctx),
    endpointsManage:   (ctx: Context): boolean => this.permits.admin(ctx),
  }
}

class Dfsp implements Namespace {
  related: {
    parent: Hub[]
    members: User[]
  }

  permits = {
    view: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject) ||
      this.related.parent.traverse((h) => h.permits.admin(ctx)),

    manage: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject) ||
      this.related.parent.traverse((h) => h.permits.admin(ctx)),

    memberAccess: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject),

    credentialsAccess: (ctx: Context): boolean =>
      this.related.members.includes(ctx.subject),
  }
}
