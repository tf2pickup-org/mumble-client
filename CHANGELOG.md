

# [0.5.0](https://github.com/tf2pickup-org/mumble-client/compare/0.4.2...0.5.0) (2022-05-30)


### Bug Fixes

* add setSelfDeaf command ([#48](https://github.com/tf2pickup-org/mumble-client/issues/48)) ([e4c1ce7](https://github.com/tf2pickup-org/mumble-client/commit/e4c1ce70cedfa5bd7805ef2f5fbb71e202616bcd))
* add setSelfMute command ([#47](https://github.com/tf2pickup-org/mumble-client/issues/47)) ([fc88c95](https://github.com/tf2pickup-org/mumble-client/commit/fc88c954dc79beeb1ff31036a653f3a95d8248b2))
* send PermissionQuery only once ([#46](https://github.com/tf2pickup-org/mumble-client/issues/46)) ([943c72d](https://github.com/tf2pickup-org/mumble-client/commit/943c72d3cc1e317b2f30bee01223aab63ada684c))


### Features

* add ClientDisconnectedError ([#49](https://github.com/tf2pickup-org/mumble-client/issues/49)) ([24051bb](https://github.com/tf2pickup-org/mumble-client/commit/24051bbd6aed7a67b4fc57a8f72813bb47d39ed3))
* support client password and access tokens ([#50](https://github.com/tf2pickup-org/mumble-client/issues/50)) ([b224733](https://github.com/tf2pickup-org/mumble-client/commit/b224733ee1c6f596fd5cf896dea493edc844840f))

## [0.4.2](https://github.com/tf2pickup-org/mumble-client/compare/0.4.1...0.4.2) (2022-05-26)


### Bug Fixes

* better timeout handling ([#44](https://github.com/tf2pickup-org/mumble-client/issues/44)) ([f8c8590](https://github.com/tf2pickup-org/mumble-client/commit/f8c8590e123ed2660b3d55aaa8275c5c345e28c0))
* cache channel permissions ([#45](https://github.com/tf2pickup-org/mumble-client/issues/45)) ([cd4238c](https://github.com/tf2pickup-org/mumble-client/commit/cd4238c0f8a7a19698be0c4890437719e974815a))

## [0.4.1](https://github.com/tf2pickup-org/mumble-client/compare/0.4.0...0.4.1) (2022-05-25)


### Bug Fixes

* fix fetchChannelPermissions command timeout ([#42](https://github.com/tf2pickup-org/mumble-client/issues/42)) ([f6cd762](https://github.com/tf2pickup-org/mumble-client/commit/f6cd7629f18b45499916cf62f258d1f7c0483c4f))

# [0.4.0](https://github.com/tf2pickup-org/mumble-client/compare/0.3.6...0.4.0) (2022-05-25)


### Bug Fixes

* fix commands' error handling ([#39](https://github.com/tf2pickup-org/mumble-client/issues/39)) ([8cd80cf](https://github.com/tf2pickup-org/mumble-client/commit/8cd80cfcb88a725b9de82a124dc57e0d0868b464))


### Features

* support for client name & version ([#40](https://github.com/tf2pickup-org/mumble-client/issues/40)) ([8efb6da](https://github.com/tf2pickup-org/mumble-client/commit/8efb6da52c8139034245e02faef3486d882e769a))

## [0.3.6](https://github.com/tf2pickup-org/mumble-client/compare/0.3.5...0.3.6) (2022-05-24)


### Bug Fixes

* **build:** fix entry points ([#37](https://github.com/tf2pickup-org/mumble-client/issues/37)) ([504dd7a](https://github.com/tf2pickup-org/mumble-client/commit/504dd7a2624b4d774f592215de942d5d890680fd))

## [0.3.5](https://github.com/tf2pickup-org/mumble-client/compare/0.3.4...0.3.5) (2022-05-24)


### Bug Fixes

* fix packet type recognition ([#36](https://github.com/tf2pickup-org/mumble-client/issues/36)) ([138d8b0](https://github.com/tf2pickup-org/mumble-client/commit/138d8b0f45cdaebd958c0180b0db27ede1a71492))
* use mumble-protocol dependency ([#35](https://github.com/tf2pickup-org/mumble-client/issues/35)) ([0d3cce8](https://github.com/tf2pickup-org/mumble-client/commit/0d3cce8efdcb821c9252322e366d56e28b077739))

## [0.3.4](https://github.com/tf2pickup-org/mumble-client/compare/0.3.3...0.3.4) (2022-05-22)


### Bug Fixes

* **deps:** remove unused dependencies ([#31](https://github.com/tf2pickup-org/mumble-client/issues/31)) ([d7ac929](https://github.com/tf2pickup-org/mumble-client/commit/d7ac9293b400924c68a0513c86f4473d361a736f))
* handle createChannel command timeout ([#30](https://github.com/tf2pickup-org/mumble-client/issues/30)) ([cc3524a](https://github.com/tf2pickup-org/mumble-client/commit/cc3524abac21a776eb659c7317c65a83d11c66c2))
* linkChannels command timeout ([#32](https://github.com/tf2pickup-org/mumble-client/issues/32)) ([49fb6ca](https://github.com/tf2pickup-org/mumble-client/commit/49fb6cabbc19ae251ea5b0b36bdbec574df20a36))

## [0.3.3](https://github.com/tf2pickup-org/mumble-client/compare/0.3.2...0.3.3) (2022-05-20)


### Bug Fixes

* handle moving to the same channel ([#27](https://github.com/tf2pickup-org/mumble-client/issues/27)) ([64ace1c](https://github.com/tf2pickup-org/mumble-client/commit/64ace1c929768ec2121692414c5d9947a67b9061))

## [0.3.2](https://github.com/tf2pickup-org/mumble-client/compare/0.3.1...0.3.2) (2022-05-19)


### Bug Fixes

* better PermissionDeniedError message ([#24](https://github.com/tf2pickup-org/mumble-client/issues/24)) ([7867025](https://github.com/tf2pickup-org/mumble-client/commit/78670254da2496182ec45a424efbab461ed78d1e))
* handle temporary channel property ([#25](https://github.com/tf2pickup-org/mumble-client/issues/25)) ([74be02c](https://github.com/tf2pickup-org/mumble-client/commit/74be02c67d4f48bb30d980be503f0c835ceb4219))

## [0.3.1](https://github.com/tf2pickup-org/mumble-client/compare/0.3.0...0.3.1) (2022-05-18)


### Bug Fixes

* add createChannel() command ([#20](https://github.com/tf2pickup-org/mumble-client/issues/20)) ([df568d0](https://github.com/tf2pickup-org/mumble-client/commit/df568d0e0dfd0ca9cbf0ab5b4b9a35d8aed781a2))
* get rid of lodash dependency ([#19](https://github.com/tf2pickup-org/mumble-client/issues/19)) ([1b94600](https://github.com/tf2pickup-org/mumble-client/commit/1b9460021713cd8d3f401b2caa39a1bbfaf551fe))
* ignore UDPTunnel packets ([#22](https://github.com/tf2pickup-org/mumble-client/issues/22)) ([8367b2d](https://github.com/tf2pickup-org/mumble-client/commit/8367b2d8cb4d64b2b653b2592bd7d0fe824c5b26))

# [0.3.0](https://github.com/tf2pickup-org/mumble-client/compare/0.2.1...0.3.0) (2022-05-16)


### Bug Fixes

* **deps:** update dependency @protobuf-ts/runtime to v2.6.0 ([#15](https://github.com/tf2pickup-org/mumble-client/issues/15)) ([3d43924](https://github.com/tf2pickup-org/mumble-client/commit/3d439248610561d484d0aca238677b84e6df90cb))
* replace ts-proto with protobuf-ts ([#13](https://github.com/tf2pickup-org/mumble-client/issues/13)) ([783c864](https://github.com/tf2pickup-org/mumble-client/commit/783c864034d344e8456fa95ba3a1686bb97667d9))
* **types:** export errors ([#16](https://github.com/tf2pickup-org/mumble-client/issues/16)) ([b66ea29](https://github.com/tf2pickup-org/mumble-client/commit/b66ea2967a4b27482db37de9b29ce6606e9f865c))


### Features

* link channels ([#17](https://github.com/tf2pickup-org/mumble-client/issues/17)) ([44c6ee9](https://github.com/tf2pickup-org/mumble-client/commit/44c6ee90cf70eb971701722e3d60cbcf4be81f96))

## [0.2.1](https://github.com/tf2pickup-org/mumble-client/compare/0.2.0...0.2.1) (2022-05-16)


### Bug Fixes

* fix selfMute and selfDeaf states ([#10](https://github.com/tf2pickup-org/mumble-client/issues/10)) ([985b8ee](https://github.com/tf2pickup-org/mumble-client/commit/985b8ee508ccc37cf9b1b9bb4c645da3e632e3ee))
* remove tsc-alias from dependencies ([#11](https://github.com/tf2pickup-org/mumble-client/issues/11)) ([6ab5966](https://github.com/tf2pickup-org/mumble-client/commit/6ab5966d36cab8ab574790d777441d3957fd1af5))

# [0.2.0](https://github.com/tf2pickup-org/mumble-client/compare/0.1.5...0.2.0) (2022-05-15)


### Bug Fixes

* handle rejected connection gracefully ([#9](https://github.com/tf2pickup-org/mumble-client/issues/9)) ([0052724](https://github.com/tf2pickup-org/mumble-client/commit/00527242c4022e4be9e3b0d8e0d24a3a8c0b9c0d))


### Features

* list channel subchannels ([#8](https://github.com/tf2pickup-org/mumble-client/issues/8)) ([ba676ee](https://github.com/tf2pickup-org/mumble-client/commit/ba676eeb7da1d009ddef7b104e6e466db6a264b3))

## [0.1.5](https://github.com/tf2pickup-org/mumble-client/compare/0.1.4...0.1.5) (2022-05-13)


### Bug Fixes

* respect channel permissions ([#7](https://github.com/tf2pickup-org/mumble-client/issues/7)) ([e69960c](https://github.com/tf2pickup-org/mumble-client/commit/e69960cb530fdc6ef496727be3ddb58fe83dc64b))

## [0.1.4](https://github.com/tf2pickup-org/mumble-client/compare/0.1.3...0.1.4) (2022-05-12)


### Bug Fixes

* **build:** replace ts paths ([a679bb1](https://github.com/tf2pickup-org/mumble-client/commit/a679bb1ed5b0a45d421e887048661a7dd885a934))

## [0.1.3](https://github.com/tf2pickup-org/mumble-client/compare/0.1.2...0.1.3) (2022-05-12)

## [0.1.2](https://github.com/tf2pickup-org/mumble-client/compare/0.1.1...0.1.2) (2022-05-12)

## [0.1.1](https://github.com/tf2pickup-org/mumble-client/compare/0.1.0...0.1.1) (2022-05-12)

# [0.1.0](https://github.com/tf2pickup-org/mumble-client/compare/0.0.1...0.1.0) (2022-05-12)


### Bug Fixes

* **ci:** release workflow ([3965bba](https://github.com/tf2pickup-org/mumble-client/commit/3965bba74333f9282fcc5bf0d88a366e73d8bc4b))


### Features

* add Client.disconnect() ([b530c0d](https://github.com/tf2pickup-org/mumble-client/commit/b530c0dc26e666eed311fbe3b1d122ebca03c257))

## 0.0.1 (2022-05-12)