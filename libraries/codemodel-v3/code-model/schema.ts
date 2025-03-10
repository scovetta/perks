/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExternalDocumentation, ImplementationDetails, LanguageDetails } from './components';
import { Extensions } from './extensions';
import { DeepPartial, Dictionary, values } from '@microsoft.azure/codegen';
import { uid } from './uid';

export interface PropertyDetails extends ImplementationDetails {
  required: boolean;
  readOnly: boolean;
}

export interface EnumValue {
  value: any;
  description: string;
  name: string;
}

export interface EnumDetails {
  modelAsString: boolean;
  values: Array<EnumValue>;
  name: string;
}

export enum Purpose {
  Header = 'Header',
}

export interface VirtualProperty {
  /** The property that this represents */
  property: Property;

  /** The things that went into building the name */
  nameComponents: Array<string>

  /** Names To use in priority order */
  nameOptions: Array<string>;

  /** the name of this virtual property */
  name: string;

  /** the member that should be called to get to the virtual property. (may be recursive) */
  accessViaProperty?: VirtualProperty;

  accessViaMember?: VirtualProperty;

  /** the member's schema */
  accessViaSchema?: Schema;

  originalContainingSchema: Schema;

  private?: boolean;

  alias: Array<string>;

  description: string;

  format?: PropertyFormat;

  required: boolean;
}


interface PropertyFormat {
  suppressFormat?: boolean;
  index?: number;
  width?: number;
  label?: string;
}

export interface VirtualProperties {
  owned: Array<VirtualProperty>;
  inherited: Array<VirtualProperty>;
  inlined: Array<VirtualProperty>;
}

export interface SchemaDetails extends ImplementationDetails {
  /** namespace of the implementation of this item */
  namespace?: string;

  enum?: EnumDetails;
  purpose?: Purpose;
  virtualProperties?: VirtualProperties;

  /** if this is a child of a polymorphic class, this will have the value of the descriminator.  */
  discriminatorValue?: string;

  suppressFormat?: boolean;
}

export class Schema extends Extensions implements Schema {
  public details: LanguageDetails<SchemaDetails>;
  public required = new Array<string>();
  public enum = new Array<any>();
  public allOf = new Array<Schema>();
  public oneOf = new Array<Schema>();
  public anyOf = new Array<Schema>();
  public properties = new Dictionary<Property>();
  public extensions = new Dictionary<any>();

  constructor(name: string, initializer?: DeepPartial<Schema>) {
    super();
    this.details = {
      default: {
        uid: `schema:${uid()}`,
        description: '',
        name
      }
    };
    this.apply(initializer);
  }
}

export function getPolymorphicBases(schema: Schema): Array<Schema> {
  // are any of my parents polymorphic directly, or any of their parents?
  return [...values(schema.allOf).linq.where(parent => parent.discriminator ? true : false), ...values(schema.allOf).linq.selectMany(getPolymorphicBases)];
}

export function getAllProperties(schema: Schema): Array<Property> {
  return [...values(schema.allOf).linq.selectMany(getAllProperties), ...values(schema.properties)];
}

export function getAllPublicVirtualProperties(virtualProperties?: VirtualProperties): Array<VirtualProperty> {
  const props = virtualProperties || {
    owned: [],
    inherited: [],
    inlined: []
  };

  return [...values([...props.owned, ...props.inherited, ...props.inlined]).linq.where(each => !each.private)]
}

export function getAllVirtualProperties(virtualProperties?: VirtualProperties): Array<VirtualProperty> {
  const props = virtualProperties || {
    owned: [],
    inherited: [],
    inlined: []
  };

  return [...values([...props.owned, ...props.inherited, ...props.inlined])];
}

export function getVirtualPropertyFromPropertyName(virtualProperties: VirtualProperties | undefined, propertyName: string): VirtualProperty | undefined {
  const props = virtualProperties || {
    owned: [],
    inherited: [],
    inlined: []
  };
  return values([...props.owned, ...props.inherited, ...props.inlined]).linq.first(each => each.property.serializedName === propertyName);
}


export interface Property extends Extensions {
  details: LanguageDetails<PropertyDetails>;

  /** description can be on the property reference, so that properties can have a description different from the type description. */
  description?: string;

  schema: Schema;
}

export class Property extends Extensions implements Property {
  public serializedName: string;
  public details: LanguageDetails<PropertyDetails>;
  public extensions = new Dictionary<any>();

  constructor(name: string, initializer?: Partial<Property>) {
    super();
    this.serializedName = name;
    this.details = {
      default: {
        readOnly: false,
        uid: `property:${uid()}`,
        description: 'MISSING DESCRIPTION 03',
        name,
        required: false
      }
    };
    this.apply(initializer);
  }
}

export class Discriminator extends Extensions implements Discriminator {
  public extensions = new Dictionary<any>();
  public mapping = new Dictionary<string>();

  constructor(public propertyName: string, initializer?: Partial<Discriminator>) {
    super();
    this.apply(initializer);
  }
}

export interface Discriminator extends Extensions {
  propertyName: string;
  mapping: Dictionary<string>;
}

export enum JsonType {
  Array = 'array',
  Boolean = 'boolean',
  Integer = 'integer',
  Number = 'number',
  Object = 'object',
  String = 'string'
}

export function isJsonType(type: JsonType, schema?: Schema): schema is Schema {
  return schema ? schema.type === type : false;
}

export function isSchemaObject(schema?: Schema): schema is Schema {
  return isJsonType(JsonType.Object, schema);
}

export class XML extends Extensions implements XML {
  public extensions = new Dictionary<any>();
  public attribute = false;
  public wrapped = false;

  constructor(initializer?: Partial<XML>) {
    super();
    this.apply(initializer);
  }
}

export interface XML extends Extensions {
  name?: string;
  namespace?: string; // url
  prefix?: string;
  attribute: boolean;
  wrapped: boolean;
}

export interface Schema extends Extensions {

  details: LanguageDetails<SchemaDetails>;

  /* common properties */
  type?: JsonType;
  title?: string;
  description?: string;
  format?: string;
  nullable: boolean;
  readOnly: boolean;
  writeOnly: boolean;
  deprecated: boolean;
  required: Array<string>;

  /* number restrictions */
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;

  /* string restrictions */
  maxLength?: number;
  minLength?: number;
  pattern?: string; // regex

  /* array restrictions */
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;

  /* object restrictions */
  maxProperties?: number;
  minProperties?: number;

  /* unbounded properties */
  example?: any;
  default?: any;

  /* Properties that are objects */
  discriminator?: Discriminator;
  externalDocs?: ExternalDocumentation;
  xml?: XML;

  /* Properties that are collections of things that are not references */
  enum: Array<any>;

  /* properties with potential references */
  not?: Schema;
  allOf: Array<Schema>;
  oneOf: Array<Schema>;
  anyOf: Array<Schema>;
  items?: Schema;
  properties: Dictionary<Property>;
  additionalProperties?: boolean | Schema;
}
