import { ACL } from '@tf2pickup-org/mumble-protocol';

/**
 * A channel's access control list.
 */
export interface Acl {
  /**
   * Whether the channel inherits ACL entries from its parent.
   */
  inheritAcls: boolean;
  groups: AclGroup[];
  entries: AclEntry[];
}

export interface AclGroup {
  name: string;
  /**
   * Whether the group is defined on a parent channel.
   */
  inherited: boolean;
  /**
   * Whether the group inherits members from the parent channel's group of the same name.
   */
  inherit: boolean;
  /**
   * Whether sub-channels can inherit this group.
   */
  inheritable: boolean;
  /**
   * User ids added to the group on this channel.
   */
  add: number[];
  /**
   * User ids removed from the group on this channel.
   */
  remove: number[];
  /**
   * User ids the group inherits from parent channels.
   */
  inheritedMembers: number[];
}

/**
 * Grants and denies permissions to a single user or a group.
 */
export interface AclEntry {
  applyHere: boolean;
  applySubs: boolean;
  /**
   * Whether the entry is defined on a parent channel.
   */
  inherited: boolean;
  userId?: number;
  group?: string;
  /**
   * Bitmask of granted permissions.
   */
  grant: number;
  /**
   * Bitmask of denied permissions.
   */
  deny: number;
}

// defaults follow Mumble.proto
export function fromProtocolAcl(acl: ACL): Acl {
  return {
    inheritAcls: acl.inheritAcls ?? true,
    groups: acl.groups.map(group => ({
      name: group.name,
      inherited: group.inherited ?? true,
      inherit: group.inherit ?? true,
      inheritable: group.inheritable ?? true,
      add: [...group.add],
      remove: [...group.remove],
      inheritedMembers: [...group.inheritedMembers],
    })),
    entries: acl.acls.map(entry => ({
      ...entry,
      applyHere: entry.applyHere ?? true,
      applySubs: entry.applySubs ?? true,
      inherited: entry.inherited ?? true,
      grant: entry.grant ?? 0,
      deny: entry.deny ?? 0,
    })),
  };
}

export function toProtocolAcl(channelId: number, acl: Acl): ACL {
  return ACL.create({
    channelId,
    inheritAcls: acl.inheritAcls,
    groups: acl.groups.map(group => ({ ...group })),
    acls: acl.entries.map(entry => ({ ...entry })),
  });
}
