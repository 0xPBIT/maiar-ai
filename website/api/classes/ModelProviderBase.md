[@maiar-ai/core](../index.md) / ModelProviderBase

# Class: `abstract` ModelProviderBase

Defined in: [packages/core/src/models/base.ts:67](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L67)

Base class for model providers

## Extended by

- [`LoggingModelDecorator`](LoggingModelDecorator.md)

## Implements

- [`ModelProvider`](../interfaces/ModelProvider.md)

## Constructors

### new ModelProviderBase()

> **new ModelProviderBase**(`id`, `name`, `description`): [`ModelProviderBase`](ModelProviderBase.md)

Defined in: [packages/core/src/models/base.ts:73](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L73)

#### Parameters

##### id

`string`

##### name

`string`

##### description

`string`

#### Returns

[`ModelProviderBase`](ModelProviderBase.md)

## Properties

### id

> `readonly` **id**: `string`

Defined in: [packages/core/src/models/base.ts:68](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L68)

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`id`](../interfaces/ModelProvider.md#id)

***

### name

> `readonly` **name**: `string`

Defined in: [packages/core/src/models/base.ts:69](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L69)

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`name`](../interfaces/ModelProvider.md#name)

***

### description

> `readonly` **description**: `string`

Defined in: [packages/core/src/models/base.ts:70](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L70)

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`description`](../interfaces/ModelProvider.md#description)

***

### capabilities

> `readonly` **capabilities**: `Map`\<`string`, `ModelCapability`\>

Defined in: [packages/core/src/models/base.ts:71](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L71)

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`capabilities`](../interfaces/ModelProvider.md#capabilities)

## Accessors

### monitor

#### Get Signature

> **get** `protected` **monitor**(): *typeof* [`MonitorService`](MonitorService.md)

Defined in: [packages/core/src/models/base.ts:83](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L83)

Get access to the monitor service

##### Returns

*typeof* [`MonitorService`](MonitorService.md)

## Methods

### addCapability()

> **addCapability**(`capability`): `void`

Defined in: [packages/core/src/models/base.ts:87](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L87)

Add a capability to the model

#### Parameters

##### capability

`ModelCapability`

#### Returns

`void`

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`addCapability`](../interfaces/ModelProvider.md#addcapability)

***

### getCapability()

> **getCapability**\<`I`, `O`\>(`capabilityId`): `undefined` \| `ModelCapability`\<`I`, `O`\>

Defined in: [packages/core/src/models/base.ts:91](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L91)

Get a specific capability instance

#### Type Parameters

• **I**

• **O**

#### Parameters

##### capabilityId

`string`

#### Returns

`undefined` \| `ModelCapability`\<`I`, `O`\>

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`getCapability`](../interfaces/ModelProvider.md#getcapability)

***

### getCapabilities()

> **getCapabilities**(): `ModelCapability`[]

Defined in: [packages/core/src/models/base.ts:99](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L99)

Get all capabilities supported by this model

#### Returns

`ModelCapability`[]

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`getCapabilities`](../interfaces/ModelProvider.md#getcapabilities)

***

### hasCapability()

> **hasCapability**(`capabilityId`): `boolean`

Defined in: [packages/core/src/models/base.ts:103](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L103)

Check if the model supports a specific capability

#### Parameters

##### capabilityId

`string`

#### Returns

`boolean`

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`hasCapability`](../interfaces/ModelProvider.md#hascapability)

***

### executeCapability()

> **executeCapability**\<`K`\>(`capabilityId`, `input`, `config`?): `Promise`\<[`ICapabilities`](../interfaces/ICapabilities.md)\[`K`\]\[`"output"`\]\>

Defined in: [packages/core/src/models/base.ts:107](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L107)

Execute a capability

#### Type Parameters

• **K** *extends* `"text-generation"`

#### Parameters

##### capabilityId

`K`

##### input

[`ICapabilities`](../interfaces/ICapabilities.md)\[`K`\]\[`"input"`\]

##### config?

[`ModelRequestConfig`](../interfaces/ModelRequestConfig.md)

#### Returns

`Promise`\<[`ICapabilities`](../interfaces/ICapabilities.md)\[`K`\]\[`"output"`\]\>

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`executeCapability`](../interfaces/ModelProvider.md#executecapability)

***

### checkHealth()

> `abstract` **checkHealth**(): `Promise`\<`void`\>

Defined in: [packages/core/src/models/base.ts:123](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/models/base.ts#L123)

Check model health

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ModelProvider`](../interfaces/ModelProvider.md).[`checkHealth`](../interfaces/ModelProvider.md#checkhealth)
