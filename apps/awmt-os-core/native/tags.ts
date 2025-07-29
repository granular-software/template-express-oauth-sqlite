import { Context } from "effect";

import { Ant as AntClass } from "../api/Ant";

export type Ant = AntClass;
export type TargetAnt = AntClass;

export const Ant = Context.Tag<AntClass>("Ant");
export const TargetAnt = Context.Tag<AntClass>("TargetAnt");
