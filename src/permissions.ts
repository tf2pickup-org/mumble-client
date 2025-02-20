// https://github.com/mumble-voip/mumble/blob/096008ae00f130b0d660fce5a30948a032fb5eb8/src/ACL.h#L21

const write = 0x1;
const traverse = 0x2;
const enter = 0x4;
const speak = 0x8;
const muteDeafen = 0x10;
const move = 0x20;
const makeChannel = 0x40;
const linkChannel = 0x80;
const whisper = 0x100;
const textMessage = 0x200;
const makeTempChannel = 0x400;
const listen = 0x800;
const kick = 0x10000;
const ban = 0x20000;
const register = 0x40000;
const selfRegister = 0x80000;
const resetUserContent = 0x100000;

const all =
  write +
  traverse +
  enter +
  speak +
  muteDeafen +
  move +
  makeChannel +
  linkChannel +
  whisper +
  textMessage +
  makeTempChannel +
  listen +
  kick +
  ban +
  register +
  selfRegister +
  resetUserContent;

export class Permissions {
  static superUser(): Permissions {
    return new Permissions(
      // https://github.com/mumble-voip/mumble/blob/edd4588c8ae03d785d59102e2435151a682ec51d/src/ACL.cpp#L106
      all & ~(speak | whisper),
    );
  }

  constructor(public readonly permissions: number) {}

  get canJoinChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2517
    return !!(this.permissions & (write | enter));
  }

  get canCreateChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2519
    return !!(this.permissions & (write | makeChannel));
  }

  get canRemoveChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2520
    return !!(this.permissions & write);
  }

  get canLinkChannel(): boolean {
    // https://github.com/mumble-voip/mumble/blob/4f50172c5c8bc7c425efb350377106d3e83a7e79/src/mumble/MainWindow.cpp#L2523
    return !!(this.permissions & (write | linkChannel));
  }

  get canSelfRegister(): boolean {
    // https://github.com/mumble-voip/mumble/blob/2fc30044b764c78f00315e8525bc34eb41c5a4da/src/mumble/MainWindow.cpp#L1569
    return !!(this.permissions & (selfRegister | write));
  }

  get canRegister(): boolean {
    // https://github.com/mumble-voip/mumble/blob/2fc30044b764c78f00315e8525bc34eb41c5a4da/src/mumble/MainWindow.cpp#L1717
    return !!(this.permissions & (register | write));
  }
}
