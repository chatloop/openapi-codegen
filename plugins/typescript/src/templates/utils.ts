import {
  clientErrorStatus,
  serverErrorStatus,
} from "../core/getErrorResponseType";

export const getUtils = () =>
  `import { TAnyKeyValueObject, TJsonApiData } from 'jsona/lib/JsonaTypes'
import { InfiniteData } from '@tanstack/react-query'
import { Jsona } from 'jsona'

type ComputeRange<
 N extends number,
 Result extends Array<unknown> = []
> = Result["length"] extends N
 ? Result
 : ComputeRange<N, [...Result, Result["length"]]>;

export type ${clientErrorStatus} = Exclude<ComputeRange<500>[number], ComputeRange<400>[number]>;
export type ${serverErrorStatus} = Exclude<ComputeRange<600>[number], ComputeRange<500>[number]>;

/**
 * Extract the element of an array that also works for array union.
 *
 * Returns \`never\` if T is not an array.
 * 
 * It creates a type-safe way to access the element type of \`unknown\` type.
 */
export type ArrayElement<T> = T extends readonly unknown[] ? T[0] : never

/** Find first match of multiple keys */
export type FilterKeys<Obj, Matchers> = Obj[keyof Obj & Matchers]

/** Get the type of a value of an input object with a given key. If the key is not found, return a default type. Works with unions of objects too. */
export type GetValueWithDefault<Obj, KeyPattern, Default> = Obj extends any
  ? FilterKeys<Obj, KeyPattern> extends never
    ? Default
    : FilterKeys<Obj, KeyPattern>
  : never

/** remove a \`dot\` prefix from a string or string union */
export type StripPrefix<
  TPrefix extends string,
  T extends string
> = T extends \`\${TPrefix}.\${infer R}\` ? R : never

/** Find a \`dot\` prefix in a string or string union */
export type FindPrefix<
  prefix extends string,
  T extends string
> = T extends \`\${prefix}.\${string}\` ? prefix : never


export interface IResourceMap {
  [key: string]: TJsonApiData
}

/**
 * Get the \`data\` property (Resource Identifier(s)) of the \`Relationship\` in the \`Parent\` resource
 */
type RelationshipData<
  Relationship extends keyof Parent['relationships'],
  Parent extends TJsonApiData
> = GetValueWithDefault<Parent['relationships'][Relationship], 'data', never>

/**
 * Get the \`type\` property of the \`Relationship\`'s data (Resource Identifier(s)) in the \`Parent\` resource
 */
type RelationshipType<
  Relationship extends keyof Parent['relationships'],
  Parent extends TJsonApiData
> =
  GetValueWithDefault<
    RelationshipData<Relationship, Parent>,
    'type',
    never
  > extends string
    ? GetValueWithDefault<RelationshipData<Relationship, Parent>, 'type', never>
    : GetValueWithDefault<
        ArrayElement<RelationshipData<Relationship, Parent>>,
        'type',
        never
      >

/**
 * Get the Resource Schema of the related resource(s) for the \`Relationship\` in the \`Parent\` resource
 */
type RelatedResource<
  Relationship extends keyof Parent['relationships'],
  Parent extends TJsonApiData,
  TResourceMap extends IResourceMap
> =
  RelationshipType<Relationship, Parent> extends keyof TResourceMap
    ? TResourceMap[RelationshipType<Relationship, Parent>]
    : unknown

/**
 * Take a string union of \`Includes\` and reduce to only the keys of the \`Resource\`'s relationships
 * Will strip dot suffixes from the \`Includes\` in order to correctly infer the base relationships
 * e.g. 'onwReaction' | 'reactions.author' -> 'onwReaction' | 'reactions'
 */
type IncludesForResource<
  Included extends string,
  Resource extends TJsonApiData
> = Extract<
  | keyof {
      [Relationship in keyof Resource['relationships'] as FindPrefix<
        Relationship & string,
        Included
      >]: Relationship
    }
  | Included,
  keyof Resource['relationships']
>

/**
 * Take a string union of \`Includes\` and reduce to only the keys prefixed by the \`Relationship\`
 * e.g. for relationship "reactions":
 *    'onwReaction' | 'reactions.author' -> 'author'
 */
type IncludesForRelationship<
  Included extends string,
  Relationship extends string
> = StripPrefix<
  Extract<Relationship, string>,
  Extract<Included, \`\${Extract<Relationship, string>}.\${string}\`>
>

/**
 * The deserialized Resource for a \`Relationship\` in the \`Parent\` resource with appropriate \`Included\` relationships nested
 */
type DeserializedJsonApiRelationship<
  Resource extends TJsonApiData,
  Included extends string,
  Relationship extends keyof Resource['relationships'] & string,
  TResourceMap extends IResourceMap
> =
  RelatedResource<Relationship, Resource, TResourceMap> extends TJsonApiData
    ? DeserializedJsonApiResource<
        RelatedResource<Relationship, Resource, TResourceMap>,
        IncludesForRelationship<Included, Relationship>,
        TResourceMap
      >
    : never

/**
 * The deserialized Resource for a \`Resource\` with the appropriate \`Included\` relationships nested
 */
export type DeserializedJsonApiResource<
  Resource extends TJsonApiData,
  Included extends string,
  TResourceMap extends IResourceMap
> = {
  id: Resource['id']
  type: Resource['type']
  links?: Resource['links']
} & Required<Resource['attributes']> & {
    [Relationship in IncludesForResource<Included, Resource>]: RelatedResource<
      Relationship,
      Resource,
      TResourceMap
    > extends TJsonApiData
      ? GetValueWithDefault<
          GetValueWithDefault<
            Resource['relationships'][Relationship],
            'data',
            never
          >,
          'type',
          never
        > extends string
        ? DeserializedJsonApiRelationship<
            Resource,
            Included,
            Relationship,
            TResourceMap
          > | null
        : DeserializedJsonApiRelationship<
            Resource,
            Included,
            Relationship,
            TResourceMap
          >[]
      : unknown
  }

const jsona = new Jsona()

/**
 * Deserialize a JSON:API single resource response to a typed resource object with the included relationships nested
 */
export const deserializeResource = <
  Resource extends keyof TResourceMap,
  Included extends string,
  TResourceMap extends IResourceMap
>(data?: {
  data: TResourceMap[Resource]
  included?: TJsonApiData[]
}): DeserializedJsonApiResource<
  TResourceMap[Resource],
  Included,
  TResourceMap
>|undefined => {
  return data !== undefined ? jsona.deserialize(data) as unknown as DeserializedJsonApiResource<
    TResourceMap[Resource],
    Included,
    TResourceMap
  > : undefined
}

/**
 * Deserialize a JSON:API resource collection response to an array of typed resource objects with the included relationships nested
 * @param data
 */
export const deserializeResourceCollection = <
  Resource extends keyof TResourceMap,
  Included extends string,
  TResourceMap extends IResourceMap
>(data: {
  data: TResourceMap[Resource][]
  included?: TJsonApiData[]
}): DeserializedJsonApiResource<
  TResourceMap[Resource],
  Included,
  TResourceMap
>[] => {
  return jsona.deserialize(
    data
  ) as unknown as DeserializedJsonApiResource<
    TResourceMap[Resource],
    Included,
    TResourceMap
  >[]
}

/**
 * Deserialize the pages from an useInfiniteQuery result to a single array of typed resource objects with the included relationships nested
 */
export const deserializeInfiniteResourceCollection = <
  Resource extends keyof TResourceMap,
  Included extends string,
  TResourceMap extends IResourceMap
>(
  data: InfiniteData<{
    data: TResourceMap[Resource][]
    included?: TJsonApiData[]
  }>
): DeserializedJsonApiResource<
  TResourceMap[Resource],
  Included,
  TResourceMap
>[] => {
  return data.pages.flatMap(page => {
    return jsona.deserialize(page)
  }) as unknown as DeserializedJsonApiResource<
    TResourceMap[Resource],
    Included,
    TResourceMap
  >[]
}

export const serializeResource = <
  Resource extends string,
  TData extends TAnyKeyValueObject
>(
  type: Resource,
  data: TData
) => {
  return jsona.serialize({
    stuff: { type, ...data }
  }) as unknown as {
    data: { type: Resource; attributes: TData }
  }
}
`;
