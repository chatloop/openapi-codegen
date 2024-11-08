# Changelog

## [9.6.5](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.6.4...openapi-codegen-typescript-v9.6.5) (2024-11-07)


### Bug Fixes

* fix types in templated context and fetcher ([33b8036](https://github.com/chatloop/openapi-codegen/commit/33b8036762eb81b07ea8459415fea07c72b86f08))

## [9.6.4](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.6.3...openapi-codegen-typescript-v9.6.4) (2024-08-19)


### Bug Fixes

* fix string enum keys for values with spaces ([0d51675](https://github.com/chatloop/openapi-codegen/commit/0d516755b969e2f60ad8796ab6abc1e9a596a483))

## [9.6.3](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.6.2...openapi-codegen-typescript-v9.6.3) (2024-07-26)


### Bug Fixes

* extract union type Nodes too so we have a common identifier ([6dc45db](https://github.com/chatloop/openapi-codegen/commit/6dc45dbe143b74079100676806424da34cc0baa1))

## [9.6.2](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.6.1...openapi-codegen-typescript-v9.6.2) (2024-07-26)


### Bug Fixes

* correctly type response when there is a 204 in addition to another 2xx response ([82a7fba](https://github.com/chatloop/openapi-codegen/commit/82a7fba13a64c56b783a3a1c355035b04217c55b))

## [9.6.1](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.6.0...openapi-codegen-typescript-v9.6.1) (2024-07-23)


### Bug Fixes

* inline resource schema cannot be mapped to operations ([517b62b](https://github.com/chatloop/openapi-codegen/commit/517b62bf5210752b9cd9f89b6ea4d22e222be7b9))

## [9.6.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.5.0...openapi-codegen-typescript-v9.6.0) (2024-07-08)


### Features

* add meta to deserialised resource ([2161408](https://github.com/chatloop/openapi-codegen/commit/216140890c8dcbea14feb9bb6e218c71b3230681))
* add withCount support to json:api resource deserialisation ([1f0e47f](https://github.com/chatloop/openapi-codegen/commit/1f0e47fc7beb5f43496666c86f479f6ddcdb7b36))

## [9.5.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.4.3...openapi-codegen-typescript-v9.5.0) (2024-07-05)


### Features

* add meta to deserialised resource type ([9d9dea0](https://github.com/chatloop/openapi-codegen/commit/9d9dea0af1442ff4da2d6574910da26d753b789a))

## [9.4.3](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.4.2...openapi-codegen-typescript-v9.4.3) (2024-06-18)


### Bug Fixes

* json api resource objects should not require `attributes` to be defined, one of `attributes`, `links` or `relationships` must be defined in order to differentiate from a resource identifier object however ([c4ce28b](https://github.com/chatloop/openapi-codegen/commit/c4ce28bb6e59bb6c77e36de61aad6b98ae09a970))

## [9.4.2](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.4.1...openapi-codegen-typescript-v9.4.2) (2024-06-10)


### Bug Fixes

* fix typo ([727d717](https://github.com/chatloop/openapi-codegen/commit/727d717dc27b6e03ed3ec8a613dcaa77c3679fa7))

## [9.4.1](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.4.0...openapi-codegen-typescript-v9.4.1) (2024-06-10)


### Bug Fixes

* fix types ([cf97d8c](https://github.com/chatloop/openapi-codegen/commit/cf97d8cd8f6f04dce0a30a0480d013a939a68775))

## [9.4.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.3.0...openapi-codegen-typescript-v9.4.0) (2024-06-10)


### Features

* add selectTotal util selector ([68383ec](https://github.com/chatloop/openapi-codegen/commit/68383eca519c131dd1d6a3d93cd237f4246e6708))

## [9.3.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.2.0...openapi-codegen-typescript-v9.3.0) (2024-06-10)


### Features

* allow select option on resource hooks ([e487839](https://github.com/chatloop/openapi-codegen/commit/e4878397b084edf1188bbbaaa88d979428d86250))

## [9.2.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.1.4...openapi-codegen-typescript-v9.2.0) (2024-06-10)


### Features

* allow select option on resource hooks ([f757b0c](https://github.com/chatloop/openapi-codegen/commit/f757b0cf1913fb0e4a4c8c4ebaabe84e31f33846))

## [9.1.4](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.1.3...openapi-codegen-typescript-v9.1.4) (2024-06-06)


### Bug Fixes

* deserialized resource toOne relationships should only be nullable if the spec says they are ([df8a0cc](https://github.com/chatloop/openapi-codegen/commit/df8a0cc6acec28b3c2d88bdc6ad67c6fc3df2fdb))

## [9.1.3](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.1.2...openapi-codegen-typescript-v9.1.3) (2024-06-04)


### Bug Fixes

* simplify resource useMutation hooks, add onMutate or onSuccess conditionaly based on operation verb and prevent overriding in hook options ([f260c34](https://github.com/chatloop/openapi-codegen/commit/f260c343e8ffdcd34f7b6f18723fe8b05e601090))

## [9.1.2](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.1.1...openapi-codegen-typescript-v9.1.2) (2024-06-04)


### Bug Fixes

* simplify resource useMutation hooks, dont alter variables type ([a82a244](https://github.com/chatloop/openapi-codegen/commit/a82a24480d3042f32bdbbe79bd38e409f324cc02))

## [9.1.1](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.1.0...openapi-codegen-typescript-v9.1.1) (2024-05-29)


### Bug Fixes

* correct context use in variables types for mutations ([ae39799](https://github.com/chatloop/openapi-codegen/commit/ae39799bb39dd4a0af676316f1d8b7825c6169ef))

## [9.1.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.0.2...openapi-codegen-typescript-v9.1.0) (2024-05-29)


### Features

* add useMutation json api hooks with behaviour for dynamic onMutate and onSuccess side effects via useMutationContext (can be used to invalid queries perform optimistic updates etc. ([19fbc25](https://github.com/chatloop/openapi-codegen/commit/19fbc258e62f6e5723fcd272c743e650845a1c59))

## [9.0.2](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.0.1...openapi-codegen-typescript-v9.0.2) (2024-05-23)


### Bug Fixes

* json api hook includes type default and make the inference conditional on the operation supporting includes ([6fcf832](https://github.com/chatloop/openapi-codegen/commit/6fcf8325099b4779d480fe726582fce71e68d31a))

## [9.0.1](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v9.0.0...openapi-codegen-typescript-v9.0.1) (2024-05-22)


### Bug Fixes

* fix numeric emum keys ([b5d9f5b](https://github.com/chatloop/openapi-codegen/commit/b5d9f5b398f0ef4455c66129489a34afdf585a0d))

## [9.0.0](https://github.com/chatloop/openapi-codegen/compare/openapi-codegen-typescript-v8.0.2...openapi-codegen-typescript-v9.0.0) (2024-05-22)


### ⚠ BREAKING CHANGES

* OpenApi 3.1 and Json:Api support ([#2](https://github.com/chatloop/openapi-codegen/issues/2))

### Features

* OpenApi 3.1 and Json:Api support ([#2](https://github.com/chatloop/openapi-codegen/issues/2)) ([1e07b52](https://github.com/chatloop/openapi-codegen/commit/1e07b5280414e926936bcc8d966fb4a4237c0974))

## [8.0.2](https://github.com/fabien0102/openapi-codegen/compare/typescript-v8.0.1...typescript-v8.0.2) (2024-04-29)


### Bug Fixes

* camelCase query function operationId ([93b6669](https://github.com/fabien0102/openapi-codegen/commit/93b6669997da806a2f7b6046e09a2b96e401f1f9))

## [8.0.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v8.0.0...typescript-v8.0.1) (2024-04-03)


### Bug Fixes

* update dependencies ([fbb85ae](https://github.com/fabien0102/openapi-codegen/commit/fbb85ae60e4956e0297daaf10172698724e6b863))

## [8.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v7.0.1...typescript-v8.0.0) (2023-11-01)


### ⚠ BREAKING CHANGES

* Add camelize to queryKeyFn path parameters ([#203](https://github.com/fabien0102/openapi-codegen/issues/203))

### Bug Fixes

* Add camelize to queryKeyFn path parameters ([#203](https://github.com/fabien0102/openapi-codegen/issues/203)) ([a24d31b](https://github.com/fabien0102/openapi-codegen/commit/a24d31b721f629f5b5da2c284be61341a5ba616f))

## [7.0.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v7.0.0...typescript-v7.0.1) (2023-09-17)


### Bug Fixes

* omit `initialData` to support tanstack-query v5 ([35a28b5](https://github.com/fabien0102/openapi-codegen/commit/35a28b5047ee4ee7e4c0975dec0060d831585a58))
* Parse dot case in path params ([#201](https://github.com/fabien0102/openapi-codegen/issues/201)) ([84b7928](https://github.com/fabien0102/openapi-codegen/commit/84b79284ee832070b08138e5585873124ce30150)), closes [#101](https://github.com/fabien0102/openapi-codegen/issues/101)

## [7.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.2.4...typescript-v7.0.0) (2023-07-02)


### ⚠ BREAKING CHANGES

* Support react-query v5 (use object signatures) #179

### Features

* Support react-query v5 (use object signatures) [#179](https://github.com/fabien0102/openapi-codegen/issues/179) ([e1076af](https://github.com/fabien0102/openapi-codegen/commit/e1076af6387c5eba15306e647bda051c80185164))

## [6.2.4](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.2.3...typescript-v6.2.4) (2023-05-10)


### Bug Fixes

* fix camelizedPathParams ([#172](https://github.com/fabien0102/openapi-codegen/issues/172)) ([53c7fd0](https://github.com/fabien0102/openapi-codegen/commit/53c7fd02ff28f913a16bb6ab583e36a1b399242c))

## [6.2.3](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.2.2...typescript-v6.2.3) (2023-05-09)


### Bug Fixes

* Fix path param regex ([#166](https://github.com/fabien0102/openapi-codegen/issues/166)) ([59bae62](https://github.com/fabien0102/openapi-codegen/commit/59bae62ce64f9652e4ab15021ed8e61624b69ccc))

## [6.2.2](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.2.1...typescript-v6.2.2) (2023-05-02)


### Bug Fixes

* Check that property is an object ([#162](https://github.com/fabien0102/openapi-codegen/issues/162)) ([76005e0](https://github.com/fabien0102/openapi-codegen/commit/76005e0c68e87efe5899e205ae63b7e55fb62eae))

## [6.2.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.2.0...typescript-v6.2.1) (2023-04-15)


### Bug Fixes

* [#157](https://github.com/fabien0102/openapi-codegen/issues/157) allOf w/ properties ([#158](https://github.com/fabien0102/openapi-codegen/issues/158)) ([9a39e52](https://github.com/fabien0102/openapi-codegen/commit/9a39e5244563b3f57b5be0c55c6e8fc514a5d6ad))

## [6.2.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.1.3...typescript-v6.2.0) (2023-04-12)


### Features

* enum support ([#153](https://github.com/fabien0102/openapi-codegen/issues/153)) ([aecaa73](https://github.com/fabien0102/openapi-codegen/commit/aecaa738280837256d669b21a1a3de1988b9607d))

## [6.1.3](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.1.2...typescript-v6.1.3) (2023-04-07)


### Bug Fixes

* Allow components to have dots in their names ([#151](https://github.com/fabien0102/openapi-codegen/issues/151)) ([c91200e](https://github.com/fabien0102/openapi-codegen/commit/c91200e7c714084bcb236e6f0862b74e03b3ba0f))

## [6.1.2](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.1.1...typescript-v6.1.2) (2023-03-14)


### Bug Fixes

* getReferenceSchema for names with '.' chars ([#141](https://github.com/fabien0102/openapi-codegen/issues/141)) ([865fcf6](https://github.com/fabien0102/openapi-codegen/commit/865fcf654c84ff798cdd063336ab6bf11c843fff))
* Support for nullable enums ([#146](https://github.com/fabien0102/openapi-codegen/issues/146)) ([151d47a](https://github.com/fabien0102/openapi-codegen/commit/151d47af08d43c8a0c94a244df8da3c4c40e6cd5))

## [6.1.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.1.0...typescript-v6.1.1) (2023-02-21)


### Bug Fixes

* Handle TypeScript breaking changes [#136](https://github.com/fabien0102/openapi-codegen/issues/136) ([#142](https://github.com/fabien0102/openapi-codegen/issues/142)) ([f05ab09](https://github.com/fabien0102/openapi-codegen/commit/f05ab09dfb451061ff234629206362293743bea9))

## [6.1.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v6.0.0...typescript-v6.1.0) (2022-12-23)


### Features

* Create Query Functions (eg. for react-router v6.4+) ([#122](https://github.com/fabien0102/openapi-codegen/issues/122)) ([5ff77ef](https://github.com/fabien0102/openapi-codegen/commit/5ff77ef55537036e0ce46b3cc89f391c9892c9f7))
* Support FormData in the TS fetcher generator ([#117](https://github.com/fabien0102/openapi-codegen/issues/117)) ([c51203d](https://github.com/fabien0102/openapi-codegen/commit/c51203d77d9fc1cd0414a63538f91c014f2e4841))


### Bug Fixes

* error return for fetcher ([#125](https://github.com/fabien0102/openapi-codegen/issues/125)) ([934ea0c](https://github.com/fabien0102/openapi-codegen/commit/934ea0cfcd7dbe78cec965a0b8437ec844b4429a))

## [6.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v5.2.1...typescript-v6.0.0) (2022-09-21)


### ⚠ BREAKING CHANGES

* Implement query cancellation in react-query generated components (#95)

### Features

* Implement query cancellation in react-query generated components ([#95](https://github.com/fabien0102/openapi-codegen/issues/95)) ([450b069](https://github.com/fabien0102/openapi-codegen/commit/450b0696073746615d61ab66a7f09de337139a00))

## [5.2.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v5.2.0...typescript-v5.2.1) (2022-09-08)


### Bug Fixes

* JSDoc generation ([#92](https://github.com/fabien0102/openapi-codegen/issues/92)) ([2dcfa87](https://github.com/fabien0102/openapi-codegen/commit/2dcfa87fa6285ba8e2b8963eb24e542e9f0d6f91))

## [5.2.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v5.1.0...typescript-v5.2.0) (2022-09-07)


### Features

* bump typescript & lerna versions ([#89](https://github.com/fabien0102/openapi-codegen/issues/89)) ([cf22aa1](https://github.com/fabien0102/openapi-codegen/commit/cf22aa1b999b86934ec907aa37dc53477ed0a3e2))

## [5.1.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v5.0.0...typescript-v5.1.0) (2022-08-30)


### Features

* added file upload and download support ([#84](https://github.com/fabien0102/openapi-codegen/issues/84)) ([3a15e0c](https://github.com/fabien0102/openapi-codegen/commit/3a15e0ceb55b8d93947d06b99b699f405af3d469))
* select support added for react-query components ([#83](https://github.com/fabien0102/openapi-codegen/issues/83)) ([01574bc](https://github.com/fabien0102/openapi-codegen/commit/01574bcb41694d11b928f7d1f3723777001b6b4a))

## [5.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v4.0.1...typescript-v5.0.0) (2022-08-02)


### ⚠ BREAKING CHANGES

* Update to react-query v4 (#77)

### Features

* Update to react-query v4 ([#77](https://github.com/fabien0102/openapi-codegen/issues/77)) ([a019e39](https://github.com/fabien0102/openapi-codegen/commit/a019e3936169e39109c5bd2cb5f3eb44d3d771f3))

### [4.0.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v4.0.0...typescript-v4.0.1) (2022-05-25)


### Bug Fixes

* Fix `gen --pr` command ([#71](https://github.com/fabien0102/openapi-codegen/issues/71)) ([bc9bed4](https://github.com/fabien0102/openapi-codegen/commit/bc9bed4dfad6820556709736db43357d657dbda2))

## [4.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v3.0.2...typescript-v4.0.0) (2022-05-18)


### ⚠ BREAKING CHANGES

* Improve error type safety (#63)

### Features

* Improve error type safety ([#63](https://github.com/fabien0102/openapi-codegen/issues/63)) ([d32d84a](https://github.com/fabien0102/openapi-codegen/commit/d32d84a566c52a2b0b7a97b6b240fdf4ca3facca))

### [3.0.2](https://github.com/fabien0102/openapi-codegen/compare/typescript-v3.0.1...typescript-v3.0.2) (2022-04-20)


### Bug Fixes

* Fix comment generation ([#58](https://github.com/fabien0102/openapi-codegen/issues/58)) ([f291a32](https://github.com/fabien0102/openapi-codegen/commit/f291a32bb6225d224e6f14089aef8313f50481a6))

### [3.0.1](https://github.com/fabien0102/openapi-codegen/compare/typescript-v3.0.0...typescript-v3.0.1) (2022-03-22)


### Bug Fixes

* permit `null` as body ([bdfa4b9](https://github.com/fabien0102/openapi-codegen/commit/bdfa4b9a6062b0b9ddd23f589d0d7acd88589961))
* remove spaces in fetcher template ([58f7741](https://github.com/fabien0102/openapi-codegen/commit/58f774161856afa9bc16eaba299114ce7de03833))

## [3.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v2.2.0...typescript-v3.0.0) (2022-03-21)


### ⚠ BREAKING CHANGES

* React query key cache manager (#49)

### Features

* Allow generating code without a prefix ([#50](https://github.com/fabien0102/openapi-codegen/issues/50)) ([cb4d68f](https://github.com/fabien0102/openapi-codegen/commit/cb4d68fcd52ce0a14ae1f378071fbc2a4e7d1877))
* React query key cache manager ([#49](https://github.com/fabien0102/openapi-codegen/issues/49)) ([4e30ddb](https://github.com/fabien0102/openapi-codegen/commit/4e30ddbbb0db14e5b9c1c54b441218481d8537f6))

## [2.2.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v2.1.0...typescript-v2.2.0) (2022-03-18)


### Features

* Add fetchers dictionary by tag ([#45](https://github.com/fabien0102/openapi-codegen/issues/45)) ([b2751d0](https://github.com/fabien0102/openapi-codegen/commit/b2751d03c23ccb841822eafb03d9e579d159dc41))


### Bug Fixes

* fix baseUrl in fetcherTemplate ([78b2a40](https://github.com/fabien0102/openapi-codegen/commit/78b2a4003bd9b960cdaf58db36ad205a503888a9))

## [2.1.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v2.0.0...typescript-v2.1.0) (2022-03-17)


### Features

* Add `init` command ([#44](https://github.com/fabien0102/openapi-codegen/issues/44)) ([2ccd5ec](https://github.com/fabien0102/openapi-codegen/commit/2ccd5ec45c4bc27908c45a16002afef04f92ed96))

## [2.0.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v1.4.0...typescript-v2.0.0) (2022-02-18)


### ⚠ BREAKING CHANGES

* Inject query options in context (#31)

### Features

* Inject query options in context ([#31](https://github.com/fabien0102/openapi-codegen/issues/31)) ([0a7fd6d](https://github.com/fabien0102/openapi-codegen/commit/0a7fd6d6b46132ae12df787edd4169bbec76dd81))

## [1.4.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v1.3.0...typescript-v1.4.0) (2022-01-27)


### Features

* Add support for flags in `gen` command ([#27](https://github.com/fabien0102/openapi-codegen/issues/27)) ([ec263c2](https://github.com/fabien0102/openapi-codegen/commit/ec263c2f55e4cc4fcb1bc427bf2c9fd1152f640d))

## [1.3.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v1.2.0...typescript-v1.3.0) (2022-01-20)


### Features

* [generateFetchers] Add extra props support ([#25](https://github.com/fabien0102/openapi-codegen/issues/25)) ([35fc219](https://github.com/fabien0102/openapi-codegen/commit/35fc219d9c644becdf38b0b3e38e1512d095d2d0))

## [1.2.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v1.1.0...typescript-v1.2.0) (2022-01-19)


### Features

* **typescript:** Improve generated fetcher names ([2aa1b4b](https://github.com/fabien0102/openapi-codegen/commit/2aa1b4b52628450172d39a68838f825c1bcd2a6d))

## [1.1.0](https://github.com/fabien0102/openapi-codegen/compare/typescript-v1.0.0...typescript-v1.1.0) (2022-01-19)


### Features

* generate fetchers only ([#22](https://github.com/fabien0102/openapi-codegen/issues/22)) ([b1d5c4a](https://github.com/fabien0102/openapi-codegen/commit/b1d5c4a6cc104904f4bc72777974973cdda7832d))

## 1.0.0 (2022-01-17)


### Features

* add react-query generator ([2ecbcf8](https://github.com/fabien0102/openapi-codegen/commit/2ecbcf8cb803163a57303ad9f8d39fcf36dc108c))
