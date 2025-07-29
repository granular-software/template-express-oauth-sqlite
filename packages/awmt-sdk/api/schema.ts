import { Observable } from 'graphql-typed-client'

export interface Query {
  model: Model | null
  models: Model[]
  prototypes: Model[]
  search_models: ModelSearchResult[]
  ask: Explaination[]
  explain: Explaination[]
  extract: Extraction[]
  __typename: 'Query'
}

/** The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text. */
export type String = string

export interface Model {
  path: String | null
  label: String | null
  description: String | null
  precursor: Model | null
  at: Model | null
  submodels: Model[]
  reference: Model | null
  reverse_references: Model[]
  prototypes: Model[]
  direct_prototypes: Model[]
  subclasses: Model[]
  direct_subclasses: Model[]
  superclasses: Model[]
  direct_superclasses: Model[]
  instances: Model[]
  direct_instances: Model[]
  unfilled_slots: Model[]
  if_has_class: Model | null
  features: Feature[]
  feature_prototype_targets: Model[]
  feature_targets: Model[]
  string_value: String | null
  number_value: Float | null
  boolean_value: Boolean | null
  submodel_templates: Model[]
  as: Interface | null
  interfaces: String[]
  interface_constraints: String[]
  constraints: Model[]
  if_interface: Model | null
  filter_prototypes: Feature[]
  feature_prototypes: Feature[]
  filters: Feature[]
  suggest_references: ModelSearchResult[]
  state: StateMachineSnapshot | null
  states: StateMachineSnapshot[]
  state_machine: StateMachine | null
  __typename: 'Model'
}

/** The `Boolean` scalar type represents `true` or `false`. */
export type Boolean = boolean

/** The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1. */
export type Int = number

/** The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](https://en.wikipedia.org/wiki/IEEE_floating_point). */
export type Float = number

export interface Feature {
  category: String | null
  abstraction_depth: Int | null
  model: Model | null
  __typename: 'Feature'
}

export interface Interface {
  ok: Boolean | null
  Date: Date | null
  Set: Set | null
  DataTable: DataTable | null
  __typename: 'Interface'
}

export interface Date {
  ms_timestamp: Float | null
  s_timestamp: Float | null
  get: String | null
  __typename: 'Date'
}

export interface Set {
  size: Int
  get_n: (Model | null)[] | null
  __typename: 'Set'
}

export interface DataTable {
  _todo: Boolean | null
  __typename: 'DataTable'
}

export interface ModelSearchResult {
  model: Model | null
  score: Float | null
  __typename: 'ModelSearchResult'
}

export interface StateMachineSnapshot {
  foo: String | null
  __typename: 'StateMachineSnapshot'
}

export interface StateMachine {
  foo: String | null
  __typename: 'StateMachine'
}

export interface Explaination {
  kind: FactKind | null
  label: String | null
  start: Model | null
  end: Model | null
  ambiguities: Ambiguity[]
  __typename: 'Explaination'
}

export enum FactKind {
  INSTANCE_OF = 'INSTANCE_OF',
  SUBCLASS_OF = 'SUBCLASS_OF',
  REFERENCE = 'REFERENCE',
  HAS_PROPERTY = 'HAS_PROPERTY',
  MODEL = 'MODEL',
}

export interface Ambiguity {
  path: String | null
  options: ModelSearchResult[]
  __typename: 'Ambiguity'
}

export interface Extraction {
  status: ExtractionStatus | null
  kind: FactKind | null
  label: String | null
  start: Model | null
  end: Model | null
  ambiguities: Ambiguity[]
  __typename: 'Extraction'
}

export enum ExtractionStatus {
  FOUND = 'FOUND',
  CREATED = 'CREATED',
  AMBIGUITY = 'AMBIGUITY',
}

export interface Mutation {
  create_model: ModelMutation | null
  at: ModelMutation | null
  _delete_everything: Boolean | null
  __typename: 'Mutation'
}

export interface ModelMutation {
  model: Model | null
  done: Boolean | null
  instantiate: ModelMutation | null
  extend: ModelMutation | null
  set_label: ModelMutation | null
  set_description: ModelMutation | null
  create_submodel: ModelMutation | null
  at: ModelMutation | null
  set_induction_threshold: Model | null
  suggest_induction: Model | null
  use_filter: ModelMutation | null
  remove_model: Boolean | null
  add_prototype: ModelMutation | null
  add_superclass: ModelMutation | null
  create_submodel_from_prototype: ModelMutation | null
  set_reference: ModelMutation | null
  remove_reference: ModelMutation | null
  set_string_value: ModelMutation | null
  set_number_value: ModelMutation | null
  set_boolean_value: ModelMutation | null
  remove_value: ModelMutation | null
  use_feature: ModelMutation | null
  use_existing_feature: ModelMutation | null
  add_interface_constraint: ModelMutation | null
  remove_interface_constraint: ModelMutation | null
  add_prototype_constraint: ModelMutation | null
  remove_prototype_constraint: ModelMutation | null
  as: MutationInterface | null
  create_state_machine: StateMachineMutation | null
  state: StateMachineSnapshotMutation | null
  state_machine: StateMachineMutation | null
  __typename: 'ModelMutation'
}

export interface MutationInterface {
  ok: Boolean | null
  DateMutation: DateMutation | null
  SetMutation: SetMutation | null
  DataTableMutation: DataTableMutation | null
  __typename: 'MutationInterface'
}

export interface DateMutation {
  set_now: Date | null
  set_timestamp: Date | null
  set: Date | null
  add_seconds: Date | null
  add_minutes: Date | null
  add_hours: Date | null
  add_days: Date | null
  add_months: Date | null
  add_years: Date | null
  __typename: 'DateMutation'
}

export interface SetMutation {
  create_element: Model
  __typename: 'SetMutation'
}

export interface DataTableMutation {
  _todo_mutation: Boolean | null
  __typename: 'DataTableMutation'
}

export interface StateMachineMutation {
  foo: String | null
  __typename: 'StateMachineMutation'
}

export interface StateMachineSnapshotMutation {
  foo: String | null
  __typename: 'StateMachineSnapshotMutation'
}

export interface FeatureSearchResult {
  feature: Feature | null
  score: Float | null
  __typename: 'FeatureSearchResult'
}

export interface StateSnapshot {
  foo: String | null
  __typename: 'StateSnapshot'
}

export interface QueryRequest {
  model?: [{ path?: String | null }, ModelRequest] | ModelRequest
  models?: [{ paths: String[] }, ModelRequest]
  prototypes?: ModelRequest
  search_models?: [{ query?: String | null }, ModelSearchResultRequest] | ModelSearchResultRequest
  ask?: [{ query?: String | null }, ExplainationRequest] | ExplainationRequest
  explain?: [{ query?: String | null }, ExplainationRequest] | ExplainationRequest
  extract?: [{ text?: String | null; models: String[] }, ExtractionRequest]
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface ModelRequest {
  path?: boolean | number
  label?: boolean | number
  description?: boolean | number
  precursor?: ModelRequest
  at?: [{ submodel?: String | null }, ModelRequest] | ModelRequest
  submodels?: ModelRequest
  reference?: ModelRequest
  reverse_references?: ModelRequest
  prototypes?: ModelRequest
  direct_prototypes?: ModelRequest
  subclasses?: ModelRequest
  direct_subclasses?: ModelRequest
  superclasses?: ModelRequest
  direct_superclasses?: ModelRequest
  instances?:
    | [
        {
          string_filters?: StringFilter[] | null
          number_filters?: NumberFilter[] | null
          boolean_filters?: BooleanFilter[] | null
          date_filters?: DateFilter[] | null
          reference_filters?: ReferenceFilter[] | null
        },
        ModelRequest,
      ]
    | ModelRequest
  direct_instances?:
    | [
        {
          string_filters?: StringFilter[] | null
          number_filters?: NumberFilter[] | null
          boolean_filters?: BooleanFilter[] | null
          date_filters?: DateFilter[] | null
          reference_filters?: ReferenceFilter[] | null
        },
        ModelRequest,
      ]
    | ModelRequest
  unfilled_slots?: ModelRequest
  if_has_class?: [{ name: String }, ModelRequest]
  features?: [{ category?: String | null }, FeatureRequest] | FeatureRequest
  feature_prototype_targets?: [{ category?: String | null }, ModelRequest] | ModelRequest
  feature_targets?: [{ category?: String | null; path_root?: String | null }, ModelRequest] | ModelRequest
  string_value?: [{ path?: String | null }] | boolean | number
  number_value?: [{ path?: String | null }] | boolean | number
  boolean_value?: [{ path?: String | null }] | boolean | number
  submodel_templates?: ModelRequest
  as?: InterfaceRequest
  interfaces?: boolean | number
  interface_constraints?: boolean | number
  constraints?: ModelRequest
  if_interface?: [{ interface: String }, ModelRequest]
  filter_prototypes?: FeatureRequest
  feature_prototypes?: [{ category?: String | null }, FeatureRequest] | FeatureRequest
  filters?: FeatureRequest
  suggest_references?: [{ query?: String | null }, ModelSearchResultRequest] | ModelSearchResultRequest
  state?: [{ name: String }, StateMachineSnapshotRequest]
  states?: StateMachineSnapshotRequest
  state_machine?: [{ name: String }, StateMachineRequest]
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface StringFilter {
  at: String
  not_null?: Boolean | null
  contains?: String | null
  not_contains?: String | null
  starts_with?: String | null
  ends_with?: String | null
  equal_to?: String | null
  length_greater_than?: Int | null
  length_less_than?: Int | null
}

export interface NumberFilter {
  at: String
  not_null?: Boolean | null
  greater_than?: Float | null
  less_than?: Float | null
  equal_to?: Float | null
}

export interface BooleanFilter {
  at: String
  null?: Boolean | null
  not_null?: Boolean | null
  equal_to?: Boolean | null
}

export interface DateFilter {
  at: String
  not_null?: Boolean | null
  null?: Boolean | null
  before_date?: Float | null
  after_date?: Float | null
  older_than_seconds?: Int | null
  newer_than_seconds?: Int | null
}

export interface ReferenceFilter {
  at: String
  null?: Boolean | null
  not_null?: Boolean | null
  is?: String | null
}

export interface FeatureRequest {
  category?: boolean | number
  abstraction_depth?: boolean | number
  model?: ModelRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface InterfaceRequest {
  ok?: boolean | number
  Date?: DateRequest
  Set?: SetRequest
  DataTable?: DataTableRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface DateRequest {
  ms_timestamp?: boolean | number
  s_timestamp?: boolean | number
  get?: [{ format: String }]
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface SetRequest {
  size?: boolean | number
  get_n?: [{ first_n?: Int | null }, ModelRequest] | ModelRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface DataTableRequest {
  _todo?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface ModelSearchResultRequest {
  model?: ModelRequest
  score?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface StateMachineSnapshotRequest {
  foo?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface StateMachineRequest {
  foo?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface ExplainationRequest {
  kind?: boolean | number
  label?: boolean | number
  start?: ModelRequest
  end?: ModelRequest
  ambiguities?: AmbiguityRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface AmbiguityRequest {
  path?: boolean | number
  options?: ModelSearchResultRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface ExtractionRequest {
  status?: boolean | number
  kind?: boolean | number
  label?: boolean | number
  start?: ModelRequest
  end?: ModelRequest
  ambiguities?: AmbiguityRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface MutationRequest {
  create_model?:
    | [{ path?: String | null; label?: String | null; prototype?: String | null }, ModelMutationRequest]
    | ModelMutationRequest
  at?: [{ path?: String | null }, ModelMutationRequest] | ModelMutationRequest
  _delete_everything?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface ModelMutationRequest {
  model?: ModelRequest
  done?: boolean | number
  instantiate?:
    | [{ path?: String | null; label?: String | null; prototype?: String | null }, ModelMutationRequest]
    | ModelMutationRequest
  extend?:
    | [{ path?: String | null; label?: String | null; prototype?: String | null }, ModelMutationRequest]
    | ModelMutationRequest
  set_label?: [{ label?: String | null }, ModelMutationRequest] | ModelMutationRequest
  set_description?: [{ description?: String | null }, ModelMutationRequest] | ModelMutationRequest
  create_submodel?:
    | [{ subpath?: String | null; label?: String | null; prototype?: String | null }, ModelMutationRequest]
    | ModelMutationRequest
  at?: [{ submodel?: String | null }, ModelMutationRequest] | ModelMutationRequest
  set_induction_threshold?: [{ minimal_support?: Float | null; absolute_support?: Int | null }, ModelRequest] | ModelRequest
  suggest_induction?: [{ minimal_support?: Float | null; absolute_support?: Int | null }, ModelRequest] | ModelRequest
  use_filter?: [{ feature: String }, ModelMutationRequest]
  remove_model?: boolean | number
  add_prototype?: [{ prototype: String }, ModelMutationRequest]
  add_superclass?: [{ superclass: String }, ModelMutationRequest]
  create_submodel_from_prototype?: [
    {
      prototype: String
      subpath?: String | null
      label?: String | null
      as_reference?: Boolean | null
      instantiate?: Boolean | null
      array?: Boolean | null
    },
    ModelMutationRequest,
  ]
  set_reference?: [{ reference?: String | null }, ModelMutationRequest] | ModelMutationRequest
  remove_reference?: ModelMutationRequest
  set_string_value?: [{ value?: String | null }, ModelMutationRequest] | ModelMutationRequest
  set_number_value?: [{ value?: Float | null }, ModelMutationRequest] | ModelMutationRequest
  set_boolean_value?: [{ value?: Boolean | null }, ModelMutationRequest] | ModelMutationRequest
  remove_value?: ModelMutationRequest
  use_feature?: [{ feature: String }, ModelMutationRequest]
  use_existing_feature?: [{ feature: String; kind: String }, ModelMutationRequest]
  add_interface_constraint?: [{ interface: String }, ModelMutationRequest]
  remove_interface_constraint?: [{ interface: String }, ModelMutationRequest]
  add_prototype_constraint?: [{ prototype: String; is_array?: Boolean | null }, ModelMutationRequest]
  remove_prototype_constraint?: [{ prototype: String }, ModelMutationRequest]
  as?: MutationInterfaceRequest
  create_state_machine?: [{ name: String; entry_state: String }, StateMachineMutationRequest]
  state?: [{ name: String }, StateMachineSnapshotMutationRequest]
  state_machine?: [{ name: String }, StateMachineMutationRequest]
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface MutationInterfaceRequest {
  ok?: boolean | number
  DateMutation?: DateMutationRequest
  SetMutation?: SetMutationRequest
  DataTableMutation?: DataTableMutationRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface DateMutationRequest {
  set_now?: DateRequest
  set_timestamp?: [{ timestamp: Float }, DateRequest]
  set?: [{ format: String; date: String }, DateRequest]
  add_seconds?: [{ seconds: Int }, DateRequest]
  add_minutes?: [{ minutes: Int }, DateRequest]
  add_hours?: [{ hours: Int }, DateRequest]
  add_days?: [{ days: Int }, DateRequest]
  add_months?: [{ months: Int }, DateRequest]
  add_years?: [{ years: Int }, DateRequest]
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface SetMutationRequest {
  create_element?: ModelRequest
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface DataTableMutationRequest {
  _todo_mutation?: [{ value: Boolean }]
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface StateMachineMutationRequest {
  foo?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface StateMachineSnapshotMutationRequest {
  foo?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface FeatureSearchResultRequest {
  feature?: FeatureRequest
  score?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

export interface ModelFilter {
  path?: String | null
}

export interface StateSnapshotRequest {
  foo?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

const Query_possibleTypes = ['Query']
export const isQuery = (obj: { __typename: String }): obj is Query => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Query_possibleTypes.includes(obj.__typename)
}

const Model_possibleTypes = ['Model']
export const isModel = (obj: { __typename: String }): obj is Model => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Model_possibleTypes.includes(obj.__typename)
}

const Feature_possibleTypes = ['Feature']
export const isFeature = (obj: { __typename: String }): obj is Feature => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Feature_possibleTypes.includes(obj.__typename)
}

const Interface_possibleTypes = ['Interface']
export const isInterface = (obj: { __typename: String }): obj is Interface => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Interface_possibleTypes.includes(obj.__typename)
}

const Date_possibleTypes = ['Date']
export const isDate = (obj: { __typename: String }): obj is Date => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Date_possibleTypes.includes(obj.__typename)
}

const Set_possibleTypes = ['Set']
export const isSet = (obj: { __typename: String }): obj is Set => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Set_possibleTypes.includes(obj.__typename)
}

const DataTable_possibleTypes = ['DataTable']
export const isDataTable = (obj: { __typename: String }): obj is DataTable => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return DataTable_possibleTypes.includes(obj.__typename)
}

const ModelSearchResult_possibleTypes = ['ModelSearchResult']
export const isModelSearchResult = (obj: { __typename: String }): obj is ModelSearchResult => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return ModelSearchResult_possibleTypes.includes(obj.__typename)
}

const StateMachineSnapshot_possibleTypes = ['StateMachineSnapshot']
export const isStateMachineSnapshot = (obj: { __typename: String }): obj is StateMachineSnapshot => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return StateMachineSnapshot_possibleTypes.includes(obj.__typename)
}

const StateMachine_possibleTypes = ['StateMachine']
export const isStateMachine = (obj: { __typename: String }): obj is StateMachine => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return StateMachine_possibleTypes.includes(obj.__typename)
}

const Explaination_possibleTypes = ['Explaination']
export const isExplaination = (obj: { __typename: String }): obj is Explaination => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Explaination_possibleTypes.includes(obj.__typename)
}

const Ambiguity_possibleTypes = ['Ambiguity']
export const isAmbiguity = (obj: { __typename: String }): obj is Ambiguity => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Ambiguity_possibleTypes.includes(obj.__typename)
}

const Extraction_possibleTypes = ['Extraction']
export const isExtraction = (obj: { __typename: String }): obj is Extraction => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Extraction_possibleTypes.includes(obj.__typename)
}

const Mutation_possibleTypes = ['Mutation']
export const isMutation = (obj: { __typename: String }): obj is Mutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return Mutation_possibleTypes.includes(obj.__typename)
}

const ModelMutation_possibleTypes = ['ModelMutation']
export const isModelMutation = (obj: { __typename: String }): obj is ModelMutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return ModelMutation_possibleTypes.includes(obj.__typename)
}

const MutationInterface_possibleTypes = ['MutationInterface']
export const isMutationInterface = (obj: { __typename: String }): obj is MutationInterface => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return MutationInterface_possibleTypes.includes(obj.__typename)
}

const DateMutation_possibleTypes = ['DateMutation']
export const isDateMutation = (obj: { __typename: String }): obj is DateMutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return DateMutation_possibleTypes.includes(obj.__typename)
}

const SetMutation_possibleTypes = ['SetMutation']
export const isSetMutation = (obj: { __typename: String }): obj is SetMutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return SetMutation_possibleTypes.includes(obj.__typename)
}

const DataTableMutation_possibleTypes = ['DataTableMutation']
export const isDataTableMutation = (obj: { __typename: String }): obj is DataTableMutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return DataTableMutation_possibleTypes.includes(obj.__typename)
}

const StateMachineMutation_possibleTypes = ['StateMachineMutation']
export const isStateMachineMutation = (obj: { __typename: String }): obj is StateMachineMutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return StateMachineMutation_possibleTypes.includes(obj.__typename)
}

const StateMachineSnapshotMutation_possibleTypes = ['StateMachineSnapshotMutation']
export const isStateMachineSnapshotMutation = (obj: { __typename: String }): obj is StateMachineSnapshotMutation => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return StateMachineSnapshotMutation_possibleTypes.includes(obj.__typename)
}

const FeatureSearchResult_possibleTypes = ['FeatureSearchResult']
export const isFeatureSearchResult = (obj: { __typename: String }): obj is FeatureSearchResult => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return FeatureSearchResult_possibleTypes.includes(obj.__typename)
}

const StateSnapshot_possibleTypes = ['StateSnapshot']
export const isStateSnapshot = (obj: { __typename: String }): obj is StateSnapshot => {
  if (!obj.__typename) throw new Error('__typename is missing')
  return StateSnapshot_possibleTypes.includes(obj.__typename)
}

export interface QueryPromiseChain {
  model: ((args?: {
    path?: String | null
  }) => ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }) &
    (ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> })
  models: (args: { paths: String[] }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  prototypes: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  search_models: ((args?: {
    query?: String | null
  }) => {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Promise<ModelSearchResult[]>
  }) & { execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Promise<ModelSearchResult[]> }
  ask: ((args?: {
    query?: String | null
  }) => { execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Promise<Explaination[]> }) & {
    execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Promise<Explaination[]>
  }
  explain: ((args?: {
    query?: String | null
  }) => { execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Promise<Explaination[]> }) & {
    execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Promise<Explaination[]>
  }
  extract: (args: {
    text?: String | null
    models: String[]
  }) => { execute: (request: ExtractionRequest, defaultValue?: Extraction[]) => Promise<Extraction[]> }
}

export interface QueryObservableChain {
  model: ((args?: {
    path?: String | null
  }) => ModelObservableChain & {
    execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null>
  }) &
    (ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> })
  models: (args: { paths: String[] }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  prototypes: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  search_models: ((args?: {
    query?: String | null
  }) => {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Observable<ModelSearchResult[]>
  }) & {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Observable<ModelSearchResult[]>
  }
  ask: ((args?: {
    query?: String | null
  }) => { execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Observable<Explaination[]> }) & {
    execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Observable<Explaination[]>
  }
  explain: ((args?: {
    query?: String | null
  }) => { execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Observable<Explaination[]> }) & {
    execute: (request: ExplainationRequest, defaultValue?: Explaination[]) => Observable<Explaination[]>
  }
  extract: (args: {
    text?: String | null
    models: String[]
  }) => { execute: (request: ExtractionRequest, defaultValue?: Extraction[]) => Observable<Extraction[]> }
}

export interface ModelPromiseChain {
  path: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  label: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  description: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  precursor: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  at: ((args?: {
    submodel?: String | null
  }) => ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }) &
    (ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> })
  submodels: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  reference: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  reverse_references: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  prototypes: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  direct_prototypes: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  subclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  direct_subclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  superclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  direct_superclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  instances: ((args?: {
    string_filters?: StringFilter[] | null
    number_filters?: NumberFilter[] | null
    boolean_filters?: BooleanFilter[] | null
    date_filters?: DateFilter[] | null
    reference_filters?: ReferenceFilter[] | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]>
  }
  direct_instances: ((args?: {
    string_filters?: StringFilter[] | null
    number_filters?: NumberFilter[] | null
    boolean_filters?: BooleanFilter[] | null
    date_filters?: DateFilter[] | null
    reference_filters?: ReferenceFilter[] | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]>
  }
  unfilled_slots: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  if_has_class: (args: {
    name: String
  }) => ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  features: ((args?: {
    category?: String | null
  }) => { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Promise<Feature[]> }) & {
    execute: (request: FeatureRequest, defaultValue?: Feature[]) => Promise<Feature[]>
  }
  feature_prototype_targets: ((args?: {
    category?: String | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]>
  }
  feature_targets: ((args?: {
    category?: String | null
    path_root?: String | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]>
  }
  string_value: ((args?: {
    path?: String | null
  }) => { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }) & {
    execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null>
  }
  number_value: ((args?: {
    path?: String | null
  }) => { execute: (request?: boolean | number, defaultValue?: Float | null) => Promise<Float | null> }) & {
    execute: (request?: boolean | number, defaultValue?: Float | null) => Promise<Float | null>
  }
  boolean_value: ((args?: {
    path?: String | null
  }) => { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }) & {
    execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null>
  }
  submodel_templates: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  as: InterfacePromiseChain & {
    execute: (request: InterfaceRequest, defaultValue?: Interface | null) => Promise<Interface | null>
  }
  interfaces: { execute: (request?: boolean | number, defaultValue?: String[]) => Promise<String[]> }
  interface_constraints: { execute: (request?: boolean | number, defaultValue?: String[]) => Promise<String[]> }
  constraints: { execute: (request: ModelRequest, defaultValue?: Model[]) => Promise<Model[]> }
  if_interface: (args: {
    interface: String
  }) => ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  filter_prototypes: { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Promise<Feature[]> }
  feature_prototypes: ((args?: {
    category?: String | null
  }) => { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Promise<Feature[]> }) & {
    execute: (request: FeatureRequest, defaultValue?: Feature[]) => Promise<Feature[]>
  }
  filters: { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Promise<Feature[]> }
  suggest_references: ((args?: {
    query?: String | null
  }) => {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Promise<ModelSearchResult[]>
  }) & { execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Promise<ModelSearchResult[]> }
  state: (args: {
    name: String
  }) => StateMachineSnapshotPromiseChain & {
    execute: (
      request: StateMachineSnapshotRequest,
      defaultValue?: StateMachineSnapshot | null,
    ) => Promise<StateMachineSnapshot | null>
  }
  states: {
    execute: (request: StateMachineSnapshotRequest, defaultValue?: StateMachineSnapshot[]) => Promise<StateMachineSnapshot[]>
  }
  state_machine: (args: {
    name: String
  }) => StateMachinePromiseChain & {
    execute: (request: StateMachineRequest, defaultValue?: StateMachine | null) => Promise<StateMachine | null>
  }
}

export interface ModelObservableChain {
  path: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  label: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  description: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  precursor: ModelObservableChain & {
    execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null>
  }
  at: ((args?: {
    submodel?: String | null
  }) => ModelObservableChain & {
    execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null>
  }) &
    (ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> })
  submodels: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  reference: ModelObservableChain & {
    execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null>
  }
  reverse_references: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  prototypes: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  direct_prototypes: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  subclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  direct_subclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  superclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  direct_superclasses: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  instances: ((args?: {
    string_filters?: StringFilter[] | null
    number_filters?: NumberFilter[] | null
    boolean_filters?: BooleanFilter[] | null
    date_filters?: DateFilter[] | null
    reference_filters?: ReferenceFilter[] | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]>
  }
  direct_instances: ((args?: {
    string_filters?: StringFilter[] | null
    number_filters?: NumberFilter[] | null
    boolean_filters?: BooleanFilter[] | null
    date_filters?: DateFilter[] | null
    reference_filters?: ReferenceFilter[] | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]>
  }
  unfilled_slots: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  if_has_class: (args: {
    name: String
  }) => ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  features: ((args?: {
    category?: String | null
  }) => { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Observable<Feature[]> }) & {
    execute: (request: FeatureRequest, defaultValue?: Feature[]) => Observable<Feature[]>
  }
  feature_prototype_targets: ((args?: {
    category?: String | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]>
  }
  feature_targets: ((args?: {
    category?: String | null
    path_root?: String | null
  }) => { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }) & {
    execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]>
  }
  string_value: ((args?: {
    path?: String | null
  }) => { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }) & {
    execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null>
  }
  number_value: ((args?: {
    path?: String | null
  }) => { execute: (request?: boolean | number, defaultValue?: Float | null) => Observable<Float | null> }) & {
    execute: (request?: boolean | number, defaultValue?: Float | null) => Observable<Float | null>
  }
  boolean_value: ((args?: {
    path?: String | null
  }) => { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }) & {
    execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null>
  }
  submodel_templates: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  as: InterfaceObservableChain & {
    execute: (request: InterfaceRequest, defaultValue?: Interface | null) => Observable<Interface | null>
  }
  interfaces: { execute: (request?: boolean | number, defaultValue?: String[]) => Observable<String[]> }
  interface_constraints: { execute: (request?: boolean | number, defaultValue?: String[]) => Observable<String[]> }
  constraints: { execute: (request: ModelRequest, defaultValue?: Model[]) => Observable<Model[]> }
  if_interface: (args: {
    interface: String
  }) => ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  filter_prototypes: { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Observable<Feature[]> }
  feature_prototypes: ((args?: {
    category?: String | null
  }) => { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Observable<Feature[]> }) & {
    execute: (request: FeatureRequest, defaultValue?: Feature[]) => Observable<Feature[]>
  }
  filters: { execute: (request: FeatureRequest, defaultValue?: Feature[]) => Observable<Feature[]> }
  suggest_references: ((args?: {
    query?: String | null
  }) => {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Observable<ModelSearchResult[]>
  }) & {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Observable<ModelSearchResult[]>
  }
  state: (args: {
    name: String
  }) => StateMachineSnapshotObservableChain & {
    execute: (
      request: StateMachineSnapshotRequest,
      defaultValue?: StateMachineSnapshot | null,
    ) => Observable<StateMachineSnapshot | null>
  }
  states: {
    execute: (
      request: StateMachineSnapshotRequest,
      defaultValue?: StateMachineSnapshot[],
    ) => Observable<StateMachineSnapshot[]>
  }
  state_machine: (args: {
    name: String
  }) => StateMachineObservableChain & {
    execute: (request: StateMachineRequest, defaultValue?: StateMachine | null) => Observable<StateMachine | null>
  }
}

export interface FeaturePromiseChain {
  category: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  abstraction_depth: { execute: (request?: boolean | number, defaultValue?: Int | null) => Promise<Int | null> }
  model: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
}

export interface FeatureObservableChain {
  category: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  abstraction_depth: { execute: (request?: boolean | number, defaultValue?: Int | null) => Observable<Int | null> }
  model: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
}

export interface InterfacePromiseChain {
  ok: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
  Date: DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  Set: SetPromiseChain & { execute: (request: SetRequest, defaultValue?: Set | null) => Promise<Set | null> }
  DataTable: DataTablePromiseChain & {
    execute: (request: DataTableRequest, defaultValue?: DataTable | null) => Promise<DataTable | null>
  }
}

export interface InterfaceObservableChain {
  ok: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
  Date: DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  Set: SetObservableChain & { execute: (request: SetRequest, defaultValue?: Set | null) => Observable<Set | null> }
  DataTable: DataTableObservableChain & {
    execute: (request: DataTableRequest, defaultValue?: DataTable | null) => Observable<DataTable | null>
  }
}

export interface DatePromiseChain {
  ms_timestamp: { execute: (request?: boolean | number, defaultValue?: Float | null) => Promise<Float | null> }
  s_timestamp: { execute: (request?: boolean | number, defaultValue?: Float | null) => Promise<Float | null> }
  get: (args: {
    format: String
  }) => { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
}

export interface DateObservableChain {
  ms_timestamp: { execute: (request?: boolean | number, defaultValue?: Float | null) => Observable<Float | null> }
  s_timestamp: { execute: (request?: boolean | number, defaultValue?: Float | null) => Observable<Float | null> }
  get: (args: {
    format: String
  }) => { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
}

export interface SetPromiseChain {
  size: { execute: (request?: boolean | number, defaultValue?: Int) => Promise<Int> }
  get_n: ((args?: {
    first_n?: Int | null
  }) => { execute: (request: ModelRequest, defaultValue?: (Model | null)[] | null) => Promise<(Model | null)[] | null> }) & {
    execute: (request: ModelRequest, defaultValue?: (Model | null)[] | null) => Promise<(Model | null)[] | null>
  }
}

export interface SetObservableChain {
  size: { execute: (request?: boolean | number, defaultValue?: Int) => Observable<Int> }
  get_n: ((args?: {
    first_n?: Int | null
  }) => {
    execute: (request: ModelRequest, defaultValue?: (Model | null)[] | null) => Observable<(Model | null)[] | null>
  }) & { execute: (request: ModelRequest, defaultValue?: (Model | null)[] | null) => Observable<(Model | null)[] | null> }
}

export interface DataTablePromiseChain {
  _todo: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
}

export interface DataTableObservableChain {
  _todo: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
}

export interface ModelSearchResultPromiseChain {
  model: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  score: { execute: (request?: boolean | number, defaultValue?: Float | null) => Promise<Float | null> }
}

export interface ModelSearchResultObservableChain {
  model: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  score: { execute: (request?: boolean | number, defaultValue?: Float | null) => Observable<Float | null> }
}

export interface StateMachineSnapshotPromiseChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
}

export interface StateMachineSnapshotObservableChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
}

export interface StateMachinePromiseChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
}

export interface StateMachineObservableChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
}

export interface ExplainationPromiseChain {
  kind: { execute: (request?: boolean | number, defaultValue?: FactKind | null) => Promise<FactKind | null> }
  label: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  start: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  end: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  ambiguities: { execute: (request: AmbiguityRequest, defaultValue?: Ambiguity[]) => Promise<Ambiguity[]> }
}

export interface ExplainationObservableChain {
  kind: { execute: (request?: boolean | number, defaultValue?: FactKind | null) => Observable<FactKind | null> }
  label: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  start: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  end: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  ambiguities: { execute: (request: AmbiguityRequest, defaultValue?: Ambiguity[]) => Observable<Ambiguity[]> }
}

export interface AmbiguityPromiseChain {
  path: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  options: {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Promise<ModelSearchResult[]>
  }
}

export interface AmbiguityObservableChain {
  path: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  options: {
    execute: (request: ModelSearchResultRequest, defaultValue?: ModelSearchResult[]) => Observable<ModelSearchResult[]>
  }
}

export interface ExtractionPromiseChain {
  status: {
    execute: (request?: boolean | number, defaultValue?: ExtractionStatus | null) => Promise<ExtractionStatus | null>
  }
  kind: { execute: (request?: boolean | number, defaultValue?: FactKind | null) => Promise<FactKind | null> }
  label: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
  start: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  end: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  ambiguities: { execute: (request: AmbiguityRequest, defaultValue?: Ambiguity[]) => Promise<Ambiguity[]> }
}

export interface ExtractionObservableChain {
  status: {
    execute: (request?: boolean | number, defaultValue?: ExtractionStatus | null) => Observable<ExtractionStatus | null>
  }
  kind: { execute: (request?: boolean | number, defaultValue?: FactKind | null) => Observable<FactKind | null> }
  label: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
  start: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  end: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  ambiguities: { execute: (request: AmbiguityRequest, defaultValue?: Ambiguity[]) => Observable<Ambiguity[]> }
}

export interface MutationPromiseChain {
  create_model: ((args?: {
    path?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  at: ((args?: {
    path?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  _delete_everything: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
}

export interface MutationObservableChain {
  create_model: ((args?: {
    path?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  at: ((args?: {
    path?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  _delete_everything: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
}

export interface ModelMutationPromiseChain {
  model: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }
  done: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
  instantiate: ((args?: {
    path?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  extend: ((args?: {
    path?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  set_label: ((args?: {
    label?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  set_description: ((args?: {
    description?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  create_submodel: ((args?: {
    subpath?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  at: ((args?: {
    submodel?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  set_induction_threshold: ((args?: {
    minimal_support?: Float | null
    absolute_support?: Int | null
  }) => ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }) &
    (ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> })
  suggest_induction: ((args?: {
    minimal_support?: Float | null
    absolute_support?: Int | null
  }) => ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> }) &
    (ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Promise<Model | null> })
  use_filter: (args: {
    feature: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  remove_model: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
  add_prototype: (args: {
    prototype: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  add_superclass: (args: {
    superclass: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  create_submodel_from_prototype: (args: {
    prototype: String
    subpath?: String | null
    label?: String | null
    as_reference?: Boolean | null
    instantiate?: Boolean | null
    array?: Boolean | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  set_reference: ((args?: {
    reference?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  remove_reference: ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  set_string_value: ((args?: {
    value?: String | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  set_number_value: ((args?: {
    value?: Float | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  set_boolean_value: ((args?: {
    value?: Boolean | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }) &
    (ModelMutationPromiseChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
    })
  remove_value: ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  use_feature: (args: {
    feature: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  use_existing_feature: (args: {
    feature: String
    kind: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  add_interface_constraint: (args: {
    interface: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  remove_interface_constraint: (args: {
    interface: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  add_prototype_constraint: (args: {
    prototype: String
    is_array?: Boolean | null
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  remove_prototype_constraint: (args: {
    prototype: String
  }) => ModelMutationPromiseChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Promise<ModelMutation | null>
  }
  as: MutationInterfacePromiseChain & {
    execute: (
      request: MutationInterfaceRequest,
      defaultValue?: MutationInterface | null,
    ) => Promise<MutationInterface | null>
  }
  create_state_machine: (args: {
    name: String
    entry_state: String
  }) => StateMachineMutationPromiseChain & {
    execute: (
      request: StateMachineMutationRequest,
      defaultValue?: StateMachineMutation | null,
    ) => Promise<StateMachineMutation | null>
  }
  state: (args: {
    name: String
  }) => StateMachineSnapshotMutationPromiseChain & {
    execute: (
      request: StateMachineSnapshotMutationRequest,
      defaultValue?: StateMachineSnapshotMutation | null,
    ) => Promise<StateMachineSnapshotMutation | null>
  }
  state_machine: (args: {
    name: String
  }) => StateMachineMutationPromiseChain & {
    execute: (
      request: StateMachineMutationRequest,
      defaultValue?: StateMachineMutation | null,
    ) => Promise<StateMachineMutation | null>
  }
}

export interface ModelMutationObservableChain {
  model: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> }
  done: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
  instantiate: ((args?: {
    path?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  extend: ((args?: {
    path?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  set_label: ((args?: {
    label?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  set_description: ((args?: {
    description?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  create_submodel: ((args?: {
    subpath?: String | null
    label?: String | null
    prototype?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  at: ((args?: {
    submodel?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  set_induction_threshold: ((args?: {
    minimal_support?: Float | null
    absolute_support?: Int | null
  }) => ModelObservableChain & {
    execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null>
  }) &
    (ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> })
  suggest_induction: ((args?: {
    minimal_support?: Float | null
    absolute_support?: Int | null
  }) => ModelObservableChain & {
    execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null>
  }) &
    (ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model | null) => Observable<Model | null> })
  use_filter: (args: {
    feature: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  remove_model: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
  add_prototype: (args: {
    prototype: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  add_superclass: (args: {
    superclass: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  create_submodel_from_prototype: (args: {
    prototype: String
    subpath?: String | null
    label?: String | null
    as_reference?: Boolean | null
    instantiate?: Boolean | null
    array?: Boolean | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  set_reference: ((args?: {
    reference?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  remove_reference: ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  set_string_value: ((args?: {
    value?: String | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  set_number_value: ((args?: {
    value?: Float | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  set_boolean_value: ((args?: {
    value?: Boolean | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }) &
    (ModelMutationObservableChain & {
      execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
    })
  remove_value: ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  use_feature: (args: {
    feature: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  use_existing_feature: (args: {
    feature: String
    kind: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  add_interface_constraint: (args: {
    interface: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  remove_interface_constraint: (args: {
    interface: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  add_prototype_constraint: (args: {
    prototype: String
    is_array?: Boolean | null
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  remove_prototype_constraint: (args: {
    prototype: String
  }) => ModelMutationObservableChain & {
    execute: (request: ModelMutationRequest, defaultValue?: ModelMutation | null) => Observable<ModelMutation | null>
  }
  as: MutationInterfaceObservableChain & {
    execute: (
      request: MutationInterfaceRequest,
      defaultValue?: MutationInterface | null,
    ) => Observable<MutationInterface | null>
  }
  create_state_machine: (args: {
    name: String
    entry_state: String
  }) => StateMachineMutationObservableChain & {
    execute: (
      request: StateMachineMutationRequest,
      defaultValue?: StateMachineMutation | null,
    ) => Observable<StateMachineMutation | null>
  }
  state: (args: {
    name: String
  }) => StateMachineSnapshotMutationObservableChain & {
    execute: (
      request: StateMachineSnapshotMutationRequest,
      defaultValue?: StateMachineSnapshotMutation | null,
    ) => Observable<StateMachineSnapshotMutation | null>
  }
  state_machine: (args: {
    name: String
  }) => StateMachineMutationObservableChain & {
    execute: (
      request: StateMachineMutationRequest,
      defaultValue?: StateMachineMutation | null,
    ) => Observable<StateMachineMutation | null>
  }
}

export interface MutationInterfacePromiseChain {
  ok: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
  DateMutation: DateMutationPromiseChain & {
    execute: (request: DateMutationRequest, defaultValue?: DateMutation | null) => Promise<DateMutation | null>
  }
  SetMutation: SetMutationPromiseChain & {
    execute: (request: SetMutationRequest, defaultValue?: SetMutation | null) => Promise<SetMutation | null>
  }
  DataTableMutation: DataTableMutationPromiseChain & {
    execute: (
      request: DataTableMutationRequest,
      defaultValue?: DataTableMutation | null,
    ) => Promise<DataTableMutation | null>
  }
}

export interface MutationInterfaceObservableChain {
  ok: { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
  DateMutation: DateMutationObservableChain & {
    execute: (request: DateMutationRequest, defaultValue?: DateMutation | null) => Observable<DateMutation | null>
  }
  SetMutation: SetMutationObservableChain & {
    execute: (request: SetMutationRequest, defaultValue?: SetMutation | null) => Observable<SetMutation | null>
  }
  DataTableMutation: DataTableMutationObservableChain & {
    execute: (
      request: DataTableMutationRequest,
      defaultValue?: DataTableMutation | null,
    ) => Observable<DataTableMutation | null>
  }
}

export interface DateMutationPromiseChain {
  set_now: DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  set_timestamp: (args: {
    timestamp: Float
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  set: (args: {
    format: String
    date: String
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  add_seconds: (args: {
    seconds: Int
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  add_minutes: (args: {
    minutes: Int
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  add_hours: (args: {
    hours: Int
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  add_days: (args: {
    days: Int
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  add_months: (args: {
    months: Int
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
  add_years: (args: {
    years: Int
  }) => DatePromiseChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Promise<Date | null> }
}

export interface DateMutationObservableChain {
  set_now: DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  set_timestamp: (args: {
    timestamp: Float
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  set: (args: {
    format: String
    date: String
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  add_seconds: (args: {
    seconds: Int
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  add_minutes: (args: {
    minutes: Int
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  add_hours: (args: {
    hours: Int
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  add_days: (args: {
    days: Int
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  add_months: (args: {
    months: Int
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
  add_years: (args: {
    years: Int
  }) => DateObservableChain & { execute: (request: DateRequest, defaultValue?: Date | null) => Observable<Date | null> }
}

export interface SetMutationPromiseChain {
  create_element: ModelPromiseChain & { execute: (request: ModelRequest, defaultValue?: Model) => Promise<Model> }
}

export interface SetMutationObservableChain {
  create_element: ModelObservableChain & { execute: (request: ModelRequest, defaultValue?: Model) => Observable<Model> }
}

export interface DataTableMutationPromiseChain {
  _todo_mutation: (args: {
    value: Boolean
  }) => { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Promise<Boolean | null> }
}

export interface DataTableMutationObservableChain {
  _todo_mutation: (args: {
    value: Boolean
  }) => { execute: (request?: boolean | number, defaultValue?: Boolean | null) => Observable<Boolean | null> }
}

export interface StateMachineMutationPromiseChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
}

export interface StateMachineMutationObservableChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
}

export interface StateMachineSnapshotMutationPromiseChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
}

export interface StateMachineSnapshotMutationObservableChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
}

export interface FeatureSearchResultPromiseChain {
  feature: FeaturePromiseChain & {
    execute: (request: FeatureRequest, defaultValue?: Feature | null) => Promise<Feature | null>
  }
  score: { execute: (request?: boolean | number, defaultValue?: Float | null) => Promise<Float | null> }
}

export interface FeatureSearchResultObservableChain {
  feature: FeatureObservableChain & {
    execute: (request: FeatureRequest, defaultValue?: Feature | null) => Observable<Feature | null>
  }
  score: { execute: (request?: boolean | number, defaultValue?: Float | null) => Observable<Float | null> }
}

export interface StateSnapshotPromiseChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Promise<String | null> }
}

export interface StateSnapshotObservableChain {
  foo: { execute: (request?: boolean | number, defaultValue?: String | null) => Observable<String | null> }
}
