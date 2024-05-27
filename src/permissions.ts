// https://github.com/mumble-voip/mumble/blob/096008ae00f130b0d660fce5a30948a032fb5eb8/src/ACL.h#L21

enum Permission {
  None = 0x0,
  Write = 0x1,
  Traverse = 0x2,
  Enter = 0x4,
  Speak = 0x8,
  MuteDeafen = 0x10,
  Move = 0x20,
  MakeChannel = 0x40,
  LinkChannel = 0x80,
  Whisper = 0x100,
  TextMessage = 0x200,
  MakeTempChannel = 0x400,
  Listen = 0x800,

  // Root channel only
  Kick = 0x10000,
  Ban = 0x20000,
  Register = 0x40000,
  SelfRegister = 0x80000,
  ResetUserContent = 0x100000,

  All = Write +
    Traverse +
    Enter +
    Speak +
    MuteDeafen +
    Move +
    MakeChannel +
    LinkChannel +
    Whisper +
    TextMessage +
    MakeTempChannel +
    Listen +
    Kick +
    Ban +
    Register +
    SelfRegister +
    ResetUserContent,
}

export class Permissions {
  static superUser(): Permissions {
    return new Permissions(
      // https://github.com/mumble-voip/mumble/blob/edd4588c8ae03d785d59102e2435151a682ec51d/src/ACL.cpp#L106
      Permission.All & ~(Permission.Speak | Permission.Whisper),
    );
  }

  constructor(public readonly permissions: number) {}

  get canJoinChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2517
    return !!(this.permissions & (Permission.Write | Permission.Enter));
  }

  get canCreateChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2519
    return !!(this.permissions & (Permission.Write | Permission.MakeChannel));
  }

  get canRemoveChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2520
    return !!(this.permissions & Permission.Write);
  }

  get canLinkChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2523
    return !!(this.permissions & (Permission.Write | Permission.LinkChannel));
  }

  get canSelfRegister(): boolean {
    // https://github.com/mumble-voip/mumble/blob/2fc30044b764c78f00315e8525bc34eb41c5a4da/src/mumble/MainWindow.cpp#L1569
    return !!(this.permissions & (Permission.SelfRegister | Permission.Write));
  }

  get canRegister(): boolean {
    // https://github.com/mumble-voip/mumble/blob/2fc30044b764c78f00315e8525bc34eb41c5a4da/src/mumble/MainWindow.cpp#L1717
    return !!(this.permissions & (Permission.Register | Permission.Write));
  }
}
