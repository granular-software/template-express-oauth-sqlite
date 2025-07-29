
export type InstanceWhereInput = {
	at?: string;
	is?: ValueInput;
	is_not?: ValueInput;
	contains_substring?: string
};
export type InstanceSortInput = {
	by?: string;
	direction?: string;
};
export type ValueInput = {
	number?: number;
    string?: string;
    boolean?: boolean;
	null?: boolean;
};
export type Aggregate = {
	count: number;
};
